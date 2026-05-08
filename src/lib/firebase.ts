import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  type Auth,
} from 'firebase/auth'
import {
  initializeFirestore,
  memoryLocalCache,
  type Firestore,
} from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId)

let app: FirebaseApp | null = null
let _auth: Auth | null = null
let _firestore: Firestore | null = null
let _googleProvider: GoogleAuthProvider | null = null

if (firebaseEnabled) {
  app = initializeApp(config)
  _auth = getAuth(app)
  // Cloud-only signed-in mode: do not persist Firestore data in IndexedDB.
  _firestore = initializeFirestore(app, { localCache: memoryLocalCache() })
  _googleProvider = new GoogleAuthProvider()
  _googleProvider.setCustomParameters({ prompt: 'select_account' })
}

export const firebaseApp = app
export const auth = _auth
export const firestore = _firestore
export const googleProvider = _googleProvider
