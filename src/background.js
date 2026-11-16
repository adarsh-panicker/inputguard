/**
 * InputGuard background service worker (Manifest V3).
 *
 * Firebase AI Logic is initialized here (via firebase/config.js) so every
 * cloud inference is gated behind App Check, as Firebase AI Logic requires.
 *
 * The content script never sends raw keystrokes here — only the page domain
 * + title — and asks for a site-trust judgment from the cloud model.
 */
import { app } from './firebase/config.js';
import { analyzesite } from './firebase/ai-engine.js';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const auth = getAuth(app);
let db = null;
try {
  db = getFirestore(app);
} catch (e) {
  console.warn('[InputGuard] Firestore initialization deferred:', e.message);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_SITE') {
    (async () => {
      try {
        const result = await analyzesite(message.url, message.pageTitle || '');
        sendResponse({ ok: true, result });
      } catch (e) {
        console.error('[InputGuard] site analysis failed:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true; // keep the message channel open for the async response
  }

  if (message.type === 'LOG_EVENT') {
    (async () => {
      const eventData = {
        domain: message.event.domain || 'unknown',
        category: message.event.category || 'PII',
        confidence: message.event.confidence || 0.95,
        severe: !!message.event.severe,
        onDevice: message.event.onDevice !== false,
        timestamp: message.event.timestamp || Date.now()
      };

      // 1. Update local cache for immediate UI feedback
      chrome.storage.local.get(['cached_events'], (res) => {
        const list = res.cached_events || [];
        list.unshift(eventData);
        chrome.storage.local.set({ cached_events: list.slice(0, 50) });
      });

      // 2. Persist to Cloud Firestore under authenticated user's audit log
      try {
        let user = auth.currentUser;
        if (!user) {
          const cred = await signInAnonymously(auth);
          user = cred.user;
        }
        if (db && user) {
          await addDoc(collection(db, 'users', user.uid, 'events'), {
            ...eventData,
            timestamp: serverTimestamp()
          });
        }
        sendResponse({ ok: true });
      } catch (err) {
        console.warn('[InputGuard] Firestore event write skipped (using local storage):', err.message);
        sendResponse({ ok: true, fallback: true });
      }
    })();
    return true;
  }

  if (message.type === 'OPEN_SIDEPANEL') {
    if (chrome.sidePanel && sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

console.log('[InputGuard] background service worker ready');
