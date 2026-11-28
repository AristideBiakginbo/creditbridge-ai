import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../../lib/repositories/userRepository'

export interface AuthContextValue {
  user: User | null
  uid: string | null
  isAuthenticated: boolean
  isLoading: boolean
  emailVerified: boolean
  profile: UserProfile | null
  profileStatus: 'idle' | 'loading' | 'ready' | 'error'
  authenticationError: string
  refreshProfile: () => Promise<void>
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
