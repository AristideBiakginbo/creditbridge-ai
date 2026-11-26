import { getApps, initializeApp } from 'firebase/app'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value?.trim())
  .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`)

export const firebaseConfigValidation = {
  isValid: missingConfig.length === 0,
  error:
    missingConfig.length > 0
      ? `Missing required Firebase environment variables: ${missingConfig.join(', ')}. Add them to .env.local.`
      : null,
}

export const firebaseApp = firebaseConfigValidation.isValid
  ? (getApps().find((existingApp) => existingApp.name === '[DEFAULT]') ??
    initializeApp(firebaseConfig))
  : null
