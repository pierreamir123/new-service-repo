// Firebase web config is public by design; access is enforced by firestore.rules, not by hiding these values.
// Project: malaknewservice (created 2026-10-28). To re-fetch: npx firebase-tools apps:sdkconfig WEB <appId> --project malaknewservice
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyDt8Q42D_94SEzohY3hSz5HbUFrUpWA4DY',
  authDomain: 'malaknewservice.firebaseapp.com',
  projectId: 'malaknewservice',
  storageBucket: 'malaknewservice.firebasestorage.app',
  messagingSenderId: '762698641615',
  appId: '1:762698641615:web:8ebb0b42df282bdeac07ba',
};

const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
// Local development talks to the Firebase emulators with a demo project, so nothing touches production data.
const config = isLocal ? { apiKey: 'demo', authDomain: 'localhost', projectId: 'demo-church-volunteers', appId: 'demo' } : firebaseConfig;

export const configured = isLocal || !JSON.stringify(firebaseConfig).includes('REPLACE');
export const app = initializeApp(config);
export const db = getFirestore(app);
export const auth = getAuth(app);

if (isLocal) {
  connectFirestoreEmulator(db, '127.0.0.1', 8085);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}
