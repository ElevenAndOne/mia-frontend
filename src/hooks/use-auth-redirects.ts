import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../contexts/session-context'

interface UseAuthRedirectsParams {
  justAcceptedInvite: boolean
  setJustAcceptedInvite: (value: boolean) => void
  setShowCreateWorkspaceModal: (value: boolean) => void
}

export const useAuthRedirects = ({
  justAcceptedInvite,
  setJustAcceptedInvite,
  setShowCreateWorkspaceModal,
}: UseAuthRedirectsParams) => {
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
    user,
  } = useSession()

  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated

  useEffect(() => {
    if (isLoading) return

    const path = location.pathname

    if (path.startsWith('/invite/')) return

    // Handle OAuth return - navigate back to where user was before OAuth
    // Check FIRST before any other logic, regardless of current auth state
    const pendingReturn = localStorage.getItem('mia_oauth_pending_return')
    if (pendingReturn) {
      localStorage.removeItem('mia_oauth_pending_return')
      // Parse the URL to get the pathname
      let returnPath: string
      try {
        const url = new URL(pendingReturn)
        returnPath = url.pathname
      } catch {
        returnPath = pendingReturn
      }
      // Only navigate if return path is NOT the landing page
      // (OAuth from landing page should use normal routing logic after auth)
      if (returnPath && returnPath !== '/') {
        console.log('[AUTH-REDIRECT] OAuth complete, returning to:', returnPath)
        navigate(returnPath)
        return
      }
      // If return path is '/', fall through to normal routing logic
    }

    if (isAnyAuthenticated) {
      const pendingInvite = localStorage.getItem('mia_pending_invite')
      if (pendingInvite) {
        localStorage.removeItem('mia_pending_invite')
        navigate(`/invite/${pendingInvite}`)
        return
      }
    }

    if (path === '/') {
      if (hasSeenIntro && isAnyAuthenticated && selectedAccount) {
        navigate('/home')
        return
      }
      if (hasSeenIntro && isAnyAuthenticated && !selectedAccount) {
        // Check if user needs to create workspace first
        if (!activeWorkspace && availableWorkspaces.length === 0) {
          // Show workspace creation modal (handled by App component)
          setShowCreateWorkspaceModal(true)
          return
        }
        // Has workspace, account selection happens in onboarding chat
        navigate('/onboarding')
        return
      }
    }

    if (!isAnyAuthenticated && !path.startsWith('/invite/') && path !== '/') {
      navigate('/')
      return
    }

    if (path === '/login' && selectedAccount) {
      if (!activeWorkspace && availableWorkspaces.length === 0) {
        setShowCreateWorkspaceModal(true)
      } else if (justAcceptedInvite) {
        setJustAcceptedInvite(false)
        navigate('/home')
      } else {
        // Check localStorage as fallback (backend may not return onboarding_completed flag)
        const localStorageOnboardingComplete = activeWorkspace?.tenant_id
          ? localStorage.getItem(`mia_onboarding_completed_${activeWorkspace.tenant_id}`) === 'true'
          : false

        if (user?.onboarding_completed || activeWorkspace?.onboarding_completed || localStorageOnboardingComplete) {
          navigate('/home')
        } else {
          navigate('/onboarding')
        }
      }
    }
  }, [
    isAuthenticated,
    isMetaAuthenticated,
    selectedAccount,
    isLoading,
    location.pathname,
    hasSeenIntro,
    activeWorkspace,
    availableWorkspaces,
    isAnyAuthenticated,
    justAcceptedInvite,
    user?.onboarding_completed,
    activeWorkspace?.onboarding_completed,
    navigate,
    setJustAcceptedInvite,
    setShowCreateWorkspaceModal,
  ])
}
