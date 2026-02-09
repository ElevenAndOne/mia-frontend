import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/session-context'
import { useAppChromeEffects } from './use-app-chrome-effects'
import { useAuthRedirects } from './use-auth-redirects'
import { useInsightsDatePicker } from './use-insights-date-picker'
import { consumeReturnUrl } from '../routes/protected-route'

export const useAppController = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isAuthenticated,
    isMetaAuthenticated,
    selectedAccount,
    isLoading,
    hasSeenIntro,
    activeWorkspace,
    availableWorkspaces,
    loginMeta,
    refreshAccounts,
    refreshWorkspaces,
    switchWorkspace,
    connectingPlatform,
  } = useSession()

  const [oauthLoadingPlatform, setOauthLoadingPlatform] = useState<'google' | 'meta' | null>(null)
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)
  const [justAcceptedInvite, setJustAcceptedInvite] = useState(false)

  useAppChromeEffects()
  useAuthRedirects({
    justAcceptedInvite,
    setJustAcceptedInvite,
    setShowCreateWorkspaceModal,
  })

  const insightsDatePicker = useInsightsDatePicker()

  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated
  const isMetaFirstFlow = isMetaAuthenticated && !isAuthenticated

  const handleAuthSuccess = () => {
    const returnUrl = consumeReturnUrl()
    if (selectedAccount) {
      // Navigate to saved destination or default to /home
      navigate(returnUrl || '/home')
    } else if (!activeWorkspace && availableWorkspaces.length === 0) {
      // No workspace - show create workspace modal first
      setShowCreateWorkspaceModal(true)
    } else {
      // Has workspace, account selection happens in onboarding chat
      navigate('/onboarding')
    }
    setOauthLoadingPlatform(null)
  }

  const handleMetaAuthSuccess = () => {
    navigate('/login/meta')
    setOauthLoadingPlatform(null)
  }

  const handleOnboardingComplete = () => {
    navigate('/home')
  }

  const handleConnectPlatform = async (platformId: string) => {
    if (platformId === 'meta_ads' || platformId === 'meta' || platformId === 'facebook_organic') {
      const success = await loginMeta()
      if (success) {
        await refreshAccounts()
      }
    } else {
      navigate('/integrations')
    }
  }

  const handleInviteAccepted = async (tenantId: string, skipAccountSelection?: boolean) => {
    setJustAcceptedInvite(true)
    // Clean up pending invite to prevent redirect loop
    localStorage.removeItem('mia_pending_invite')

    try {
      await refreshWorkspaces()
      await switchWorkspace(tenantId)

      // Only clear URL after async operations succeed
      window.history.replaceState({}, '', '/')

      if (skipAccountSelection && isAnyAuthenticated) {
        navigate('/home')
      } else if (isAnyAuthenticated && selectedAccount) {
        navigate('/home')
      } else if (isAnyAuthenticated) {
        // Account selection happens in onboarding chat
        navigate('/onboarding')
      } else {
        navigate('/')
      }
    } catch (error) {
      console.error('[APP] Invite acceptance failed:', error)
      // Keep URL so user can retry
    }
  }

  const handleCreateWorkspaceClose = () => {
    console.log('[APP] Create workspace modal close attempted - workspace required')
  }

  const handleCreateWorkspaceSuccess = (tenantId: string) => {
    console.log('[APP] Workspace created:', tenantId)
    setShowCreateWorkspaceModal(false)
    navigate('/onboarding')
  }

  const isConnectingSecondPlatform = Boolean(connectingPlatform && isAnyAuthenticated && selectedAccount)
  let loadingPlatform: 'google' | 'meta' | null = null
  let showLoadingScreen = false

  if (oauthLoadingPlatform) {
    showLoadingScreen = true
    loadingPlatform = oauthLoadingPlatform
  } else if (location.pathname === '/' && connectingPlatform) {
    showLoadingScreen = true
    loadingPlatform = connectingPlatform
  } else if (location.pathname === '/' && isAnyAuthenticated && isLoading) {
    showLoadingScreen = true
    loadingPlatform = connectingPlatform || (isMetaFirstFlow ? 'meta' : 'google')
  } else if (
    isLoading &&
    !isConnectingSecondPlatform &&
    location.pathname !== '/' &&
    !location.pathname.startsWith('/login') &&
    location.pathname !== '/onboarding'
  ) {
    showLoadingScreen = true
    loadingPlatform = connectingPlatform || (isMetaFirstFlow ? 'meta' : isAuthenticated ? 'google' : null)
  } else if (
    location.pathname === '/onboarding' &&
    isLoading &&
    !isAnyAuthenticated &&
    !isConnectingSecondPlatform
  ) {
    // Show loading screen only if not authenticated yet
    // Note: selectedAccount is no longer required - account selection happens in onboarding chat
    showLoadingScreen = true
    loadingPlatform = connectingPlatform || (isMetaFirstFlow ? 'meta' : 'google')
  }

  return {
    hasSeenIntro,
    showLoadingScreen,
    loadingPlatform,
    onOAuthPopupClosed: setOauthLoadingPlatform,
    appRoutes: {
      onAuthSuccess: handleAuthSuccess,
      onMetaAuthSuccess: handleMetaAuthSuccess,
      onOnboardingComplete: handleOnboardingComplete,
      onConnectPlatform: handleConnectPlatform,
      onInviteAccepted: handleInviteAccepted,
    },
    insightsDatePicker,
    createWorkspaceModal: {
      isOpen: showCreateWorkspaceModal,
      required: true,
      onClose: handleCreateWorkspaceClose,
      onSuccess: handleCreateWorkspaceSuccess,
    },
  }
}
