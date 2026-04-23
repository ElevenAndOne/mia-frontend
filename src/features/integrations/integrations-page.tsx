import { useState, useMemo, useEffect, useRef } from 'react'
import { EXTERNAL_URLS } from '../../constants/external-urls'
import { StorageKey } from '../../constants/storage-keys'
import { useSession } from '../../contexts/session-context'
import { useToast } from '../../contexts/toast-context'
import { apiFetch, createSessionHeaders } from '../../utils/api'
import { getTimeAgo } from '../../utils/date-display'
import { useIntegrationStatus } from './hooks/use-integration-status'
import { getIntegrationHighlight, clearIntegrationHighlight } from './utils/integration-highlight'
import MetaAccountSelector from './selectors/meta-account-selector'
import FacebookPageSelector from './selectors/facebook-page-selector'
import GA4PropertySelector from './selectors/ga4-property-selector'
import GoogleAccountSelector from './selectors/google-account-selector'
import BrevoAccountSelector from './selectors/brevo-account-selector'
import HubSpotAccountSelector from './selectors/hubspot-account-selector'
import MailchimpAccountSelector from './selectors/mailchimp-account-selector'
import LinkedInAccountSelector from './selectors/linkedin-account-selector'
import AirtableBaseSelector from './selectors/airtable-base-selector'
import PlatformGearMenu from './views/platform-gear-menu'
import { TopBar } from '../../components/top-bar'
import { Spinner } from '../../components/spinner'
import { ConfirmDialog } from '../../components/confirm-dialog'
import { logger } from '../../utils/logger'

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  linked: boolean // MAR 2026: true when account-level ID is mapped, false when only tenant-level creds exist
  dataPoints?: number
  lastSync?: string
  autoSync?: boolean
}

const IntegrationsPage = ({ onBack }: { onBack: () => void }) => {
  const { sessionId, selectedAccount, refreshAccounts, activeWorkspace, refreshWorkspaces } =
    useSession()
  const { showToast } = useToast()

  // Use React Query hook for integration status (cached, deduplicated)
  // Jan 2025: Pass tenant_id to fetch workspace-level integration status
  const {
    platformStatus,
    currentAccountData,
    ga4Properties,
    linkedGA4Properties,
    isLoading: loading,
    error: integrationStatusError,
    refetch: refetchIntegrationStatus,
    invalidate: invalidateIntegrationStatus,
  } = useIntegrationStatus(sessionId, selectedAccount?.id, activeWorkspace?.tenant_id)

  // Show error toast when integration status fetch fails
  useEffect(() => {
    if (integrationStatusError) {
      showToast(
        'error',
        'Failed to load integration status. Some connections may not appear correctly.'
      )
    }
  }, [integrationStatusError, showToast])

  const [connectingId, setConnectingId] = useState<string | null>(null)
  const oauthPollTimerRef = useRef<number | null>(null)

  // FEB 2026 FIX: Invalidate integration status cache when leaving this page
  // This ensures the main page (ChatView) fetches fresh data to show newly connected platforms
  // Without this, the 2-minute React Query staleTime causes cached (stale) data to be used
  useEffect(() => {
    return () => {
      logger.log(
        '[INTEGRATIONS] Unmounting - invalidating integration-status cache for fresh data on main page'
      )
      invalidateIntegrationStatus()
      // Also refresh workspaces to update connected_platforms array
      refreshWorkspaces().catch((err) =>
        logger.error('[INTEGRATIONS] Failed to refresh workspaces on unmount:', err)
      )
      if (oauthPollTimerRef.current) {
        window.clearInterval(oauthPollTimerRef.current)
        oauthPollTimerRef.current = null
      }
    }
  }, [invalidateIntegrationStatus, refreshWorkspaces])

  // Consolidated modal state - reduces useState hooks from 10+ to 1
  const [openModal, setOpenModal] = useState<string | null>(null)

  // Brevo API Key form state
  const [brevoApiKey, setBrevoApiKey] = useState('')
  const [brevoSubmitting, setBrevoSubmitting] = useState(false)
  const [brevoError, setBrevoError] = useState('')
  const [showBrevoUnlinkConfirm, setShowBrevoUnlinkConfirm] = useState(false)

  // Integration highlight state - read from sessionStorage on mount
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])
  const highlightProcessedRef = useRef(false)

  // Read integration highlight on mount (set by chat when navigating here)
  useEffect(() => {
    if (highlightProcessedRef.current) return
    highlightProcessedRef.current = true

    const highlights = getIntegrationHighlight()
    if (highlights.length > 0) {
      setHighlightedIds(highlights)
      clearIntegrationHighlight()
      // Auto-clear visual highlight after 3 seconds
      const t = setTimeout(() => setHighlightedIds([]), 5000)
      return () => clearTimeout(t)
    }
  }, [])

  // Detect Google OAuth redirect completion — auto-open account selector
  const googleRedirectProcessedRef = useRef(false)
  useEffect(() => {
    if (googleRedirectProcessedRef.current) return
    googleRedirectProcessedRef.current = true

    // Check if we just returned from Google OAuth redirect flow
    // Uses localStorage flags because URL params get cleaned by session context before this runs
    const googleAdsPending = localStorage.getItem(StorageKey.GOOGLE_ADS_CONNECT_PENDING)
    const ga4Pending = localStorage.getItem(StorageKey.GA4_CONNECT_PENDING)
    let t: ReturnType<typeof setTimeout> | undefined
    if (googleAdsPending) {
      localStorage.removeItem(StorageKey.GOOGLE_ADS_CONNECT_PENDING)
      t = setTimeout(() => setOpenModal('google'), 1000)
    } else if (ga4Pending) {
      localStorage.removeItem(StorageKey.GA4_CONNECT_PENDING)
      // After Google OAuth for GA4, open GA4 property selector (not Google Ads)
      t = setTimeout(() => setOpenModal('ga4'), 1000)
    }
    return () => clearTimeout(t)
  }, [])

  // Modal helpers
  const showBrevoModal = openModal === 'brevo'
  const showGoogleAccountSelector = openModal === 'google'
  const showMetaAccountSelector = openModal === 'meta'
  const showBrevoAccountSelector = openModal === 'brevo-selector'
  const showHubSpotAccountSelector = openModal === 'hubspot'
  const showMailchimpAccountSelector = openModal === 'mailchimp'
  const showFacebookPageSelector = openModal === 'facebook'
  const showGA4PropertySelector = openModal === 'ga4'
  const showLinkedInAccountSelector = openModal === 'linkedin_ads'
  const showAirtableBaseSelector = openModal === 'airtable'

  const setShowBrevoModal = (show: boolean) => setOpenModal(show ? 'brevo' : null)
  const setShowGoogleAccountSelector = (show: boolean) => setOpenModal(show ? 'google' : null)
  const setShowMetaAccountSelector = (show: boolean) => setOpenModal(show ? 'meta' : null)
  const setShowBrevoAccountSelector = (show: boolean) =>
    setOpenModal(show ? 'brevo-selector' : null)
  const setShowHubSpotAccountSelector = (show: boolean) => setOpenModal(show ? 'hubspot' : null)
  const setShowMailchimpAccountSelector = (show: boolean) => setOpenModal(show ? 'mailchimp' : null)
  const setShowFacebookPageSelector = (show: boolean) => setOpenModal(show ? 'facebook' : null)
  const setShowGA4PropertySelector = (show: boolean) => setOpenModal(show ? 'ga4' : null)
  const setShowLinkedInAccountSelector = (show: boolean) =>
    setOpenModal(show ? 'linkedin_ads' : null)
  const setShowAirtableBaseSelector = (show: boolean) => setOpenModal(show ? 'airtable' : null)

  // Build integrations list from platformStatus - memoized to prevent unnecessary recalculations
  const integrations = useMemo((): Integration[] => {
    if (!platformStatus) return []

    const data = [
      {
        id: 'google',
        name: 'Google Ads',
        description: 'Advertising campaigns',
        icon: '/icons/google-ads.svg',
        connected: platformStatus.google?.connected || false,
        linked: platformStatus.google?.linked ?? platformStatus.google?.connected ?? false,
        lastSync: platformStatus.google?.connected
          ? getTimeAgo(platformStatus.google.last_synced)
          : undefined,
        autoSync: platformStatus.google?.connected ? true : undefined,
      },
      {
        id: 'ga4',
        name: 'Google Analytics 4',
        description: 'Website and app analytics',
        icon: '/icons/google_analytics.svg',
        connected: platformStatus.ga4?.connected || false,
        linked: platformStatus.ga4?.linked ?? platformStatus.ga4?.connected ?? false,
        lastSync: platformStatus.ga4?.connected
          ? getTimeAgo(platformStatus.ga4.last_synced)
          : undefined,
        autoSync: platformStatus.ga4?.connected ? true : undefined,
      },
      {
        id: 'meta',
        name: 'Meta Ads',
        description: 'Paid advertising campaigns',
        icon: '/icons/meta-color.svg',
        connected: platformStatus.meta?.connected || false,
        linked: platformStatus.meta?.linked ?? platformStatus.meta?.connected ?? false,
        lastSync: platformStatus.meta?.connected
          ? getTimeAgo(platformStatus.meta.last_synced)
          : undefined,
        autoSync: platformStatus.meta?.connected ? true : undefined,
      },
      {
        id: 'facebook_organic',
        name: 'Facebook',
        description: 'Page posts, engagement & reach',
        icon: '/icons/facebook-48.png',
        connected: platformStatus.facebook_organic?.connected || false,
        linked:
          platformStatus.facebook_organic?.linked ??
          platformStatus.facebook_organic?.connected ??
          false,
        lastSync: platformStatus.facebook_organic?.connected
          ? getTimeAgo(platformStatus.facebook_organic.last_synced)
          : undefined,
        autoSync: platformStatus.facebook_organic?.connected ? true : undefined,
      },
      {
        id: 'brevo',
        name: 'Brevo',
        description: 'Email marketing and campaigns',
        icon: '/icons/brevo.jpeg',
        connected: platformStatus.brevo?.connected || false,
        linked: platformStatus.brevo?.linked ?? platformStatus.brevo?.connected ?? false,
        lastSync: platformStatus.brevo?.connected
          ? getTimeAgo(platformStatus.brevo.last_synced)
          : undefined,
        autoSync: platformStatus.brevo?.connected ? false : undefined,
      },
      {
        id: 'hubspot',
        name: 'HubSpot',
        description: 'CRM and marketing automation',
        icon: '/icons/hubspot.svg',
        connected: platformStatus.hubspot?.connected || false,
        linked: platformStatus.hubspot?.linked ?? platformStatus.hubspot?.connected ?? false,
        lastSync: platformStatus.hubspot?.connected
          ? getTimeAgo(platformStatus.hubspot.last_synced)
          : undefined,
        autoSync: platformStatus.hubspot?.connected ? true : undefined,
      },
      {
        id: 'mailchimp',
        name: 'Mailchimp',
        description: 'Email marketing and campaigns',
        icon: '/icons/radio buttons/mailchimp.png',
        connected: platformStatus.mailchimp?.connected || false,
        linked: platformStatus.mailchimp?.linked ?? platformStatus.mailchimp?.connected ?? false,
        lastSync: platformStatus.mailchimp?.connected
          ? getTimeAgo(platformStatus.mailchimp.last_synced)
          : undefined,
        autoSync: platformStatus.mailchimp?.connected ? true : undefined,
      },
      {
        id: 'linkedin_ads',
        name: 'LinkedIn Ads',
        description: 'B2B advertising and lead generation',
        icon: '/icons/linkedin.svg',
        connected: platformStatus.linkedin_ads?.connected || false,
        linked:
          platformStatus.linkedin_ads?.linked ?? platformStatus.linkedin_ads?.connected ?? false,
        lastSync: platformStatus.linkedin_ads?.connected
          ? getTimeAgo(platformStatus.linkedin_ads.last_synced)
          : undefined,
        autoSync: platformStatus.linkedin_ads?.connected ? true : undefined,
      },
      {
        id: 'airtable',
        name: 'Airtable',
        description: 'Content calendar & UTM tracking',
        icon: '/icons/Airtable.png',
        connected: platformStatus.airtable?.connected || false,
        linked: platformStatus.airtable?.linked ?? platformStatus.airtable?.connected ?? false,
        lastSync: platformStatus.airtable?.connected
          ? getTimeAgo(platformStatus.airtable.last_synced)
          : undefined,
        autoSync: platformStatus.airtable?.connected ? true : undefined,
      },
      {
        id: 'tiktok',
        name: 'TikTok Ads',
        description: 'Short-form video advertising',
        icon: '/icons/tiktok.svg',
        connected: false,
        linked: false,
      },
    ]

    return data
  }, [platformStatus, getTimeAgo])

  // Handle Brevo API Key Submission
  const handleBrevoSubmit = async () => {
    if (!brevoApiKey.trim()) {
      setBrevoError('Please enter an API key')
      return
    }

    if (!selectedAccount) {
      setBrevoError('No account selected. Please select an account first.')
      return
    }

    setBrevoSubmitting(true)
    setBrevoError('')

    try {
      logger.log('[Brevo] Submitting API key for account:', selectedAccount.name)

      // Use the NEW per-account endpoint (Nov 16 fix)
      const response = await apiFetch('/api/oauth/brevo/save-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: brevoApiKey.trim(),
          session_id: sessionId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to save API key')
      }

      const data = await response.json()
      logger.log('[Brevo] API key saved successfully:', data)

      // Close modal and refresh connections
      setShowBrevoModal(false)
      setBrevoApiKey('')
      invalidateIntegrationStatus()
      // CRITICAL FIX (Feb 2026): Refresh workspaces to update connected_platforms for main page toggles
      refreshWorkspaces().catch((err) =>
        logger.error('[INTEGRATIONS] Failed to refresh workspaces after Brevo connect:', err)
      )
    } catch (error) {
      logger.error('[Brevo] API key submission error:', error)
      setBrevoError(error instanceof Error ? error.message : 'Failed to save API key')
    } finally {
      setBrevoSubmitting(false)
    }
  }

  // Handle Brevo Unlink
  const handleBrevoUnlink = async () => {
    setBrevoSubmitting(true)
    setBrevoError('')

    try {
      const response = await apiFetch('/api/oauth/brevo/disconnect', {
        method: 'DELETE',
        headers: createSessionHeaders(sessionId),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to disconnect Brevo')
      }

      logger.log('[Brevo] Disconnected successfully')

      // Close modal and refresh connections
      setShowBrevoModal(false)
      invalidateIntegrationStatus()
      // CRITICAL FIX (Feb 2026): Refresh workspaces to update connected_platforms for main page toggles
      refreshWorkspaces().catch((err) =>
        logger.error('[INTEGRATIONS] Failed to refresh workspaces after Brevo disconnect:', err)
      )
    } catch (error) {
      logger.error('[Brevo] Unlink error:', error)
      setBrevoError(error instanceof Error ? error.message : 'Failed to disconnect Brevo')
    } finally {
      setBrevoSubmitting(false)
    }
  }

  const handleConnect = async (integrationId: string) => {
    // Jan 2025: Role-based access control - only owners and admins can manage integrations
    if (activeWorkspace && !['owner', 'admin'].includes(activeWorkspace.role)) {
      showToast('warning', 'Only workspace owners and admins can manage integrations')
      return
    }

    // GA4: Check if workspace already has Google OAuth credentials
    // If yes → open property selector directly. If no → run Google OAuth first.
    if (integrationId === 'ga4') {
      if (activeWorkspace?.tenant_id) {
        try {
          const tenantResponse = await apiFetch(
            `/api/tenants/${activeWorkspace.tenant_id}/integrations`,
            {
              headers: { 'X-Session-ID': sessionId || '' },
            }
          )
          if (tenantResponse.ok) {
            const tenantData = await tenantResponse.json()
            const ps = tenantData.platform_status || {}
            if (ps.google_ads || ps.ga4) {
              // Google OAuth exists → open GA4 property selector directly
              setShowGA4PropertySelector(true)
              return
            }
          }
        } catch {
          /* fall through to OAuth */
        }
      }
      // No Google OAuth for this workspace → run Google OAuth redirect
      // After redirect, auto-open GA4 property selector (not Google Ads selector)
      setConnectingId('ga4')
      const tenantParam = activeWorkspace?.tenant_id ? `tenant_id=${activeWorkspace.tenant_id}` : ''
      const returnUrl = window.location.origin + '/integrations'
      const frontendOrigin = encodeURIComponent(returnUrl)
      const googleParams = [tenantParam, `frontend_origin=${frontendOrigin}`]
        .filter(Boolean)
        .join('&')
      try {
        const response = await apiFetch(`/api/oauth/google/auth-url?${googleParams}`, {
          headers: { 'X-Session-ID': sessionId || '' },
        })
        if (response.ok) {
          const data = await response.json()
          localStorage.setItem(StorageKey.OAUTH_PENDING, 'google')
          localStorage.setItem(StorageKey.OAUTH_RETURN_URL, returnUrl)
          localStorage.setItem(StorageKey.GA4_CONNECT_PENDING, 'true')
          window.location.href = data.auth_url
          return
        }
      } catch (err) {
        logger.error('[GA4-CONNECT] Failed to get auth URL:', err)
      }
      setConnectingId(null)
      return
    }

    // Brevo uses API key (not OAuth) - show modal instead
    if (integrationId === 'brevo') {
      setShowBrevoModal(true)
      setBrevoError('')
      setBrevoApiKey('')
      return
    }

    // MAR 2026: If workspace already has OAuth credentials for this platform,
    // skip the OAuth popup and go straight to the account/page selector.
    // This handles switching clients — they've already authed, just need to pick the sub-account.

    // Meta Ads / Facebook Organic: check actual credential existence (not tenant_integrations,
    // which can be stale). Only show selector if token is actually present in the DB.
    if (integrationId === 'meta' || integrationId === 'facebook_organic') {
      try {
        const metaCredsResponse = await apiFetch('/api/oauth/meta/credentials-status', {
          headers: createSessionHeaders(sessionId),
        })
        if (metaCredsResponse.ok) {
          const metaCredsData = await metaCredsResponse.json()
          if (metaCredsData.has_credentials) {
            if (integrationId === 'meta') {
              setShowMetaAccountSelector(true)
            } else {
              setShowFacebookPageSelector(true)
            }
            return
          }
        }
      } catch (error) {
        logger.error('[META] Error checking Meta credentials:', error)
      }
      logger.log(`[META] No Meta credentials found, starting OAuth flow for ${integrationId}`)
    }

    setConnectingId(integrationId)

    try {
      logger.log(`Connecting to ${integrationId} with sessionId:`, sessionId)

      let authUrl: string | null = null

      // Get auth URL based on platform
      // Jan 2025: Include tenant_id for workspace-scoped credential storage
      // CRITICAL FIX (Feb 2026): Do NOT pass frontend_origin for popup flow
      // Passing frontend_origin causes backend to REDIRECT instead of CLOSE the popup
      // This page uses popup flow - the popup should close and we handle /complete ourselves
      const tenantParam = activeWorkspace?.tenant_id ? `tenant_id=${activeWorkspace.tenant_id}` : ''

      // CRITICAL FIX (Jan 2026): Send X-Session-ID as header, not query param
      // Backend OAuth endpoints expect session ID in header for workspace integration
      const authHeaders = {
        'X-Session-ID': sessionId || '',
      }

      if (integrationId === 'google') {
        // Google OAuth uses REDIRECT flow (same as initial login), not popup.
        // Popup flow fails because the popup loads the full app.
        // Redirect flow: set OAUTH_PENDING, redirect entire page to Google,
        // callback redirects back to integrations page, app detects OAUTH_PENDING and completes.
        const returnUrl = window.location.origin + '/integrations'
        const frontendOrigin = encodeURIComponent(returnUrl)
        const googleParams = [tenantParam, `frontend_origin=${frontendOrigin}`]
          .filter(Boolean)
          .join('&')
        const response = await apiFetch(`/api/oauth/google/auth-url?${googleParams}`, {
          headers: authHeaders,
        })
        if (response.ok) {
          const data = await response.json()
          // Use redirect flow — same pattern as session-context.tsx login()
          localStorage.setItem(StorageKey.OAUTH_PENDING, 'google')
          localStorage.setItem(StorageKey.OAUTH_RETURN_URL, returnUrl)
          localStorage.setItem(StorageKey.GOOGLE_ADS_CONNECT_PENDING, 'true')
          window.location.href = data.auth_url
          return // Page will redirect, no need for popup logic
        }
        throw new Error('Failed to get Google auth URL')
      } else if (integrationId === 'meta' || integrationId === 'facebook_organic') {
        // Both Meta Ads and Facebook Organic use the same Meta OAuth flow
        // No frontend_origin - popup should close, not redirect
        const response = await apiFetch(
          `/api/oauth/meta/auth-url${tenantParam ? '?' + tenantParam : ''}`,
          { headers: authHeaders }
        )
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      } else if (integrationId === 'hubspot') {
        const response = await apiFetch(
          `/api/oauth/hubspot/auth-url${tenantParam ? '?' + tenantParam : ''}`,
          { headers: authHeaders }
        )
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      } else if (integrationId === 'mailchimp') {
        const response = await apiFetch(
          `/api/oauth/mailchimp/auth-url${tenantParam ? '?' + tenantParam : ''}`,
          { headers: authHeaders }
        )
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      } else if (integrationId === 'linkedin_ads') {
        const response = await apiFetch(
          `/api/oauth/linkedin/auth-url${tenantParam ? '?' + tenantParam : ''}`,
          { headers: authHeaders }
        )
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      } else if (integrationId === 'airtable') {
        const response = await apiFetch(
          `/api/oauth/airtable/auth-url${tenantParam ? '?' + tenantParam : ''}`,
          { headers: authHeaders }
        )
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      }

      if (!authUrl) {
        throw new Error(`Failed to get ${integrationId} auth URL`)
      }

      // SECURITY FIX (Feb 2026): Listen for postMessage from OAuth popup to get user_id
      // This prevents cross-user data leaks when multiple users auth simultaneously
      let oauthUserId: string | null = null

      const messageHandler = (event: MessageEvent) => {
        // Verify origin for security
        if (event.data?.type === 'oauth_complete') {
          oauthUserId = event.data.user_id || null
          logger.log(`[OAUTH-POPUP] Received user_id from popup: ${oauthUserId}`)
        }
      }
      window.addEventListener('message', messageHandler)

      // Open popup for OAuth (Meta, HubSpot, LinkedIn, Mailchimp — NOT Google)
      const popup = window.open(
        authUrl,
        `${integrationId}-oauth`,
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        window.removeEventListener('message', messageHandler)
        showToast('error', 'Popup blocked. Please allow popups for this site.')
        setConnectingId(null)
        return
      }

      // Poll for popup close
      if (oauthPollTimerRef.current) {
        window.clearInterval(oauthPollTimerRef.current)
        oauthPollTimerRef.current = null
      }

      oauthPollTimerRef.current = window.setInterval(async () => {
        if (popup.closed) {
          if (oauthPollTimerRef.current) {
            window.clearInterval(oauthPollTimerRef.current)
            oauthPollTimerRef.current = null
          }
          // Clean up message listener
          window.removeEventListener('message', messageHandler)

          // Always clear OAUTH_PENDING when popup closes — prevents main app from
          // trying to complete auth on next page load if popup failed
          localStorage.removeItem(StorageKey.OAUTH_PENDING)

          logger.log(`${integrationId} popup closed, completing auth flow...`)
          logger.log(`[OAUTH-COMPLETE] user_id from popup: ${oauthUserId}`)

          // For Meta/Google/Facebook Organic OAuth, call /complete endpoint to link credentials
          if (
            integrationId === 'meta' ||
            integrationId === 'google' ||
            integrationId === 'facebook_organic'
          ) {
            try {
              // Facebook Organic and Meta Ads use the same Meta OAuth endpoint
              // SECURITY FIX: Include user_id from postMessage to prevent cross-user issues
              const completeUrl =
                integrationId === 'meta' || integrationId === 'facebook_organic'
                  ? `/api/oauth/meta/complete`
                  : oauthUserId
                    ? `/api/oauth/google/complete?user_id=${oauthUserId}`
                    : `/api/oauth/google/complete`

              logger.log(`Calling ${completeUrl} with session_id:`, sessionId)

              const completeResponse = await apiFetch(completeUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Session-ID': sessionId || '',
                },
                body: JSON.stringify({ session_id: sessionId }),
              })

              if (!completeResponse.ok) {
                const errorText = await completeResponse.text()
                logger.error(`${integrationId} /complete failed:`, errorText)
                showToast('error', `Connection failed. Please try again.`)
              } else {
                const completeData = await completeResponse.json()
                logger.log(`${integrationId} /complete succeeded:`, completeData)

                // For Meta Ads, show the account selector after OAuth completes
                // User must select which Meta ad account to link to this Google Ads account
                if (integrationId === 'meta' && completeData.success) {
                  logger.log(
                    '[META-OAUTH] Meta OAuth complete - refetching integration status then showing Meta account selector'
                  )
                  // Await the refetch so currentAccountData is guaranteed fresh before
                  // the selector opens and runs its pre-selection logic.
                  // This prevents stale meta_ads_id from a previous workspace being pre-selected.
                  await refetchIntegrationStatus()
                  setShowMetaAccountSelector(true)
                }

                // For Facebook Organic, show the Facebook page selector after OAuth completes
                if (integrationId === 'facebook_organic' && completeData.success) {
                  logger.log(
                    '[FB-ORGANIC] Meta OAuth complete - now showing Facebook page selector'
                  )
                  // Show Facebook page selector after a brief delay for cache invalidation
                  setTimeout(() => setShowFacebookPageSelector(true), 500)
                }
              }
            } catch (error) {
              logger.error(`${integrationId} /complete error:`, error)
            }
          }

          // For LinkedIn, show account selector after OAuth completes
          if (integrationId === 'linkedin_ads') {
            logger.log('[LINKEDIN-OAUTH] OAuth complete - showing account selector')
            setTimeout(() => setShowLinkedInAccountSelector(true), 500)
          }

          // For Airtable, show base selector after OAuth completes
          if (integrationId === 'airtable') {
            logger.log('[AIRTABLE-OAUTH] OAuth complete - showing base selector')
            setTimeout(() => setShowAirtableBaseSelector(true), 500)
          }

          // Refresh integration status AND workspace list
          // CRITICAL FIX (Jan 2026): Refresh workspaces to update connected_platforms for main page icons
          logger.log('[INTEGRATIONS] Invalidating integration status cache after OAuth complete')
          invalidateIntegrationStatus()
          refreshWorkspaces().catch((err) =>
            logger.error('[INTEGRATIONS] Failed to refresh workspaces:', err)
          )

          setConnectingId(null)
        }
      }, 500)
    } catch (error) {
      logger.error(`${integrationId} connection error:`, error)
      showToast(
        'error',
        `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      setConnectingId(null)
    }
  }

  // Only owners and admins can manage integrations in a workspace.
  // No workspace (personal context) → allow. Workspace with unknown role → deny (fail-closed).
  const canManageIntegrations =
    !activeWorkspace || ['owner', 'admin'].includes(activeWorkspace.role)

  const connectedSources = integrations.filter((i) => i.connected)
  const availableSources = integrations.filter((i) => !i.connected)

  const autoSyncCount = connectedSources.filter((s) => s.autoSync).length

  return (
    <>
      <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
        {/* Header */}
        <TopBar title="Integrations" onBack={onBack} className="border-b border-tertiary" />

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
          {/* Loading State */}
          {loading && integrations.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {/* Connected Sources Section */}
          {!loading && connectedSources.length > 0 && (
            <div className="mb-6 max-w-3xl mx-auto w-full">
              <div className="mb-4">
                <h2 className="label-md text-primary">{connectedSources.length} Sources</h2>
                <p className="paragraph-xs text-quaternary">
                  Connect your data sources to unlock powerful new insights
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-success-secondary rounded-lg mx-auto mb-1">
                    <img src="/icons/checkmark-circle-outline.svg" alt="" className="w-4 h-4" />
                  </div>
                  <p className="paragraph-xs text-quaternary">Connected</p>
                  <p className="label-sm text-primary">{connectedSources.length}</p>
                </div>

                <div className="bg-secondary rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-success-secondary rounded-lg mx-auto mb-1">
                    <img src="/icons/autosync.svg" alt="" className="w-4 h-4" />
                  </div>
                  <p className="paragraph-xs text-quaternary">Auto-Sync</p>
                  <p className="label-sm text-primary">{autoSyncCount}</p>
                </div>
              </div>

              {/* Connected Platforms List */}
              <div className="space-y-2">
                {connectedSources.map((integration) => {
                  const handleCardClick = undefined

                  return (
                    <div key={integration.id} className="w-full">
                      <div
                        className={`w-full text-left transition-all bg-primary border-2 rounded-xl p-3 overflow-hidden cursor-pointer hover:border-brand-alt ${
                          loading ? 'opacity-50 pointer-events-none' : ''
                        } ${highlightedIds.includes(integration.id) ? 'border-brand ring-2 ring-brand ring-offset-2 animate-pulse' : 'border-secondary'}`}
                        onClick={handleCardClick}
                      >
                        <div className="flex items-center  gap-3">
                          <div className="w-10 h-10 flex items-center justify-center shrink-0">
                            <img
                              src={integration.icon}
                              alt=""
                              className="w-10 h-10"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <h3 className="subheading-md text-primary truncate">
                                {integration.name}
                              </h3>
                            </div>
                            <div className="paragraph-xs text-quaternary truncate flex items-center gap-1">
                              <p className="paragraph-xs text-quaternary truncate">
                                {integration.description}
                              </p>
                              {integration.lastSync && (
                                <span> • Last synced: {integration.lastSync}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            {/* Platform Gear Menu - unified dropdown for all platforms */}
                            <PlatformGearMenu
                              platformId={integration.id}
                              platformName={integration.name}
                              isConnected={integration.connected}
                              sessionId={sessionId}
                              userRole={activeWorkspace?.role}
                              onManage={() => {
                                // Open the appropriate selector/connect modal
                                if (integration.id === 'google') setShowGoogleAccountSelector(true)
                                else if (integration.id === 'ga4') setShowGA4PropertySelector(true)
                                else if (integration.id === 'meta') setShowMetaAccountSelector(true)
                                else if (integration.id === 'facebook_organic')
                                  setShowFacebookPageSelector(true)
                                else if (integration.id === 'brevo') {
                                  // If linked, show account selector; if not linked, show connect modal
                                  if (integration.linked) setShowBrevoAccountSelector(true)
                                  else {
                                    setShowBrevoModal(true)
                                    setBrevoError('')
                                    setBrevoApiKey('')
                                  }
                                } else if (integration.id === 'hubspot')
                                  setShowHubSpotAccountSelector(true)
                                else if (integration.id === 'mailchimp')
                                  setShowMailchimpAccountSelector(true)
                                else if (integration.id === 'linkedin_ads')
                                  setShowLinkedInAccountSelector(true)
                                else if (integration.id === 'airtable')
                                  setShowAirtableBaseSelector(true)
                              }}
                              onReconnect={
                                // OAuth platforms can reconnect to refresh credentials / link to workspace
                                [
                                  'google',
                                  'meta',
                                  'ga4',
                                  'hubspot',
                                  'mailchimp',
                                  'linkedin_ads',
                                  'airtable',
                                ].includes(integration.id)
                                  ? () => handleConnect(integration.id)
                                  : undefined
                              }
                              onAddAccount={
                                ['brevo', 'hubspot', 'mailchimp'].includes(integration.id)
                                  ? () => {
                                      if (integration.id === 'brevo') setShowBrevoModal(true)
                                      else if (integration.id === 'hubspot')
                                        handleConnect('hubspot')
                                      else if (integration.id === 'mailchimp')
                                        handleConnect('mailchimp')
                                    }
                                  : undefined
                              }
                              onDisconnectSuccess={() => {
                                invalidateIntegrationStatus()
                                refreshWorkspaces().catch((err) =>
                                  logger.error('[INTEGRATIONS] Failed to refresh workspaces:', err)
                                )
                                refreshAccounts().catch((err) =>
                                  logger.error('[INTEGRATIONS] Failed to refresh accounts:', err)
                                )
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Available Integrations Section - hidden for viewer/analyst roles */}
          {!loading && availableSources.length > 0 && canManageIntegrations && (
            <div className="mb-6 max-w-3xl mx-auto w-full">
              <h2 className="label-md text-primary mb-1">Available Integrations</h2>
              <p className="paragraph-xs text-quaternary mb-4">
                Connect your data sources to unlock powerful new insights
              </p>

              <div className="space-y-2">
                {availableSources.map((integration) => (
                  <div
                    key={integration.id}
                    className={`bg-primary border rounded-xl p-3 overflow-hidden ${highlightedIds.includes(integration.id) ? 'border-brand ring-2 ring-brand ring-offset-2 animate-pulse' : 'border-secondary'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0">
                          <img
                            src={integration.icon}
                            alt=""
                            className="w-10 h-10 opacity-60"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <h3 className="subheading-md text-primary truncate">
                            {integration.name}
                          </h3>
                          <p className="paragraph-xs text-quaternary truncate">
                            {integration.description}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleConnect(integration.id)}
                        disabled={connectingId !== null || ['tiktok'].includes(integration.id)}
                        className={`px-4 py-2 rounded-lg subheading-sm shrink-0 ${
                          ['tiktok'].includes(integration.id)
                            ? 'bg-tertiary text-placeholder-subtle cursor-not-allowed'
                            : connectingId === integration.id
                              ? 'bg-secondary-solid text-primary-onbrand cursor-wait'
                              : 'bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover'
                        }`}
                      >
                        {['tiktok'].includes(integration.id)
                          ? 'Soon'
                          : connectingId === integration.id
                            ? 'Connecting...'
                            : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Brevo API Key Modal */}
        {showBrevoModal && (
          <div className="fixed inset-0 bg-overlay/40 flex items-center justify-center z-50 px-4">
            <div className="bg-primary rounded-2xl p-6 max-w-md w-full shadow-xl">
              {/* Header */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <img src="/icons/brevo.jpeg" alt="Brevo" className="w-10 h-10" />
                  <h2 className="title-h6 text-primary">
                    {currentAccountData?.brevo_api_key
                      ? 'Manage Brevo Connection'
                      : 'Connect Brevo'}
                  </h2>
                </div>
                <p className="paragraph-sm text-tertiary">
                  {currentAccountData?.brevo_api_key
                    ? `Connected to ${currentAccountData.brevo_account_name || 'your Brevo account'} for ${selectedAccount?.name || 'this account'}`
                    : `Enter your Brevo API key to connect email marketing for ${selectedAccount?.name || 'this account'}.`}
                </p>
              </div>

              {/* Instructions - only show when NOT connected */}
              {!currentAccountData?.brevo_api_key && (
                <div className="bg-utility-info-100 border border-utility-info-300 rounded-lg p-4 mb-4">
                  <h3 className="subheading-md text-utility-info-700 mb-2">
                    How to get your API key:
                  </h3>
                  <ol className="paragraph-xs text-utility-info-700 space-y-1 list-decimal list-inside">
                    <li>Log in to your Brevo account</li>
                    <li>Go to Settings → SMTP & API → API Keys</li>
                    <li>Click "Generate a new API key"</li>
                    <li>Copy the key and paste it below</li>
                  </ol>
                  <a
                    href={EXTERNAL_URLS.BREVO_API_KEYS}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 subheading-sm text-utility-info-600 hover:text-utility-info-700"
                  >
                    Open Brevo API Settings
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                  <p className="mt-3 paragraph-xs text-utility-info-700">
                    <strong>Important:</strong> If your Brevo account has IP blocking enabled, you
                    must deactivate it before connecting.{' '}
                    <a
                      href="https://app.brevo.com/security/authorised_ips"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Deactivate IP blocking →
                    </a>
                  </p>
                </div>
              )}

              {/* API Key Input - only show when NOT connected */}
              {!currentAccountData?.brevo_api_key && (
                <div className="mb-4">
                  <label className="block subheading-md text-secondary mb-2">API Key</label>
                  <input
                    type="text"
                    value={brevoApiKey}
                    onChange={(e) => setBrevoApiKey(e.target.value)}
                    placeholder="xkeysib-..."
                    className="w-full px-4 py-3 border border-primary rounded-lg focus:ring-2 focus:ring-utility-info-500 focus:border-transparent paragraph-sm font-mono"
                    disabled={brevoSubmitting}
                  />
                  {brevoError && (
                    <p className="mt-2 paragraph-xs text-error">
                      {brevoError.split(/(https?:\/\/[^\s]+)/).map((part, i) =>
                        part.match(/^https?:\/\//) ? (
                          <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {part}
                          </a>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Connected Account Display - show when connected */}
              {currentAccountData?.brevo_api_key && (
                <div className="mb-4 space-y-3">
                  {/* Account Name */}
                  {currentAccountData.brevo_account_name && (
                    <div className="bg-success-primary border border-utility-success-300 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-success"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div>
                          <p className="subheading-md text-success">
                            {currentAccountData.brevo_account_name}
                          </p>
                          <p className="paragraph-xs text-success">Connected Brevo account</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Masked API Key */}
                  <div>
                    <label className="block subheading-md text-secondary mb-2">API Key</label>
                    <div className="w-full px-4 py-3 border border-primary rounded-lg bg-secondary paragraph-sm font-mono text-tertiary">
                      {currentAccountData.brevo_api_key.substring(0, 10)}...
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBrevoModal(false)
                    setBrevoApiKey('')
                    setBrevoError('')
                  }}
                  disabled={brevoSubmitting}
                  className="flex-1 px-4 py-3 border border-primary rounded-lg subheading-md text-secondary hover:bg-secondary disabled:opacity-50"
                >
                  {currentAccountData?.brevo_api_key ? 'Close' : 'Cancel'}
                </button>
                {currentAccountData?.brevo_api_key ? (
                  <button
                    onClick={() => setShowBrevoUnlinkConfirm(true)}
                    disabled={brevoSubmitting}
                    className="flex-1 px-4 py-3 bg-error-solid text-primary-onbrand rounded-lg subheading-md hover:bg-error-solid-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {brevoSubmitting ? 'Unlinking...' : 'Unlink'}
                  </button>
                ) : (
                  <button
                    onClick={handleBrevoSubmit}
                    disabled={brevoSubmitting || !brevoApiKey.trim()}
                    className="flex-1 px-4 py-3 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {brevoSubmitting ? 'Connecting...' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Google Account Selector Modal */}
        <GoogleAccountSelector
          isOpen={showGoogleAccountSelector}
          onClose={() => setShowGoogleAccountSelector(false)}
          onSuccess={async () => {
            logger.log('[GOOGLE-ACCOUNT-SELECTOR] Account switched successfully')
            setShowGoogleAccountSelector(false)
            invalidateIntegrationStatus()
            refreshWorkspaces().catch((err) =>
              logger.error('[INTEGRATIONS] Failed to refresh workspaces:', err)
            )
            await refreshAccounts()
          }}
        />

        {/* Meta Account Selector Modal */}
        <MetaAccountSelector
          isOpen={showMetaAccountSelector}
          onClose={() => setShowMetaAccountSelector(false)}
          onSuccess={async () => {
            logger.log('[META-ACCOUNT-SELECTOR] Account linked successfully')
            setShowMetaAccountSelector(false)
            invalidateIntegrationStatus()
            refreshWorkspaces().catch((err) =>
              logger.error('[INTEGRATIONS] Failed to refresh workspaces:', err)
            )
            await refreshAccounts()
          }}
          currentGoogleAccountName={activeWorkspace?.name}
          currentAccountData={currentAccountData}
        />

        {/* Brevo Account Selector Modal */}
        <BrevoAccountSelector
          isOpen={showBrevoAccountSelector}
          onClose={() => setShowBrevoAccountSelector(false)}
          onSuccess={async () => {
            logger.log('[BREVO-ACCOUNT-SELECTOR] Account switched successfully')
            setShowBrevoAccountSelector(false)
            invalidateIntegrationStatus()
            refreshWorkspaces().catch((err) =>
              logger.error('[INTEGRATIONS] Failed to refresh workspaces:', err)
            )
            await refreshAccounts()
          }}
        />

        {/* HubSpot Account Selector Modal */}
        <HubSpotAccountSelector
          isOpen={showHubSpotAccountSelector}
          onClose={() => setShowHubSpotAccountSelector(false)}
          onSuccess={async () => {
            logger.log('[HUBSPOT-ACCOUNT-SELECTOR] Portal switched successfully')
            setShowHubSpotAccountSelector(false)
            invalidateIntegrationStatus()
            refreshWorkspaces().catch((err) =>
              logger.error('[INTEGRATIONS] Failed to refresh workspaces:', err)
            )
            await refreshAccounts()
          }}
        />

        {/* Mailchimp Account Selector Modal */}
        <MailchimpAccountSelector
          isOpen={showMailchimpAccountSelector}
          onClose={() => setShowMailchimpAccountSelector(false)}
          onSuccess={async () => {
            logger.log('[MAILCHIMP-ACCOUNT-SELECTOR] Account switched successfully')
            setShowMailchimpAccountSelector(false)
            invalidateIntegrationStatus()
            refreshWorkspaces().catch((err) =>
              logger.error('[INTEGRATIONS] Failed to refresh workspaces:', err)
            )
            await refreshAccounts()
          }}
        />

        {/* Facebook Page Selector Modal */}
        <FacebookPageSelector
          isOpen={showFacebookPageSelector}
          onClose={() => setShowFacebookPageSelector(false)}
          onSuccess={async () => {
            logger.log('[FACEBOOK-PAGE-SELECTOR] Page linked successfully')
            setShowFacebookPageSelector(false)
            invalidateIntegrationStatus()
            refreshWorkspaces().catch((err) =>
              logger.error('[INTEGRATIONS] Failed to refresh workspaces:', err)
            )
            await refreshAccounts()
          }}
          currentAccountName={activeWorkspace?.name ?? selectedAccount?.name}
          currentAccountData={currentAccountData}
        />

        {/* GA4 Property Selector Modal */}
        <GA4PropertySelector
          isOpen={showGA4PropertySelector}
          onClose={() => setShowGA4PropertySelector(false)}
          onSuccess={async () => {
            logger.log('[GA4-PROPERTY-SELECTOR] Property linked successfully')
            setShowGA4PropertySelector(false)
            invalidateIntegrationStatus()
            refreshWorkspaces().catch((err) =>
              logger.error('[INTEGRATIONS] Failed to refresh workspaces:', err)
            )
            await refreshAccounts()
          }}
          currentAccountName={activeWorkspace?.name ?? selectedAccount?.name}
          ga4Properties={ga4Properties}
          linkedProperties={linkedGA4Properties}
        />

        {/* LinkedIn Account Selector Modal */}
        <LinkedInAccountSelector
          isOpen={showLinkedInAccountSelector}
          onClose={() => setShowLinkedInAccountSelector(false)}
          onSuccess={async () => {
            logger.log('[LINKEDIN-ACCOUNT-SELECTOR] Account linked successfully')
            setShowLinkedInAccountSelector(false)
            invalidateIntegrationStatus()
            refreshWorkspaces().catch((err) =>
              logger.error('[INTEGRATIONS] Failed to refresh workspaces:', err)
            )
            await refreshAccounts()
          }}
          currentAccountData={currentAccountData}
        />
        <AirtableBaseSelector
          isOpen={showAirtableBaseSelector}
          onClose={() => setShowAirtableBaseSelector(false)}
          onSuccess={async () => {
            logger.log('[AIRTABLE-BASE-SELECTOR] Base selected successfully')
            setShowAirtableBaseSelector(false)
            invalidateIntegrationStatus()
            refreshWorkspaces().catch((err) =>
              logger.error('[INTEGRATIONS] Failed to refresh workspaces:', err)
            )
            await refreshAccounts()
          }}
        />
      </div>
      <ConfirmDialog
        isOpen={showBrevoUnlinkConfirm}
        message={`Disconnect Brevo from ${selectedAccount?.name || 'this account'}?`}
        confirmLabel="Disconnect"
        onConfirm={() => {
          setShowBrevoUnlinkConfirm(false)
          handleBrevoUnlink()
        }}
        onCancel={() => setShowBrevoUnlinkConfirm(false)}
      />
    </>
  )
}

export default IntegrationsPage
