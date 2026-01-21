import { useState, useEffect, useCallback } from 'react'
import { useSession } from '../shared/contexts/SessionContext'
import {
  AppState,
  AppContext,
  getInitialState,
  persistState,
  computeNextState,
} from './app-state'

interface UseAppNavigationResult {
  appState: AppState
  setAppState: (state: AppState) => void
  oauthLoadingPlatform: 'google' | 'meta' | null
  setOauthLoadingPlatform: (platform: 'google' | 'meta' | null) => void
  showCreateWorkspaceModal: boolean
  setShowCreateWorkspaceModal: (show: boolean) => void
  inviteId: string | null
  setInviteId: (id: string | null) => void
  justAcceptedInvite: boolean
  setJustAcceptedInvite: (value: boolean) => void
  isMetaFirstFlow: boolean
  isAnyAuthenticated: boolean
  handleAuthSuccess: () => void
  handleMetaAuthSuccess: () => void
}

export function useAppNavigation(): UseAppNavigationResult {
  const {
    isAuthenticated,
    isMetaAuthenticated,
    selectedAccount,
    isLoading,
    hasSeenIntro,
    activeWorkspace,
    availableWorkspaces,
  } = useSession()

  const [appState, setAppStateInternal] = useState<AppState>(getInitialState)
  const [oauthLoadingPlatform, setOauthLoadingPlatform] = useState<'google' | 'meta' | null>(null)
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)
  const [inviteId, setInviteId] = useState<string | null>(null)
  const [justAcceptedInvite, setJustAcceptedInvite] = useState(false)

  const isMetaFirstFlow = isMetaAuthenticated && !isAuthenticated
  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated

  // Wrap setAppState to also persist
  const setAppState = useCallback((state: AppState) => {
    setAppStateInternal(state)
    persistState(state)
  }, [])

  // Detect invite URL on mount
  useEffect(() => {
    const path = window.location.pathname
    const inviteMatch = path.match(/^\/invite\/([a-zA-Z0-9_-]+)$/)
    if (inviteMatch) {
      const id = inviteMatch[1]
      console.log('[APP] Detected invite URL, invite_id:', id)
      setInviteId(id)
      setAppState('invite')
    }
  }, [setAppState])

  // Persist appState changes
  useEffect(() => {
    console.log('[APP] appState changed to:', appState)
    persistState(appState)
  }, [appState])

  // Compute state transitions
  useEffect(() => {
    const ctx: AppContext = {
      isLoading,
      isAuthenticated,
      isMetaAuthenticated,
      hasSelectedAccount: !!selectedAccount,
      hasSeenIntro,
      hasActiveWorkspace: !!activeWorkspace,
      hasAvailableWorkspaces: availableWorkspaces.length > 0,
      justAcceptedInvite,
      hasPendingInvite: !!localStorage.getItem('mia_pending_invite'),
    }

    // Handle pending invite
    if (isAnyAuthenticated && ctx.hasPendingInvite) {
      const pendingInvite = localStorage.getItem('mia_pending_invite')
      if (pendingInvite) {
        localStorage.removeItem('mia_pending_invite')
        setInviteId(pendingInvite)
        setAppState('invite')
        return
      }
    }

    const nextState = computeNextState(appState, ctx)
    if (nextState) {
      console.log(`[APP] State transition: ${appState} → ${nextState}`)
      setAppState(nextState)
    }

    // Handle workspace modal for new users
    if (
      selectedAccount &&
      appState === 'account-selection' &&
      !activeWorkspace &&
      availableWorkspaces.length === 0 &&
      !justAcceptedInvite
    ) {
      setShowCreateWorkspaceModal(true)
    }
  }, [
    isAuthenticated,
    isMetaAuthenticated,
    selectedAccount,
    isLoading,
    appState,
    hasSeenIntro,
    activeWorkspace,
    availableWorkspaces,
    justAcceptedInvite,
    isAnyAuthenticated,
    setAppState,
  ])

  // Handle post-auth navigation
  const handleAuthSuccess = useCallback(() => {
    setOauthLoadingPlatform(null)
    if (selectedAccount) {
      setAppState('main')
    } else {
      setAppState('account-selection')
    }
  }, [selectedAccount, setAppState])

  const handleMetaAuthSuccess = useCallback(() => {
    setOauthLoadingPlatform(null)
    setAppState('meta-account-selection')
  }, [setAppState])

  return {
    appState,
    setAppState,
    oauthLoadingPlatform,
    setOauthLoadingPlatform,
    showCreateWorkspaceModal,
    setShowCreateWorkspaceModal,
    inviteId,
    setInviteId,
    justAcceptedInvite,
    setJustAcceptedInvite,
    isMetaFirstFlow,
    isAnyAuthenticated,
    handleAuthSuccess,
    handleMetaAuthSuccess,
  }
}
