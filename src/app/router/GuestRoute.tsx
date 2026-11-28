import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../providers/useAuth'
import { RouteLoadingScreen } from '../../components/common/RouteLoadingScreen'

export function GuestRoute({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated, profile } = useAuth()
  if (isLoading) return <RouteLoadingScreen />
  if (isAuthenticated && profile?.onboardingCompleted) return <Navigate replace to="/app/dashboard" />
  if (isAuthenticated) return <Navigate replace to="/onboarding" />
  return children
}
