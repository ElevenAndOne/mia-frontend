import { useEffect, useState } from 'react'
import { acceptInvite, fetchInviteDetails } from '../services/invite-service'
import { StorageKey } from '../../../constants/storage-keys'

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

  // Auto-dismiss login prompt when auth succeeds (e.g., after OAuth redirect completes)
  // This prevents the login prompt from staying visible after session initialization finishes
  useEffect(() => {
    if (isAuthenticated && showLoginPrompt) {
      setShowLoginPrompt(false)
    }
  }, [isAuthenticated, showLoginPrompt])

  // Auto-accept after OAuth redirect: if user signed in specifically to accept this invite,
  // skip the manual "Accept Invite" step and accept immediately.
  useEffect(() => {
    const autoAccept = localStorage.getItem(StorageKey.AUTO_ACCEPT_INVITE)
    if (autoAccept !== inviteId) return
    if (!isAuthenticated || !sessionId || accepting) return
    if (!inviteDetails || !inviteDetails.is_valid) return

    console.log('[INVITE-LANDING] Auto-accepting invite after OAuth:', inviteId)
    localStorage.removeItem(StorageKey.AUTO_ACCEPT_INVITE)

    setAccepting(true)
    setError(null)
    acceptInvite(inviteId, sessionId)
      .then((data) => {
        onAccepted(data.tenant_id, data.skip_account_selection || false)
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to accept invite'
        setError(message)
        setAccepting(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteId, isAuthenticated, sessionId, inviteDetails])

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
    localStorage.setItem(StorageKey.PENDING_INVITE, inviteId)
    localStorage.setItem(StorageKey.AUTO_ACCEPT_INVITE, inviteId)
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
