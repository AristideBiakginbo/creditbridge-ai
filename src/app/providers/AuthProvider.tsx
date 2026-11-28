import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth, signOutUser } from '../../lib/auth/authService'
import { ensureUserProfile, getUserProfile, type UserProfile } from '../../lib/repositories/userRepository'
import { AuthContext } from './authContext'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null)
  const [isLoading, setIsLoading] = useState(Boolean(auth))
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [authenticationError, setAuthenticationError] = useState(auth ? '' : 'Firebase Authentication is unavailable.')

  const loadProfile = useCallback(async (nextUser: User) => {
    try {
      const existing = await getUserProfile(nextUser.uid)
      if (auth?.currentUser?.uid !== nextUser.uid) return
      if (existing) {
        setProfile(existing)
      } else {
        const initialized = await ensureUserProfile(nextUser)
        if (auth?.currentUser?.uid !== nextUser.uid) return
        setProfile(initialized)
      }
      setProfileStatus('ready')
    } catch {
      if (auth?.currentUser?.uid !== nextUser.uid) return
      setProfile(null)
      setProfileStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!auth) return
    let active = true
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        if (!active) return
        setUser(nextUser)
        setAuthenticationError('')
        setIsLoading(false)
        if (nextUser) {
          setProfileStatus('loading')
          void loadProfile(nextUser)
        }
        else {
          setProfile(null)
          setProfileStatus('idle')
        }
      },
      () => {
        if (!active) return
        setAuthenticationError('The authentication session could not be verified.')
        setIsLoading(false)
      },
    )
    return () => {
      active = false
      unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    if (user) {
      setProfileStatus('loading')
      await loadProfile(user)
    }
  }, [loadProfile, user])

  const refreshUser = useCallback(async () => {
    if (!user) return
    await user.reload()
    setUser(auth?.currentUser ?? user)
  }, [user])

  const signOut = useCallback(async () => {
    setProfile(null)
    setProfileStatus('idle')
    await signOutUser()
  }, [])

  const value = useMemo(() => ({
    user,
    uid: user?.uid ?? null,
    isAuthenticated: Boolean(user),
    isLoading,
    emailVerified: Boolean(user?.emailVerified),
    profile,
    profileStatus,
    authenticationError,
    refreshProfile,
    refreshUser,
    signOut,
  }), [user, isLoading, profile, profileStatus, authenticationError, refreshProfile, refreshUser, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
