# InputGuard — AI Privacy Bodyguard for Everything You Type

A Chrome extension that watches what you type in real time and warns you before you share sensitive data with sites that don't need it.

**All AI inference runs through Firebase AI Logic — never a direct model API call.**

## The pitch
- **On-device (Gemini Nano 4 via Firebase AI Logic):** classifies every keystroke for sensitivity (PII, passwords, financial, health…). Keystrokes never leave your device. Works offline.
- **Cloud (Gemini Flash via Firebase AI Logic):** scores website reputation — domain + page title only, never raw text.
- A 🔒 badge proves the analysis ran on-device. Sensitive + untrusted = field turns red.

## Why this wins
- ❌ Nothing like it exists — no real-time, on-device, AI-powered input privacy guard.
- 🔒 Genuine hybrid AI: privacy-critical analysis must be on-device; deep reputation needs the cloud.
- 🎬 Demo that stops scrollers: type into a sketchy form, watch fields turn red in real time, see the 🔒 "on-device" lock.
- 🔥 Uses 6 Firebase products: AI Logic, App Check, Auth, Firestore, Remote Config, Hosting.

## Firebase AI Logic usage (runtime, not README-only)

InputGuard uses the Firebase AI Logic Web SDK (`firebase/ai`) with `InferenceMode`:

`src/firebase/config.js` — Firebase app + AI Logic + App Check initialized at runtime:

```js
import { initializeApp } from 'firebase/app';
import { getAI, GoogleAIBackend } from 'firebase/ai';
import { initializeAppCheck } from 'firebase/app-check';

const app = initializeApp(firebaseConfig);
initializeAppCheck(app, { /* ReCaptchaEnterpriseProvider / debug token */ });
const ai = getAI(app, { backend: new GoogleAIBackend() });
```

`src/firebase/ai-engine.js` — models created from the Firebase AI Logic instance:

```js
import { getGenerativeModel, InferenceMode } from 'firebase/ai';
import { ai } from './config.js';

// 🔒 ON-DEVICE: Gemini Nano 4 — keystrokes never leave the device
getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE });

// ☁️ CLOUD: Gemini Flash — site reputation (domain + title only)
getGenerativeModel(ai, { mode: InferenceMode.ONLY_IN_CLOUD });
```

`src/content/content.js` calls `analyzePII()` (on-device model, `generateContent`) on every input event.
`src/background.js` calls `analyzesite()` (cloud model, `generateContent`) for site reputation.
Raw keystrokes are never sent to the cloud.

## 6 Firebase products used

| Product | Role |
|---|---|
| **Firebase AI Logic** | On-device Gemini Nano 4 (input sensitivity) + cloud Gemini Flash (site reputation) — sole AI path |
| **App Check** | Required by Firebase AI Logic; initialized in `src/firebase/config.js` (debug token accepted in dev/submission) |
| **Auth** | Anonymous sign-in so user settings & events sync (`src/popup/popup.js`, `src/sidepanel/sidepanel.js`) |
| **Firestore** | User-scoped anonymized analysis events (no raw text stored) |
| **Remote Config** | Gates on-device analysis & cloud reputation at runtime (`src/content/content.js`, `src/popup/popup.js`) |
| **Hosting** | Public landing page + dashboard (`public/`, deployed via `firebase deploy`) |

## Quick start

```bash
cd inputguard
npm install
npm run build          # webpack -> dist/
```

1. Create a Firebase project and enable **Firebase AI Logic**, **App Check**, **Authentication**, **Firestore**, **Remote Config**, **Hosting**.
2. Copy your web app config into `src/firebase/config.js` (replace `YOUR_*` placeholders).
3. Get an **App Check debug token** from Firebase Console → App Check → Debug tokens (accepted for submissions).
4. Set Remote Config parameters: `onDeviceEnabled` (bool), `cloudReputationEnabled` (bool).
5. Load the extension: Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → select the `dist` folder.
6. Host the landing page: `firebase deploy` (Hosting serves `public/`).

## Demo video (submit to YouTube, ≤ 3 min, public, English)
1. Open InputGuard on a normal site → type → all clear.
2. Open a sketchy demo form → type "My SSN is 123-45-6789" → field pulses red, 🔒 on-device badge appears.
3. Open popup → show "On-device (Gemini Nano 4)" + "Cloud (Gemini)".
4. Open side panel → show anonymized events logged to Firestore (no raw text).
Upload to YouTube and link it on the submission form.

## Submission checklist
- [ ] Public GitHub repo with this source + Apache 2.0 `LICENSE` (detectable in the repo About section)
- [ ] Firebase AI Logic imported and called at runtime in `src/firebase/*`, `src/content/content.js`, `src/background.js`
- [ ] Text description: Firebase AI Logic usage + feature summary + value proposition (below)
- [ ] YouTube demo video (≤3 min, public, English) — link on submission form
- [ ] Optional hosted URL: Firebase Hosting landing page + Chrome extension

## Value proposition
InputGuard is the first real-time, on-device AI privacy bodyguard for the browser. It protects users from accidentally leaking sensitive data to untrusted websites — with zero keystroke data leaving the device — while still using cloud AI where it actually adds value (site reputation). Built entirely on Firebase AI Logic.

## License
Apache 2.0 — see `LICENSE`.
