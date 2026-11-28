import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../providers/useAuth'
import { RouteLoadingScreen } from '../../components/common/RouteLoadingScreen'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated, emailVerified, user } = useAuth()
  const location = useLocation()
  if (isLoading) return <RouteLoadingScreen />
  if (!isAuthenticated) return <Navigate replace to="/login" state={{ from: location.pathname + location.search }} />
  const passwordProvider = user?.providerData.some((provider) => provider.providerId === 'password')
  if (passwordProvider && !emailVerified) return <Navigate replace to="/verify-email" />
  return children
}
