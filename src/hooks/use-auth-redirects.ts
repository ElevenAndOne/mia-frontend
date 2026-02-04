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
        navigate('/login')
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
      } else if (user?.onboarding_completed) {
        navigate('/home')
      } else {
        navigate('/onboarding')
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
    navigate,
    setJustAcceptedInvite,
    setShowCreateWorkspaceModal,
  ])
}
