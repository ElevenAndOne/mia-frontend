import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../contexts/session-context'
import LoadingScreen from '../components/loading-screen'
import { StorageKey } from '../constants/storage-keys'

const RETURN_URL_KEY = StorageKey.AUTH_RETURN_URL

// Save the current URL for post-auth redirect
const saveReturnUrl = (pathname: string, search: string) => {
  // Don't save login pages or root as return URLs
  if (pathname === '/' || pathname.startsWith('/login')) return
  sessionStorage.setItem(RETURN_URL_KEY, pathname + search)
}

// Export for use in auth success handlers
export const consumeReturnUrl = (): string | null => {
  const url = sessionStorage.getItem(RETURN_URL_KEY)
  sessionStorage.removeItem(RETURN_URL_KEY)
  return url
}

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
    isLoading,
    connectingPlatform
  } = useSession()

  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated
  const isMetaFirstFlow = isMetaAuthenticated && !isAuthenticated

  // Don't show loading screen if we're connecting a second platform during onboarding
  // This prevents OnboardingChat from unmounting when adding Meta as second platform
  const isConnectingSecondPlatform = connectingPlatform && isAnyAuthenticated && selectedAccount

  if (isLoading && !isConnectingSecondPlatform) {
    // Use connectingPlatform if set (explicit), otherwise infer from auth state
    const loadingPlatform = connectingPlatform || (isMetaFirstFlow ? 'meta' : isAuthenticated ? 'google' : null)
    return <LoadingScreen platform={loadingPlatform} />
  }

  if (requireMetaAuth && !isMetaAuthenticated) {
    saveReturnUrl(location.pathname, location.search)
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (!isAnyAuthenticated) {
    saveReturnUrl(location.pathname, location.search)
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
