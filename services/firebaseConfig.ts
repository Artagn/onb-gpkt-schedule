import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyD7ozjrQIXUtMSzYI-iHbTTIvqK0nrwE-I",
  authDomain: "onb-gpkt-schedule.firebaseapp.com",
  projectId: "onb-gpkt-schedule",
  storageBucket: "onb-gpkt-schedule.firebasestorage.app",
  messagingSenderId: "465783030889",
  appId: "1:465783030889:web:3852a41f51e77579374ef8",
  measurementId: "G-Q6XKEXEBZH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with persistent local cache (multi-tab support)
// Replaces deprecated enableMultiTabIndexedDbPersistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const functions = getFunctions(app, 'asia-southeast1');

