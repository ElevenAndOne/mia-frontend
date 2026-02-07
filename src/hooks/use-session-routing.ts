import { useEffect } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { SessionState } from '../contexts/session-context'

interface UseSessionRoutingArgs {
  navigate: NavigateFunction
  pathname: string
  isAnyAuthenticated: boolean
  nextAction: SessionState['nextAction']
  requiresAccountSelection: boolean
  inviteContext: SessionState['inviteContext']
  isLoading: boolean
}

export const useSessionRouting = ({
  navigate,
  pathname,
  isAnyAuthenticated,
  nextAction,
  requiresAccountSelection,
  inviteContext,
  isLoading
}: UseSessionRoutingArgs) => {
  useEffect(() => {
    if (isLoading) return

    if (pathname.startsWith('/invite/')) return

    if (isAnyAuthenticated) {
      const pendingInvite = localStorage.getItem('mia_pending_invite')
      if (pendingInvite) {
        localStorage.removeItem('mia_pending_invite')
        navigate(`/invite/${pendingInvite}`)
        return
      }
    }

    if (!isAnyAuthenticated || nextAction === 'AUTH_REQUIRED') {
      if (!pathname.startsWith('/invite/') && pathname !== '/' && pathname !== '/login') {
        navigate('/')
      }
      return
    }

    if (nextAction === 'CREATE_WORKSPACE') {
      if (pathname !== '/onboarding') navigate('/onboarding')
      return
    }

    if (nextAction === 'ACCEPT_INVITE') {
      const pendingInviteId = inviteContext?.pendingInvites[0]?.inviteId
      if (pendingInviteId && !pathname.startsWith('/invite/')) navigate(`/invite/${pendingInviteId}`)
      return
    }

    if (nextAction === 'SELECT_ACCOUNT' || requiresAccountSelection) {
      if (!pathname.startsWith('/accounts')) navigate('/accounts')
      return
    }

    if (nextAction === 'ONBOARDING') {
      if (pathname !== '/onboarding') navigate('/onboarding')
      return
    }

    if (nextAction === 'HOME' && (pathname === '/' || pathname.startsWith('/accounts') || pathname === '/onboarding')) {
      navigate('/home')
    }
  }, [inviteContext, isAnyAuthenticated, isLoading, navigate, nextAction, pathname, requiresAccountSelection])
}
