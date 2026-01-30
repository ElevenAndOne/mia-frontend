import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../contexts/session-context'
import LoadingScreen from '../components/loading-screen'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAccount?: boolean
  requireWorkspace?: boolean
  requireMetaAuth?: boolean
}

export const ProtectedRoute = ({
  children,
  requireAccount = false,
  requireWorkspace = false,
  requireMetaAuth = false
}: ProtectedRouteProps) => {
  const location = useLocation()
  const {
    isAuthenticated,
    isMetaAuthenticated,
    selectedAccount,
    activeWorkspace,
    isLoading
  } = useSession()

  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated
  const isMetaFirstFlow = isMetaAuthenticated && !isAuthenticated

  if (isLoading) {
    const loadingPlatform = isMetaFirstFlow ? 'meta' : isAuthenticated ? 'google' : null
    return <LoadingScreen platform={loadingPlatform} />
  }

  if (requireMetaAuth && !isMetaAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (!isAnyAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (requireAccount && !selectedAccount) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireWorkspace && !activeWorkspace) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
