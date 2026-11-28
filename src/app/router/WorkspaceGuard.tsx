import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../providers/useAuth'
import { RouteLoadingScreen } from '../../components/common/RouteLoadingScreen'

export function WorkspaceGuard({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated, profile, profileStatus, emailVerified, user } = useAuth()
  const location = useLocation()
  if (isLoading || (isAuthenticated && profileStatus === 'loading')) return <RouteLoadingScreen />
  if (!isAuthenticated) return <Navigate replace to="/login" state={{ from: location.pathname }} />
  const passwordProvider = user?.providerData.some((provider) => provider.providerId === 'password')
  if (passwordProvider && !emailVerified) return <Navigate replace to="/verify-email" />
  if (profileStatus === 'error') return <Navigate replace to="/onboarding" />
  if (!profile?.onboardingCompleted) return <Navigate replace to="/onboarding" />
  return children
}
