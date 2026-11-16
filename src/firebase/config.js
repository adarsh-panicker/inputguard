/**
 * Firebase Configuration for InputGuard
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or use existing)
 * 3. Enable the Gemini Developer API in your Firebase project
 * 4. Add a Web app to your project
 * 5. Copy the firebaseConfig values below
 * 6. Enable App Check with debug token for development
 */

import { initializeApp } from 'firebase/app';
import { getAI, GoogleAIBackend } from 'firebase/ai';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Enable App Check debug mode for development
// In production, use ReCaptchaEnterpriseProvider
if (typeof self !== 'undefined') {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// Initialize App Check (required for Firebase AI Logic)
let appCheck;
try {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('YOUR_RECAPTCHA_SITE_KEY'),
    isTokenAutoRefreshEnabled: true
  });
} catch (e) {
  console.warn('[InputGuard] App Check initialization deferred:', e.message);
}

// Initialize Firebase AI Logic with Gemini Developer API backend
const ai = getAI(app, { backend: new GoogleAIBackend() });

export { app, ai, appCheck };
