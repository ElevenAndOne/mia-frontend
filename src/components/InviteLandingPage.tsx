import { useState, useEffect } from 'react'
import { useSession } from '../contexts/SessionContext'
import { apiFetch } from '../utils/api'

interface InviteDetails {
  invite_id: string
  tenant_name: string
  role: string
  is_valid: boolean
  is_link_invite: boolean
  status: string
  expires_at: string | null
}

interface InviteLandingPageProps {
  inviteId: string
  onAccepted: (tenantId: string) => void
  onBack: () => void
}

const InviteLandingPage = ({ inviteId, onAccepted, onBack }: InviteLandingPageProps) => {
  const { isAuthenticated, isMetaAuthenticated, sessionId, user } = useSession()
  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated

  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // Fetch invite details on mount
  useEffect(() => {
    const fetchInviteDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiFetch(`/api/tenants/invites/${inviteId}/details`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('This invite link is invalid or has expired.')
          } else {
            setError('Failed to load invite details.')
          }
          return
        }

        const data = await response.json()
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
        console.error('[INVITE] Error fetching invite details:', err)
        setError('Failed to load invite details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchInviteDetails()
  }, [inviteId])

  const handleAccept = async () => {
    if (!isAnyAuthenticated) {
      setShowLoginPrompt(true)
      return
    }

    try {
      setAccepting(true)
      setError(null)

      const response = await apiFetch(`/api/tenants/invites/${inviteId}/accept`, {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId || ''
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to accept invite')
      }

      const data = await response.json()
      console.log('[INVITE] Invite accepted:', data)

      // Redirect to the workspace
      onAccepted(data.tenant_id)
    } catch (err) {
      console.error('[INVITE] Error accepting invite:', err)
      setError(err instanceof Error ? err.message : 'Failed to accept invite')
    } finally {
      setAccepting(false)
    }
  }

  const getRoleDescription = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Full access to manage workspace settings, members, and integrations'
      case 'analyst':
        return 'Access to view and analyze data, create reports'
      case 'viewer':
        return 'Read-only access to view dashboards and reports'
      default:
        return 'Access to the workspace'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        )
      case 'analyst':
        return (
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
          </div>
        )
      case 'viewer':
        return (
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        )
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen-dvh bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invite...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !inviteDetails?.is_valid) {
    return (
      <div className="min-h-screen-dvh bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  // Login prompt
  if (showLoginPrompt) {
    const handleSignInClick = () => {
      // Store invite_id in localStorage so we can return after login
      localStorage.setItem('mia_pending_invite', inviteId)
      console.log('[INVITE] Stored pending invite:', inviteId)
      onBack() // Go to login
    }

    return (
      <div className="min-h-screen-dvh bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-600 mb-6">
            Please sign in to accept this invite and join <span className="font-semibold">{inviteDetails?.tenant_name}</span>.
          </p>
          <button
            onClick={handleSignInClick}
            className="w-full px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors mb-3"
          >
            Sign In
          </button>
          <button
            onClick={() => setShowLoginPrompt(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Back to invite
          </button>
        </div>
      </div>
    )
  }

  // Valid invite
  return (
    <div className="min-h-screen-dvh bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
            {inviteDetails?.tenant_name?.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Join {inviteDetails?.tenant_name}
          </h1>
          <p className="text-gray-500">
            You've been invited to collaborate
          </p>
        </div>

        {/* Role info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            {getRoleIcon(inviteDetails?.role || '')}
            <div>
              <p className="font-semibold text-gray-900 capitalize">
                {inviteDetails?.role} Role
              </p>
              <p className="text-sm text-gray-600">
                {getRoleDescription(inviteDetails?.role || '')}
              </p>
            </div>
          </div>
        </div>

        {/* User info (if logged in) */}
        {isAnyAuthenticated && user && (
          <div className="border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Joining as</p>
            <div className="flex items-center gap-3">
              {user.picture_url ? (
                <img src={user.picture_url} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-600 font-medium">{user.name?.charAt(0)}</span>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Accepting...
              </span>
            ) : isAnyAuthenticated ? (
              'Accept Invite'
            ) : (
              'Sign In to Accept'
            )}
          </button>

          <button
            onClick={onBack}
            className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Decline
          </button>
        </div>

        {/* Invite type badge */}
        {inviteDetails?.is_link_invite && (
          <p className="text-center text-xs text-gray-400 mt-4">
            This is a public invite link
          </p>
        )}
      </div>
    </div>
  )
}

export default InviteLandingPage
