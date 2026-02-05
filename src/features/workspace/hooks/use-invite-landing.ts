import { useEffect, useState } from 'react'
import { useMiaClient, isMiaSDKError } from '../../../sdk'

export interface InviteDetails {
  invite_id: string
  tenant_name: string
  role: string
  is_valid: boolean
  is_link_invite: boolean
  status: string
  expires_at: string | null
}

interface UseInviteLandingParams {
  inviteId: string
  sessionId: string | null
  isAuthenticated: boolean
  onAccepted: (tenantId: string, skipAccountSelection?: boolean) => void
  onSignIn?: () => void
}

export const useInviteLanding = ({ inviteId, sessionId, isAuthenticated, onAccepted, onSignIn }: UseInviteLandingParams) => {
  const mia = useMiaClient()
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  useEffect(() => {
    const loadInvite = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await mia.workspaces.getInviteDetails(inviteId)

        // Map SDK response to local format
        const details: InviteDetails = {
          invite_id: data.inviteId,
          tenant_name: data.workspaceName,
          role: data.role,
          is_valid: data.isValid,
          is_link_invite: false, // SDK doesn't expose this currently
          status: data.isValid ? 'pending' : 'invalid',
          expires_at: null, // SDK doesn't expose this currently
        }
        setInviteDetails(details)

        if (!data.isValid) {
          setError('This invite is no longer valid.')
        }
      } catch (err) {
        if (isMiaSDKError(err) && err.status === 404) {
          setError('This invite link is invalid or has expired.')
        } else {
          const message = err instanceof Error ? err.message : 'Failed to load invite details. Please try again.'
          setError(message)
        }
      } finally {
        setLoading(false)
      }
    }

    loadInvite()
  }, [inviteId, mia])

  const handleAccept = async () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }

    if (!sessionId) return

    try {
      setAccepting(true)
      setError(null)
      const data = await mia.workspaces.acceptInvite(inviteId)
      onAccepted(data.tenantId, false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invite'
      setError(message)
    } finally {
      setAccepting(false)
    }
  }

  const handleSignIn = () => {
    localStorage.setItem('mia_pending_invite', inviteId)
    onSignIn?.()
  }

  const dismissLoginPrompt = () => {
    setShowLoginPrompt(false)
  }

  return {
    inviteDetails,
    loading,
    error,
    accepting,
    showLoginPrompt,
    dismissLoginPrompt,
    handleSignIn,
    handleAccept,
  }
}
