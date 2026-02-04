import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/session-context'
import { useAppChromeEffects } from './use-app-chrome-effects'
import { useAuthRedirects } from './use-auth-redirects'
import { useInsightsDatePicker } from './use-insights-date-picker'

export const useAppController = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    isAuthenticated,
    isMetaAuthenticated,
    selectedAccount,
    isLoading,
    hasSeenIntro,
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
    if (selectedAccount) {
      navigate('/home')
    } else {
      navigate('/login')
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
      localStorage.setItem('pending_platform_connect', platformId)
      navigate('/integrations')
    }
  }

  const handleInviteAccepted = async (tenantId: string, skipAccountSelection?: boolean) => {
    window.history.replaceState({}, '', '/')
    setJustAcceptedInvite(true)
    await refreshWorkspaces()
    await switchWorkspace(tenantId)

    if (skipAccountSelection && isAnyAuthenticated) {
      navigate('/home')
    } else if (isAnyAuthenticated && selectedAccount) {
      navigate('/home')
    } else if (isAnyAuthenticated) {
      navigate('/login')
    } else {
      navigate('/')
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
    (!isAnyAuthenticated || !selectedAccount) &&
    !isConnectingSecondPlatform
  ) {
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
