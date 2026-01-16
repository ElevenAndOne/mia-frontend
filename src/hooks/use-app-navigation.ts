import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useCallback } from 'react'

/**
 * Navigation hook that provides declarative navigation methods.
 * Replaces the old callback-based navigation pattern.
 */
export const useAppNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  // Main app navigation
  const goToMain = useCallback(() => navigate('/app'), [navigate])
  const goToIntegrations = useCallback(() => navigate('/app/integrations'), [navigate])
  const goToWorkspaceSettings = useCallback(() => navigate('/app/settings'), [navigate])

  // Insights navigation
  const goToInsights = useCallback(
    (type: 'grow' | 'optimize' | 'protect' | 'summary') => {
      navigate(`/app/insights/${type}`)
    },
    [navigate]
  )

  // Setup/onboarding navigation
  const goToOnboarding = useCallback(() => navigate('/onboarding'), [navigate])
  const goToAccountSetup = useCallback(() => navigate('/setup/account'), [navigate])
  const goToMetaAccountSetup = useCallback(() => navigate('/setup/meta-account'), [navigate])

  // Public routes
  const goToHome = useCallback(() => navigate('/'), [navigate])
  const goToInvite = useCallback(
    (inviteId: string) => navigate(`/invite/${inviteId}`),
    [navigate]
  )

  // Generic navigation
  const goBack = useCallback(() => navigate(-1), [navigate])

  // Get current route info
  const getCurrentPath = useCallback(() => location.pathname, [location.pathname])
  const isOnPath = useCallback(
    (path: string) => location.pathname === path || location.pathname.startsWith(path + '/'),
    [location.pathname]
  )

  return {
    // React Router primitives
    navigate,
    location,
    params,

    // Declarative navigation
    goToMain,
    goToIntegrations,
    goToWorkspaceSettings,
    goToInsights,
    goToOnboarding,
    goToAccountSetup,
    goToMetaAccountSetup,
    goToHome,
    goToInvite,
    goBack,

    // Route info
    getCurrentPath,
    isOnPath,
  }
}

export default useAppNavigation
