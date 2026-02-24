import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/session-context'
import { useAppChromeEffects } from './use-app-chrome-effects'
import { useAuthRedirects } from './use-auth-redirects'
import { useInsightsDatePicker } from './use-insights-date-picker'
import { consumeReturnUrl } from '../routes/protected-route'
import { StorageKey } from '../constants/storage-keys'

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

  const handleInviteAccepted = async (_tenantId: string, _skipAccountSelection?: boolean) => {
    setJustAcceptedInvite(true)
    localStorage.removeItem(StorageKey.PENDING_INVITE)

    // FEB 17 FIX: Always do a full page reload after invite acceptance.
    // The accept_invite backend endpoint already set active_tenant_id, tenant_role,
    // and selected_account_id in a single db transaction. A full page reload triggers
    // initializeSession which queries the backend for the complete new workspace state.
    //
    // Previously, when skipAccountSelection was false and the user already had a
    // selectedAccount (from their own workspace), this used navigate('/home') which
    // is SPA navigation — React state stayed stale with the old workspace's accounts
    // and data. This caused existing users to still see their own data after accepting
    // an invite to another workspace.
    window.location.href = isAnyAuthenticated ? '/home' : '/'
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

  console.log('[APP-CONTROLLER] Checking loading screen - path:', location.pathname, 'isLoading:', isLoading)

  if (oauthLoadingPlatform) {
    console.log('[APP-CONTROLLER] OAuth loading platform:', oauthLoadingPlatform)
    showLoadingScreen = true
    loadingPlatform = oauthLoadingPlatform
  } else if (location.pathname === '/' && connectingPlatform) {
    console.log('[APP-CONTROLLER] Root + connecting platform')
    showLoadingScreen = true
    loadingPlatform = connectingPlatform
  } else if (location.pathname === '/' && isAnyAuthenticated && isLoading) {
    console.log('[APP-CONTROLLER] Root + auth + loading')
    showLoadingScreen = true
    loadingPlatform = connectingPlatform || (isMetaFirstFlow ? 'meta' : 'google')
  } else if (
    isLoading &&
    !isConnectingSecondPlatform &&
    location.pathname !== '/' &&
    !location.pathname.startsWith('/login') &&
    !location.pathname.startsWith('/invite/') &&
    location.pathname !== '/onboarding'
  ) {
    console.log('[APP-CONTROLLER] Generic loading screen for protected route')
    showLoadingScreen = true
    loadingPlatform = connectingPlatform || (isMetaFirstFlow ? 'meta' : isAuthenticated ? 'google' : null)
  } else if (
    location.pathname === '/onboarding' &&
    isLoading &&
    !isAnyAuthenticated &&
    !isConnectingSecondPlatform
  ) {
    console.log('[APP-CONTROLLER] Onboarding loading screen')
    // Show loading screen only if not authenticated yet
    // Note: selectedAccount is no longer required - account selection happens in onboarding chat
    showLoadingScreen = true
    loadingPlatform = connectingPlatform || (isMetaFirstFlow ? 'meta' : 'google')
  }

  console.log('[APP-CONTROLLER] Final decision - showLoadingScreen:', showLoadingScreen)

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
