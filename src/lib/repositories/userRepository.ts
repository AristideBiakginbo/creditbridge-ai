import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { z } from 'zod'
import { firebaseApp } from '../firebase'

export const userProfileSchema = z.object({
  uid: z.string().min(1).max(128),
  displayName: z.string().trim().min(1).max(80),
  email: z.string().email().max(254).nullable(),
  photoURL: z.string().url().max(2048).nullable().optional(),
  onboardingCompleted: z.boolean(),
  activeBusinessId: z.string().min(1).max(128).nullable(),
  createdAt: z.unknown(),
  updatedAt: z.unknown(),
  schemaVersion: z.literal(1),
})

export type UserProfile = z.infer<typeof userProfileSchema>

function firestore() {
  if (!firebaseApp) throw new Error('Firebase is unavailable.')
  return getFirestore(firebaseApp)
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(firestore(), 'users', uid))
  if (!snapshot.exists()) return null
  const parsed = userProfileSchema.safeParse(snapshot.data())
  if (!parsed.success) throw new Error('The saved profile is invalid.')
  return parsed.data
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const db = firestore()
  const reference = doc(db, 'users', user.uid)
  const existing = await getDoc(reference)
  if (existing.exists()) {
    const parsed = userProfileSchema.safeParse(existing.data())
    if (!parsed.success) throw new Error('The saved profile is invalid.')
    return parsed.data
  }
  const profile = {
    uid: user.uid,
    displayName: user.displayName?.trim() || 'CreditBridge user',
    email: user.email,
    photoURL: user.photoURL,
    onboardingCompleted: false,
    activeBusinessId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    schemaVersion: 1,
  }
  await setDoc(reference, profile)
  return userProfileSchema.parse({
    ...profile,
    createdAt: null,
    updatedAt: null,
  })
}

export async function updateUserDisplayName(uid: string, displayName: string): Promise<void> {
  const parsed = z.string().trim().min(1).max(80).safeParse(displayName)
  if (!parsed.success) throw new Error('Enter a valid display name.')
  await updateDoc(doc(firestore(), 'users', uid), {
    displayName: parsed.data,
    updatedAt: serverTimestamp(),
  })
}
