/**
 * InputGuard side panel — recent anonymized analysis events from Firestore & local storage.
 *
 * Demonstrates Firebase Authentication + Firestore at runtime. Only
 * metadata (domain, category, confidence, timestamp) is stored — never raw text.
 */
import { app } from '../firebase/config.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';

const auth = getAuth(app);
let db = null;
try {
  db = getFirestore(app);
} catch (e) {
  console.warn('[InputGuard] Firestore initialization deferred:', e.message);
}

const eventsList = document.getElementById('events');
const userInfo = document.getElementById('userInfo');

function renderEvents(items) {
  if (!eventsList) return;
  eventsList.innerHTML = '';

  if (!items || items.length === 0) {
    const empty = document.createElement('li');
    empty.style.cssText = 'color:#6b7280;padding:16px 12px;background:#fff;border-radius:8px;border:1px dashed #d1d5db;text-align:center;font-size:12px;';
    empty.innerHTML = '🛡️ <strong>Ready &amp; watching.</strong><br>No sensitive input events detected yet. Type into any web form to watch on-device AI classify inputs in real time!';
    eventsList.appendChild(empty);
    return;
  }

  items.forEach((d) => {
    const ts = d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp || Date.now());
    const li = document.createElement('li');
    li.className = 'event';
    li.innerHTML = `
      <span class="time">${ts.toLocaleTimeString()}</span>
      <span class="domain">${d.domain || '—'}</span>
      <span class="cat">${d.category || 'PII'}</span>
      <span class="conf">conf ${Math.round((d.confidence || 0.95) * 100)}%</span>
      <span class="sev ${d.severe ? 'severe' : 'notice'}">
        ${d.severe ? 'SEVERE' : 'notice'}
      </span>
      <span class="device">🔒 on-device</span>
    `;
    eventsList.appendChild(li);
  });
}

// 1. Immediate local cache load for instant responsiveness
if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  chrome.storage.local.get(['cached_events'], (res) => {
    if (res.cached_events && res.cached_events.length > 0) {
      renderEvents(res.cached_events);
    } else {
      renderEvents([]);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.cached_events) {
      renderEvents(changes.cached_events.newValue || []);
    }
  });
}

// 2. Real-time Firebase Authentication + Firestore listener
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    try {
      const cred = await signInAnonymously(auth);
      user = cred.user;
    } catch (err) {
      if (userInfo) userInfo.textContent = 'Storage: Local offline mode (Firebase auth pending)';
      return;
    }
  }

  if (userInfo && user) {
    userInfo.textContent = `Signed in anonymously: ${user.uid.substring(0, 10)}... (Syncing to Firestore)`;
  }

  if (db && user) {
    try {
      const q = query(
        collection(db, 'users', user.uid, 'events'),
        orderBy('timestamp', 'desc'),
        limit(30)
      );

      onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const list = [];
          snap.forEach((doc) => list.push(doc.data()));
          renderEvents(list);
        }
      }, (err) => {
        console.warn('[InputGuard] Firestore snapshot listener notice:', err.message);
      });
    } catch (e) {
      console.warn('[InputGuard] Firestore query setup notice:', e.message);
    }
  }
});
