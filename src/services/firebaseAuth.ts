import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import type { LearnerProfile } from '../types';
import { saveLearnerProfile } from './learnerProfile';

function requireAuth() {
  if (!firebaseAuth) {
    throw new Error(
      'Firebase Authentication is not configured. Add the VITE_FIREBASE_* values from your Firebase web app settings to .env.local, then restart Berry.'
    );
  }
  return firebaseAuth;
}

export async function signInBerryUser(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
  return credential.user;
}

export async function registerBerryUser(
  email: string,
  password: string,
  profile: Partial<LearnerProfile>
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  if (profile.name?.trim()) {
    await updateProfile(credential.user, { displayName: profile.name.trim() });
  }
  await saveLearnerProfile(credential.user.uid, profile, credential.user.displayName);
  return credential.user;
}

export async function requestBerryPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(requireAuth(), email.trim());
  } catch (error) {
    // Do not reveal whether an email address has a Berry account.
    if ((error as { code?: string })?.code === 'auth/user-not-found') return;
    throw error;
  }
}

export async function signOutBerryUser(): Promise<void> {
  await signOut(requireAuth());
}

export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account already exists for this email. Try signing in instead.';
    case 'auth/weak-password':
      return 'Choose a stronger password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a little and try again.';
    case 'auth/network-request-failed':
      return 'Could not connect. Check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is not enabled for this Firebase project yet.';
    case 'permission-denied':
      return 'Your account was created, but Berry could not save its learner profile. Publish firestore.rules in Firebase Console, then sign in again.';
    case 'failed-precondition':
      return 'Cloud Firestore is not ready yet. Create a Firestore database in Firebase Console, then try again.';
    case 'unavailable':
      return 'Berry could not reach Cloud Firestore. Check your connection and try again.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}
