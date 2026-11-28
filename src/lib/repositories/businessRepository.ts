import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { z } from 'zod'
import { firebaseApp } from '../firebase'
import { currencies } from '../finance/currencies'
import { normalizeTimeZone, resolveBusinessTimeZone } from '../time/timezone'
export { currencies } from '../finance/currencies'

const timeZoneSchema = z.string().trim().min(2).max(60).transform((value, context) => {
  const normalized = normalizeTimeZone(value)
  if (!normalized) {
    context.addIssue({ code: 'custom', message: 'Enter a valid IANA timezone.' })
    return z.NEVER
  }
  return normalized
})

export const businessSchema = z.object({
  id: z.string().min(1).max(128),
  ownerId: z.string().min(1).max(128),
  name: z.string().trim().min(2).max(80),
  sector: z.string().trim().min(2).max(60),
  businessType: z.enum(['sole-trader', 'family-business', 'small-team']),
  country: z.string().trim().min(2).max(60),
  currency: z.enum(currencies),
  timezone: timeZoneSchema,
  financialGoals: z.array(z.string().trim().min(1).max(120)).min(1).max(5),
  createdAt: z.unknown(),
  updatedAt: z.unknown(),
  schemaVersion: z.literal(1),
})

export type BusinessProfile = z.infer<typeof businessSchema>
export type BusinessInput = Omit<BusinessProfile, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'schemaVersion'>

function firestore() {
  if (!firebaseApp) throw new Error('Firebase is unavailable.')
  return getFirestore(firebaseApp)
}

export async function getBusinessProfile(uid: string, businessId: string): Promise<BusinessProfile | null> {
  const snapshot = await getDoc(doc(firestore(), 'users', uid, 'businesses', businessId))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  const timeZone = resolveBusinessTimeZone(data.timezone, data.country)
  const parsed = businessSchema.safeParse({
    ...data,
    ...(timeZone ? { timezone: timeZone.timeZone } : {}),
  })
  if (!parsed.success) throw new Error('The saved business profile is invalid.')
  return parsed.data
}

export async function completeBusinessOnboarding(
  uid: string,
  businessId: string,
  input: BusinessInput,
): Promise<BusinessProfile> {
  const db = firestore()
  const parsed = businessSchema.omit({
    id: true,
    ownerId: true,
    createdAt: true,
    updatedAt: true,
    schemaVersion: true,
  }).safeParse(input)
  if (!parsed.success) throw new Error('Enter valid business information.')
  const timeZone = resolveBusinessTimeZone(parsed.data.timezone, parsed.data.country)
  if (!timeZone) throw new Error('Choose a valid business timezone.')

  const businessReference = doc(db, 'users', uid, 'businesses', businessId)
  const userReference = doc(db, 'users', uid)
  const write = writeBatch(db)
  write.set(businessReference, {
    id: businessId,
    ownerId: uid,
    ...parsed.data,
    timezone: timeZone.timeZone,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    schemaVersion: 1,
  }, { merge: false })
  write.set(userReference, {
    onboardingCompleted: true,
    activeBusinessId: businessId,
    updatedAt: serverTimestamp(),
  }, { merge: true })
  await write.commit()

  const snapshot = await getDoc(businessReference)
  const stored = snapshot.data()
  if (!stored) throw new Error('The business profile could not be loaded.')
  const storedTimeZone = resolveBusinessTimeZone(stored.timezone, stored.country)
  const result = businessSchema.safeParse({
    ...stored,
    ...(storedTimeZone ? { timezone: storedTimeZone.timeZone } : {}),
  })
  if (!result.success) throw new Error('The saved business profile is invalid.')
  return result.data
}

export async function updateBusinessTimeZone(
  uid: string,
  businessId: string,
  value: string,
): Promise<string> {
  const db = firestore()
  const reference = doc(db, 'users', uid, 'businesses', businessId)
  const snapshot = await getDoc(reference)
  const data = snapshot.data()
  if (!snapshot.exists() || !data || data.id !== businessId || data.ownerId !== uid) {
    throw new Error('The business profile is not available in this account.')
  }

  const resolved = resolveBusinessTimeZone(value, data.country)
  if (!resolved) throw new Error('Choose a valid IANA timezone.')
  await updateDoc(reference, {
    timezone: resolved.timeZone,
    updatedAt: serverTimestamp(),
  })
  return resolved.timeZone
}
