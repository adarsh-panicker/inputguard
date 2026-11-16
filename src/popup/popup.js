/**
 * InputGuard popup — sign-in (Auth), Remote Config status, privacy indicator.
 *
 * Demonstrates Firebase Auth and Firebase Remote Config at runtime.
 */
import { app } from '../firebase/config.js';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getRemoteConfig,
  fetchAndActivate,
  getBoolean,
} from 'firebase/remote-config';

const locLabel = document.getElementById('locLabel');
const cloudLabel = document.getElementById('cloudLabel');
const btnSignIn = document.getElementById('btnSignIn');
const btnDashboard = document.getElementById('btnDashboard');
const userInfo = document.getElementById('userInfo');

const auth = getAuth(app);
const rc = getRemoteConfig(app);

(async () => {
  try {
    await fetchAndActivate(rc);
    locLabel.textContent = getBoolean(rc, 'onDeviceEnabled')
      ? 'On-device (Gemini Nano 4)'
      : 'Disabled';
    cloudLabel.textContent = getBoolean(rc, 'cloudReputationEnabled')
      ? 'Cloud (Gemini)'
      : 'Disabled';
  } catch (_) {
    locLabel.textContent = 'On-device (defaults)';
    cloudLabel.textContent = 'Cloud (defaults)';
  }

  btnSignIn.addEventListener('click', async () => {
    try {
      await signInAnonymously(auth);
      btnSignIn.textContent = 'Signed in';
      btnSignIn.disabled = true;
      userInfo.classList.remove('hidden');
      userInfo.innerHTML = `<p>UID: ${auth.currentUser.uid}</p>
        <p class="tiny">Settings &amp; events sync to Firestore.</p>`;
    } catch (e) {
      userInfo.innerHTML = `<p class="error">Sign-in failed: ${e.message}</p>`;
      userInfo.classList.remove('hidden');
    }
  });

  btnDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'sidepanel.html' });
  });

  if (auth.currentUser) {
    btnSignIn.textContent = 'Signed in';
    btnSignIn.disabled = true;
    userInfo.classList.remove('hidden');
    userInfo.innerHTML = `<p>UID: ${auth.currentUser.uid}</p>`;
  }
})();
