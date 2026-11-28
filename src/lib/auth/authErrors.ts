export type AuthErrorCode =
  | 'invalid-credentials'
  | 'invalid-email'
  | 'weak-password'
  | 'email-in-use'
  | 'network'
  | 'too-many-requests'
  | 'popup-blocked'
  | 'popup-closed'
  | 'provider-disabled'
  | 'unauthorized-domain'
  | 'account-conflict'
  | 'unknown'

export function mapAuthError(error: unknown): { code: AuthErrorCode; message: string } {
  const code = error instanceof Error && 'code' in error
    ? String((error as Error & { code?: string }).code)
    : ''
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return { code: 'invalid-credentials', message: 'Email or password is incorrect.' }
  if (code.includes('invalid-email')) return { code: 'invalid-email', message: 'Enter a valid email address.' }
  if (code.includes('weak-password')) return { code: 'weak-password', message: 'Use a stronger password.' }
  if (code.includes('email-already-in-use')) return { code: 'email-in-use', message: 'An account already exists for this email.' }
  if (code.includes('network-request-failed')) return { code: 'network', message: 'Network request failed. Check your connection.' }
  if (code.includes('too-many-requests')) return { code: 'too-many-requests', message: 'Too many attempts. Try again later.' }
  if (code.includes('popup-blocked')) return { code: 'popup-blocked', message: 'The sign-in popup was blocked.' }
  if (code.includes('popup-closed')) return { code: 'popup-closed', message: 'Google sign-in was cancelled.' }
  if (code.includes('operation-not-allowed') || code.includes('provider')) return { code: 'provider-disabled', message: 'This sign-in provider is unavailable.' }
  if (code.includes('unauthorized-domain')) return { code: 'unauthorized-domain', message: 'This domain is not authorized for sign-in.' }
  if (code.includes('account-exists-with-different-credential')) return { code: 'account-conflict', message: 'This email is associated with a different sign-in method.' }
  return { code: 'unknown', message: 'Authentication could not be completed.' }
}
