import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBumrWUX5szUBKBK8DPZh-7EMADkew4o0A",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ai-powered-support-desk.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ai-powered-support-desk",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ai-powered-support-desk.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "168161744633",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:168161744633:web:d03f6be342ec7a1793b428",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-4CET6BHLPB",
};

// Initialize Firebase safely for SSR/Client
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Register with Email and Password in Firebase
 */
export async function registerWithEmailFirebase(email: string, pass: string, name: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  if (name) {
    await updateProfile(userCredential.user, { displayName: name });
  }
  return userCredential.user;
}

/**
 * Login with Email and Password in Firebase
 */
export async function loginWithEmailFirebase(email: string, pass: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
}

/**
 * Firebase Sign Out
 */
export async function logoutFromFirebase() {
  await signOut(auth);
}
