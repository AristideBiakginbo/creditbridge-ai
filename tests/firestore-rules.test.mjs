import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setLogLevel,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST
const [emulatorHost, emulatorPort] = emulatorAddress?.split(':') ?? []
const skip = !emulatorAddress
let environment
setLogLevel('silent')

const profile = (uid, email = `${uid}@example.com`) => ({
  uid,
  displayName: `${uid} profile`,
  email,
  photoURL: null,
  onboardingCompleted: false,
  activeBusinessId: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  schemaVersion: 1,
})

const business = (uid, id) => ({
  id,
  ownerId: uid,
  name: 'Fictional Market Shop',
  sector: 'Retail',
  businessType: 'sole-trader',
  country: 'Morocco',
  currency: 'MAD',
  timezone: 'Africa/Casablanca',
  financialGoals: ['Keep clearer daily records'],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  schemaVersion: 1,
})

function owner(uid, email = `${uid}@example.com`) {
  return environment.authenticatedContext(uid, { email }).firestore()
}

async function createOwnerProfile(uid) {
  await setDoc(doc(owner(uid), 'users', uid), profile(uid))
}

before(async () => {
  if (skip) return
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8')
  environment = await initializeTestEnvironment({
    projectId: 'demo-creditbridge-rules',
    firestore: {
      host: emulatorHost,
      port: Number(emulatorPort),
      rules,
    },
  })
})

after(async () => {
  await environment?.cleanup()
})

test('denies unauthenticated access and denies unknown collections', { skip }, async () => {
  const anonymous = environment.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(anonymous, 'users', 'alice')))
  await assertFails(setDoc(doc(anonymous, 'users', 'alice'), profile('alice')))
  await assertFails(getDoc(doc(owner('alice'), 'arbitrary', 'item')))
  await assertFails(setDoc(doc(owner('alice'), 'users', 'alice', 'transactions', 'tx1'), { amount: 10 }))
  await assertFails(setDoc(doc(owner('alice'), 'transactions', 'tx1'), { amount: 10 }))
})

test('allows owner profile create and valid update, while denying cross-account access', { skip }, async () => {
  await environment.clearFirestore()
  const alice = owner('alice')
  await assertSucceeds(setDoc(doc(alice, 'users', 'alice'), profile('alice')))
  await assertSucceeds(updateDoc(doc(alice, 'users', 'alice'), {
    displayName: 'Alice updated',
    updatedAt: serverTimestamp(),
  }))
  await assertFails(getDoc(doc(owner('bob'), 'users', 'alice')))
  await assertFails(updateDoc(doc(owner('bob'), 'users', 'alice'), {
    displayName: 'Cross account',
    updatedAt: serverTimestamp(),
  }))
})

test('denies malformed profiles, missing required fields, unknown keys, and immutable edits', { skip }, async () => {
  await environment.clearFirestore()
  const alice = owner('alice')
  const ref = doc(alice, 'users', 'alice')
  await assertFails(setDoc(ref, { ...profile('alice'), displayName: 42 }))
  await assertFails(setDoc(ref, { ...profile('alice'), unexpected: 'field' }))
  const incomplete = profile('alice')
  delete incomplete.displayName
  await assertFails(setDoc(ref, incomplete))
  await assertFails(setDoc(ref, { ...profile('alice'), createdAt: 'not-a-timestamp' }))
  await assertFails(setDoc(ref, { ...profile('alice'), email: { value: 'alice@example.com' } }))
  await assertFails(setDoc(ref, { ...profile('alice'), photoURL: 'javascript:alert(1)' }))
  await assertSucceeds(setDoc(ref, profile('alice')))
  await assertFails(updateDoc(ref, { uid: 'bob', updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { createdAt: Timestamp.fromDate(new Date(0)), updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { displayName: deleteField(), updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { displayName: 'Changed', extra: 'field', updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { updatedAt: Timestamp.fromDate(new Date(0)) }))
})

test('allows business create/update and denies invalid ownership, timestamps and schema', { skip }, async () => {
  await environment.clearFirestore()
  await createOwnerProfile('alice')
  const alice = owner('alice')
  const ref = doc(alice, 'users', 'alice', 'businesses', 'shop-1')
  await assertSucceeds(setDoc(ref, business('alice', 'shop-1')))
  await assertSucceeds(updateDoc(ref, {
    name: 'Updated Fictional Shop',
    updatedAt: serverTimestamp(),
  }))
  await assertFails(setDoc(doc(alice, 'users', 'alice', 'businesses', 'shop-2'), business('bob', 'shop-2')))
  await assertFails(setDoc(doc(owner('orphan'), 'users', 'orphan', 'businesses', 'shop'), business('orphan', 'shop')))
  const incompleteBusiness = business('alice', 'shop-missing')
  delete incompleteBusiness.financialGoals
  await assertFails(setDoc(doc(alice, 'users', 'alice', 'businesses', 'shop-missing'), incompleteBusiness))
  await assertFails(setDoc(doc(alice, 'users', 'alice', 'businesses', 'shop-3'), {
    ...business('alice', 'shop-3'),
    currency: 'BTC',
  }))
  await assertFails(setDoc(doc(alice, 'users', 'alice', 'businesses', 'shop-4'), {
    ...business('alice', 'shop-4'),
    updatedAt: Timestamp.fromDate(new Date(0)),
  }))
  await assertFails(updateDoc(ref, { ownerId: 'bob', updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { createdAt: Timestamp.fromDate(new Date(0)), updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { updatedAt: Timestamp.fromDate(new Date(0)) }))
  await assertFails(updateDoc(ref, { extra: 'field', updatedAt: serverTimestamp() }))
})

test('allows atomic onboarding only when its matching owned business exists after the batch', { skip }, async () => {
  await environment.clearFirestore()
  await createOwnerProfile('alice')
  const alice = owner('alice')
  const profileRef = doc(alice, 'users', 'alice')
  const businessRef = doc(alice, 'users', 'alice', 'businesses', 'shop-1')
  const batch = writeBatch(alice)
  batch.set(businessRef, business('alice', 'shop-1'))
  batch.update(profileRef, {
    onboardingCompleted: true,
    activeBusinessId: 'shop-1',
    updatedAt: serverTimestamp(),
  })
  await assertSucceeds(batch.commit())

  await environment.clearFirestore()
  await createOwnerProfile('alice')
  await assertFails(updateDoc(doc(owner('alice'), 'users', 'alice'), {
    onboardingCompleted: true,
    activeBusinessId: 'missing-shop',
    updatedAt: serverTimestamp(),
  }))

  await environment.clearFirestore()
  await createOwnerProfile('alice')
  const wrongBatchDb = owner('alice')
  const wrongOwnerBatch = writeBatch(wrongBatchDb)
  wrongOwnerBatch.set(doc(wrongBatchDb, 'users', 'alice', 'businesses', 'wrong-shop'), business('bob', 'wrong-shop'))
  wrongOwnerBatch.update(doc(wrongBatchDb, 'users', 'alice'), {
    onboardingCompleted: true,
    activeBusinessId: 'wrong-shop',
    updatedAt: serverTimestamp(),
  })
  await assertFails(wrongOwnerBatch.commit())
})

test('preferences require valid fields and keep cloud sync disabled', { skip }, async () => {
  await environment.clearFirestore()
  const alice = owner('alice')
  const ref = doc(alice, 'users', 'alice', 'preferences', 'settings')
  await assertSucceeds(setDoc(ref, {
    ownerId: 'alice',
    language: 'en',
    theme: 'system',
    syncEnabled: false,
    updatedAt: serverTimestamp(),
    schemaVersion: 1,
  }))
  await assertFails(updateDoc(ref, { syncEnabled: true, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { ownerId: 'bob', updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { language: 'es', updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { updatedAt: Timestamp.fromDate(new Date(0)) }))
  await assertFails(setDoc(doc(alice, 'users', 'alice', 'preferences', 'other'), {
    ownerId: 'alice',
    language: 'en',
    theme: 'system',
    syncEnabled: false,
    updatedAt: serverTimestamp(),
    schemaVersion: 1,
  }))
})
