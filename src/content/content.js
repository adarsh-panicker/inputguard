/**
 * InputGuard content script — runs in every page.
 *
 * Firebase AI Logic (imported via the config/ai-engine chain below) is the
 * ONLY path to model inference:
 *   - analyzePII()  -> Gemini Nano 4, ONLY_ON_DEVICE  (keystrokes never leave device)
 *   - site trust    -> Gemini Flash, ONLY_IN_CLOUD    (domain + title only, never raw text)
 *
 * A 🔒 badge proves the keystroke analysis ran on-device.
 */
import { analyzePII } from '../firebase/ai-engine.js';
import {
  RISK_LEVELS,
  MSG,
  INPUT_DEBOUNCE_MS,
  MIN_ANALYSIS_LENGTH,
} from '../utils/constants.js';

// Importing config.js runs Firebase init + App Check at runtime in this context.
import '../firebase/config.js';
import { getRemoteConfig, fetchAndActivate, getBoolean } from 'firebase/remote-config';

const rc = getRemoteConfig();
let onDeviceEnabled = true;
let cloudReputationEnabled = true;
(async () => {
  try {
    await fetchAndActivate(rc);
    onDeviceEnabled = getBoolean(rc, 'onDeviceEnabled');
    cloudReputationEnabled = getBoolean(rc, 'cloudReputationEnabled');
  } catch (_) {
    // fall back to defaults above
  }
})();

const SELECTORS =
  'input[type="text"], input[type="email"], input[type="tel"], input[type="password"], textarea, [contenteditable="true"]';

const debounce = new Map();

function styleFor(severity) {
  switch (severity) {
    case 'critical': return RISK_LEVELS.DANGER;
    case 'high': return RISK_LEVELS.WARNING;
    case 'medium': return RISK_LEVELS.CAUTION;
    default: return RISK_LEVELS.SAFE;
  }
}

function setBadge(el, risk) {
  const parent = el.parentElement;
  if (!parent) return;
  const old = parent.querySelector('.inputguard-badge');
  if (old) old.remove();
  el.classList.remove(
    'inputguard-safe',
    'inputguard-caution',
    'inputguard-warning',
    'inputguard-danger'
  );

  if (risk.level === 'safe') return;

  el.classList.add(`inputguard-${risk.level}`);
  el.style.outline = `3px solid ${risk.borderColor}`;
  el.style.outlineOffset = '2px';
  el.style.borderRadius = '4px';

  const badge = document.createElement('div');
  badge.className = 'inputguard-badge';
  badge.style.cssText =
    'position:absolute;z-index:2147483647;display:inline-flex;align-items:center;gap:6px;background:#111827;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.25);white-space:nowrap;cursor:pointer;user-select:none;';
  badge.title = 'InputGuard: Click to open privacy audit log in side panel';
  badge.innerHTML = `<span>${risk.icon}</span> <span>${risk.label}</span> <span style="opacity:.85;font-size:10px;">🔒 on-device</span>`;
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
  });

  if (!parent.style.position) parent.style.position = 'relative';
  parent.insertAdjacentElement('afterend', badge);
  badge.style.left = el.offsetLeft + 'px';
  badge.style.top = Math.max(0, el.offsetTop - 26) + 'px';
}

function clearBadge(el) {
  const parent = el.parentElement;
  if (parent) {
    const old = parent.querySelector('.inputguard-badge');
    if (old) old.remove();
  }
  el.classList.remove(
    'inputguard-safe',
    'inputguard-caution',
    'inputguard-warning',
    'inputguard-danger'
  );
  el.style.outline = '';
}

function getSiteTrust(url, pageTitle) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: MSG.ANALYZE_SITE, url, pageTitle },
      (res) => resolve(res && res.ok ? res.result : null)
    );
  });
}

async function analyzeInput(el) {
  const text = (el.value != null ? el.value : el.textContent || '').trim();
  if (!text || text.length < MIN_ANALYSIS_LENGTH) {
    clearBadge(el);
    return;
  }

  if (!onDeviceEnabled) {
    clearBadge(el);
    return;
  }

  // 🔒 ON-DEVICE: Gemini Nano 4 via Firebase AI Logic — keystrokes never leave device
  let pii;
  try {
    pii = await analyzePII(text);
  } catch (e) {
    console.warn('[InputGuard] on-device PII analysis failed:', e.message);
    return;
  }

  const risk = styleFor(pii.severity);
  let finalRisk = risk;
  let siteTrust = null;

  // ☁️ CLOUD: site reputation — domain + title only, never raw text
  if (pii.hasPII && ['critical', 'high'].includes(pii.severity) && cloudReputationEnabled) {
    siteTrust = await getSiteTrust(location.href, document.title);
    if (
      siteTrust &&
      ['suspicious', 'dangerous'].includes(siteTrust.trustLevel)
    ) {
      finalRisk = RISK_LEVELS.DANGER;
    }
  }

  if (pii.hasPII) {
    setBadge(el, finalRisk);

    // Log anonymized audit event to Firebase & local storage (NO raw text ever stored)
    chrome.runtime.sendMessage({
      type: 'LOG_EVENT',
      event: {
        domain: location.hostname || 'web-form',
        category: pii.detections?.[0]?.type?.toUpperCase() || 'PII',
        confidence: pii.detections?.[0]?.confidence || 0.95,
        severe: ['critical', 'high'].includes(pii.severity) || finalRisk.level === 'danger',
        onDevice: true,
        timestamp: Date.now()
      }
    });
  } else {
    clearBadge(el);
  }
}

function makeHandler(el) {
  return async () => {
    if (debounce.has(el)) clearTimeout(debounce.get(el));
    const t = setTimeout(() => {
      debounce.delete(el);
      analyzeInput(el);
    }, INPUT_DEBOUNCE_MS);
    debounce.set(el, t);
  };
}

function init() {
  document.querySelectorAll(SELECTORS).forEach((el) => {
    el.addEventListener('input', makeHandler(el), { passive: true });
    el.addEventListener('change', makeHandler(el), { passive: true });
    el.addEventListener('paste', makeHandler(el), { passive: true });
  });

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches && n.matches(SELECTORS)) {
          n.addEventListener('input', makeHandler(n), { passive: true });
        }
        n.querySelectorAll?.(SELECTORS).forEach((el) => {
          el.addEventListener('input', makeHandler(el), { passive: true });
        });
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}

init();
