import { useState } from 'react'
import { apiFetch } from '../../../utils/api'

interface ConnectionHandlersParams {
  sessionId: string | null
  selectedAccountId?: string
  activeWorkspaceTenantId?: string
  onMetaComplete: () => void
  onFacebookComplete: () => void
  onGoogleComplete: () => void
  onBrevoModalOpen: () => void
  onGA4PropertySelectorOpen: () => void
  onFacebookPageSelectorOpen: () => void
  invalidateIntegrationStatus: () => void
}

export interface PlatformConnectionHandlers {
  connectingId: string | null
  handleConnect: (integrationId: string) => Promise<void>
  handleBrevoSubmit: (apiKey: string) => Promise<{ success: boolean; error?: string }>
  handleBrevoUnlink: () => Promise<{ success: boolean; error?: string }>
  brevoSubmitting: boolean
}

/**
 * Manages platform connection logic for all integrations.
 * Handles OAuth flows, API key submissions, and popup management.
 */
export const usePlatformConnectionHandlers = ({
  sessionId,
  selectedAccountId,
  activeWorkspaceTenantId,
  onMetaComplete,
  onFacebookComplete,
  onGoogleComplete,
  onBrevoModalOpen,
  onGA4PropertySelectorOpen,
  onFacebookPageSelectorOpen,
  invalidateIntegrationStatus
}: ConnectionHandlersParams): PlatformConnectionHandlers => {
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [brevoSubmitting, setBrevoSubmitting] = useState(false)

  /**
   * Handle connecting to a platform integration.
   * Routes to appropriate connection flow based on platform type.
   */
  const handleConnect = async (integrationId: string) => {
    // GA4 uses property selector modal
    if (integrationId === 'ga4') {
      onGA4PropertySelectorOpen()
      return
    }

    // Brevo uses API key (not OAuth) - show modal instead
    if (integrationId === 'brevo') {
      onBrevoModalOpen()
      return
    }

    // Facebook Organic: Check if Meta OAuth is connected, if so show page selector
    // Otherwise, start Meta OAuth flow (it will enable both Meta Ads and FB Organic credentials)
    if (integrationId === 'facebook_organic') {
      // Check if Meta credentials exist
      try {
        const metaCredsResponse = await apiFetch(`/api/oauth/meta/credentials-status?session_id=${sessionId}`)
        if (metaCredsResponse.ok) {
          const metaCredsData = await metaCredsResponse.json()
          if (metaCredsData.has_credentials) {
            // Meta OAuth already connected - just show page selector
            onFacebookPageSelectorOpen()
            return
          }
        }
      } catch (error) {
        console.error('[FB-ORGANIC] Error checking Meta credentials:', error)
      }
      // Meta OAuth not connected - fall through to start Meta OAuth flow
      // After OAuth completes, user can select Facebook page via gear icon
      console.log('[FB-ORGANIC] Meta OAuth not connected, starting Meta OAuth flow')
    }

    setConnectingId(integrationId)

    try {
      console.log(`Connecting to ${integrationId} with sessionId:`, sessionId)

      let authUrl: string | null = null

      // Get auth URL based on platform
      // Jan 2025: Include tenant_id for workspace-scoped credential storage
      const frontendOrigin = encodeURIComponent(window.location.origin)
      const tenantParam = activeWorkspaceTenantId ? `&tenant_id=${activeWorkspaceTenantId}` : ''

      if (integrationId === 'google') {
        const response = await apiFetch(`/api/oauth/google/auth-url?session_id=${sessionId}&frontend_origin=${frontendOrigin}${tenantParam}`)
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      } else if (integrationId === 'meta' || integrationId === 'facebook_organic') {
        // Both Meta Ads and Facebook Organic use the same Meta OAuth flow
        const response = await apiFetch(`/api/oauth/meta/auth-url?session_id=${sessionId}${tenantParam}`)
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      } else if (integrationId === 'hubspot') {
        const response = await apiFetch(`/api/oauth/hubspot/auth-url?session_id=${sessionId}${tenantParam}`)
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      } else if (integrationId === 'mailchimp') {
        const response = await apiFetch(`/api/oauth/mailchimp/auth-url?session_id=${sessionId}${tenantParam}`)
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      }

      if (!authUrl) {
        throw new Error(`Failed to get ${integrationId} auth URL`)
      }

      // Open popup for OAuth
      const popup = window.open(
        authUrl,
        `${integrationId}-oauth`,
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        alert('Popup blocked. Please allow popups for this site.')
        setConnectingId(null)
        return
      }

      // Poll for popup close
      const pollTimer = setInterval(async () => {
        if (popup.closed) {
          clearInterval(pollTimer)
          console.log(`${integrationId} popup closed, completing auth flow...`)

          // For Meta/Google/Facebook Organic OAuth, call /complete endpoint to link credentials
          if (integrationId === 'meta' || integrationId === 'google' || integrationId === 'facebook_organic') {
            try {
              // Facebook Organic and Meta Ads use the same Meta OAuth endpoint
              const completeUrl = (integrationId === 'meta' || integrationId === 'facebook_organic')
                ? `/api/oauth/meta/complete`
                : `/api/oauth/google/complete`

              console.log(`Calling ${completeUrl} with session_id:`, sessionId)

              const completeResponse = await apiFetch(completeUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Session-ID': sessionId || ''
                },
                body: JSON.stringify({ session_id: sessionId })
              })

              if (!completeResponse.ok) {
                const errorText = await completeResponse.text()
                console.error(`${integrationId} /complete failed:`, errorText)
              } else {
                const completeData = await completeResponse.json()
                console.log(`${integrationId} /complete succeeded:`, completeData)

                // For Google OAuth, call the completion callback
                if (integrationId === 'google' && completeData.success) {
                  console.log('[GOOGLE-OAUTH] Google OAuth complete')
                  onGoogleComplete()
                }

                // For Meta Ads, show the account selector after OAuth completes
                // User must select which Meta ad account to link to this Google Ads account
                if (integrationId === 'meta' && completeData.success) {
                  console.log('[META-OAUTH] Meta OAuth complete - showing Meta account selector')
                  // Show Meta account selector after a brief delay for cache invalidation
                  setTimeout(() => onMetaComplete(), 500)
                }

                // For Facebook Organic, show the Facebook page selector after OAuth completes
                if (integrationId === 'facebook_organic' && completeData.success) {
                  console.log('[FB-ORGANIC] Meta OAuth complete - now showing Facebook page selector')
                  // Show Facebook page selector after a brief delay for cache invalidation
                  setTimeout(() => onFacebookComplete(), 500)
                }
              }
            } catch (error) {
              console.error(`${integrationId} /complete error:`, error)
            }
          }

          // Refresh integration status
          console.log('[INTEGRATIONS] Invalidating integration status cache after OAuth complete')
          invalidateIntegrationStatus()

          setConnectingId(null)
        }
      }, 500)
    } catch (error) {
      console.error(`${integrationId} connection error:`, error)
      alert(`Connection failed: ${error}`)
      setConnectingId(null)
    }
  }

  /**
   * Handle Brevo API Key Submission
   */
  const handleBrevoSubmit = async (apiKey: string): Promise<{ success: boolean; error?: string }> => {
    if (!apiKey.trim()) {
      return { success: false, error: 'Please enter an API key' }
    }

    if (!selectedAccountId) {
      return { success: false, error: 'No account selected. Please select an account first.' }
    }

    setBrevoSubmitting(true)

    try {
      console.log('[Brevo] Submitting API key for account')

      // Use the NEW per-account endpoint (Nov 16 fix)
      const response = await apiFetch('/api/oauth/brevo/save-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: apiKey.trim(),
          session_id: sessionId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to save API key')
      }

      const data = await response.json()
      console.log('[Brevo] API key saved successfully:', data)

      // Refresh connections
      invalidateIntegrationStatus()

      return { success: true }
    } catch (error) {
      console.error('[Brevo] API key submission error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save API key'
      }
    } finally {
      setBrevoSubmitting(false)
    }
  }

  /**
   * Handle Brevo Unlink
   */
  const handleBrevoUnlink = async (): Promise<{ success: boolean; error?: string }> => {
    setBrevoSubmitting(true)

    try {
      const response = await apiFetch(`/api/oauth/brevo/disconnect?session_id=${sessionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to disconnect Brevo')
      }

      console.log('[Brevo] Disconnected successfully')

      // Refresh connections
      invalidateIntegrationStatus()

      return { success: true }
    } catch (error) {
      console.error('[Brevo] Unlink error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect Brevo'
      }
    } finally {
      setBrevoSubmitting(false)
    }
  }

  return {
    connectingId,
    handleConnect,
    handleBrevoSubmit,
    handleBrevoUnlink,
    brevoSubmitting
  }
}
