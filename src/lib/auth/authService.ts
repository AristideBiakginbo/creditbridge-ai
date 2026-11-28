import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  type Auth,
  type User,
} from 'firebase/auth'
import { getAuth } from 'firebase/auth'
import { firebaseApp } from '../firebase'

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null

export async function configureAuthPersistence(remember: boolean): Promise<void> {
  if (!auth) throw new Error('Firebase Authentication is unavailable.')
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence)
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
  remember = true,
): Promise<User> {
  if (!auth) throw new Error('Firebase Authentication is unavailable.')
  await configureAuthPersistence(remember)
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
  await updateProfile(credential.user, { displayName: displayName.trim() })
  await sendEmailVerification(credential.user)
  return credential.user
}

export async function signInWithEmail(email: string, password: string, remember = true): Promise<User> {
  if (!auth) throw new Error('Firebase Authentication is unavailable.')
  await configureAuthPersistence(remember)
  return (await signInWithEmailAndPassword(auth, email.trim(), password)).user
}

export async function signInWithGoogle(remember = true): Promise<User> {
  if (!auth) throw new Error('Firebase Authentication is unavailable.')
  await configureAuthPersistence(remember)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return (await signInWithPopup(auth, provider)).user
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!auth) throw new Error('Firebase Authentication is unavailable.')
  await sendPasswordResetEmail(auth, email.trim())
}

export async function resendEmailVerification(user: User): Promise<void> {
  await sendEmailVerification(user)
}

export async function reloadAuthenticatedUser(user: User): Promise<User> {
  await user.reload()
  return user
}

export async function signOutUser(): Promise<void> {
  if (!auth) return
  await signOut(auth)
}
