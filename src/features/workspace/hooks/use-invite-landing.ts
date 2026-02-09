import { useEffect, useState } from 'react'
import { acceptInvite, fetchInviteDetails } from '../services/invite-service'

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
        const data = await fetchInviteDetails(inviteId)
        setInviteDetails(data)

        if (!data.is_valid) {
          if (data.status === 'accepted') {
            setError('This invite has already been used.')
          } else if (data.status === 'revoked') {
            setError('This invite has been revoked.')
          } else if (data.status === 'expired') {
            setError('This invite has expired.')
          } else {
            setError('This invite is no longer valid.')
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load invite details. Please try again.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    loadInvite()
  }, [inviteId])

  const handleAccept = async () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }

    if (!sessionId) return

    try {
      setAccepting(true)
      setError(null)
      const data = await acceptInvite(inviteId, sessionId)
      onAccepted(data.tenant_id, data.skip_account_selection || false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invite'
      setError(message)
    } finally {
      setAccepting(false)
    }
  }

  const handleSignIn = () => {
    console.log('[INVITE-LANDING] handleSignIn - storing pending invite:', inviteId)
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
