import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../providers/useAuth'
import { RouteLoadingScreen } from '../../components/common/RouteLoadingScreen'

export function VerificationGuard({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated, emailVerified, user, profile } = useAuth()
  if (isLoading) return <RouteLoadingScreen />
  if (!isAuthenticated) return <Navigate replace to="/login" />
  const passwordProvider = user?.providerData.some((provider) => provider.providerId === 'password')
  if (!passwordProvider || emailVerified) {
    return <Navigate replace to={profile?.onboardingCompleted ? '/app/dashboard' : '/onboarding'} />
  }
  return children
}
