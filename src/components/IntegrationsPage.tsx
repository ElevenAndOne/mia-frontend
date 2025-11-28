import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../contexts/SessionContext'
import { apiFetch } from '../utils/api'
import MetaAccountSelector from './MetaAccountSelector'
import FacebookPageSelector from './FacebookPageSelector'
import GA4PropertySelector from './GA4PropertySelector'
import GoogleAccountSelector from './GoogleAccountSelector'
import BrevoAccountSelector from './BrevoAccountSelector'
import HubSpotAccountSelector from './HubSpotAccountSelector'
import MailchimpAccountSelector from './MailchimpAccountSelector'

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  dataPoints?: number
  lastSync?: string
  autoSync?: boolean
}

interface PlatformStatus {
  google: {
    connected: boolean
    linked: boolean
    last_synced?: string
  }
  meta: {
    connected: boolean
    linked: boolean
    last_synced?: string
  }
  brevo: {
    connected: boolean
    linked: boolean
    last_synced?: string
  }
  hubspot: {
    connected: boolean
    linked: boolean
    last_synced?: string
  }
  mailchimp: {
    connected: boolean
    linked: boolean
    last_synced?: string
  }
  ga4: {
    connected: boolean
    linked: boolean
    last_synced?: string
  }
}

const IntegrationsPage = ({ onBack }: { onBack: () => void }) => {
  const { sessionId, user, selectedAccount, isAuthenticated, isMetaAuthenticated, refreshAccounts } = useSession()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null)
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const [isCheckingConnections, setIsCheckingConnections] = useState(false)
  const hasInitiallyLoaded = useRef(false)

  // Brevo API Key Modal State
  const [showBrevoModal, setShowBrevoModal] = useState(false)
  const [brevoApiKey, setBrevoApiKey] = useState('')
  const [brevoSubmitting, setBrevoSubmitting] = useState(false)
  const [brevoError, setBrevoError] = useState('')

  // Google Account Selector Modal State
  const [showGoogleAccountSelector, setShowGoogleAccountSelector] = useState(false)

  // Meta Account Selector Modal State
  const [showMetaAccountSelector, setShowMetaAccountSelector] = useState(false)

  // Brevo Account Selector Modal State
  const [showBrevoAccountSelector, setShowBrevoAccountSelector] = useState(false)

  // HubSpot Account Selector Modal State
  const [showHubSpotAccountSelector, setShowHubSpotAccountSelector] = useState(false)

  // Mailchimp Account Selector Modal State
  const [showMailchimpAccountSelector, setShowMailchimpAccountSelector] = useState(false)

  // Facebook Page Selector Modal State
  const [showFacebookPageSelector, setShowFacebookPageSelector] = useState(false)
  const [currentAccountData, setCurrentAccountData] = useState<any>(null)  // Fresh account data

  // GA4 Property Selector Modal State
  const [showGA4PropertySelector, setShowGA4PropertySelector] = useState(false)
  const [ga4Properties, setGa4Properties] = useState<any[]>([])
  const [linkedGA4Properties, setLinkedGA4Properties] = useState<any[]>([])

  // Helper function to calculate "time ago" from ISO timestamp
  const getTimeAgo = (isoTimestamp: string | undefined): string => {
    if (!isoTimestamp) return 'Just now'

    try {
      // Ensure timestamp is treated as UTC by adding 'Z' if not present
      const utcTimestamp = isoTimestamp.endsWith('Z') ? isoTimestamp : isoTimestamp + 'Z'

      const now = new Date()
      const then = new Date(utcTimestamp)
      const diffMs = now.getTime() - then.getTime()
      const diffMins = Math.floor(diffMs / 60000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
      const diffDays = Math.floor(diffHours / 24)
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } catch (e) {
      return 'Just now'
    }
  }

  // Check connection status on load - wait for sessionId to be available
  // Only run ONCE when component mounts and sessionId is available
  useEffect(() => {
    if (sessionId && !hasInitiallyLoaded.current) {
      console.log('[IntegrationsPage] Initial load, fetching connections...')
      hasInitiallyLoaded.current = true
      checkConnections()
    }
  }, [sessionId])

  // Re-check connections when selected account changes
  useEffect(() => {
    if (sessionId && hasInitiallyLoaded.current && selectedAccount) {
      console.log('[IntegrationsPage] Account changed, re-fetching connections for:', selectedAccount.name)
      checkConnections()
    }
  }, [selectedAccount])

  // Rebuild integrations list whenever platformStatus changes (for optimistic updates)
  useEffect(() => {
    if (!platformStatus) return

    console.log('[IntegrationsPage] Platform status changed, rebuilding integrations list')
    const integrationsData: Integration[] = [
      {
        id: 'google',
        name: 'Google Ads',
        description: 'Advertising campaigns',
        icon: '/icons/google-ads.svg',
        connected: platformStatus.google?.connected || false,
        dataPoints: platformStatus.google?.connected ? 15000 : undefined,
        lastSync: platformStatus.google?.connected ? getTimeAgo(platformStatus.google.last_synced) : undefined,
        autoSync: platformStatus.google?.connected ? true : undefined
      },
      {
        id: 'ga4',
        name: 'Google Analytics 4',
        description: 'Website and app analytics',
        icon: '/icons/google_analytics.svg',
        connected: platformStatus.ga4?.connected || false,
        dataPoints: platformStatus.ga4?.connected ? 17587 : undefined,
        lastSync: platformStatus.ga4?.connected ? getTimeAgo(platformStatus.ga4.last_synced) : undefined,
        autoSync: platformStatus.ga4?.connected ? true : undefined
      },
      {
        id: 'meta',
        name: 'Meta',
        description: 'Facebook & Instagram Ads',
        icon: '/icons/meta-color.svg',
        connected: platformStatus.meta?.connected || false,
        dataPoints: platformStatus.meta?.connected ? 8500 : undefined,
        lastSync: platformStatus.meta?.connected ? getTimeAgo(platformStatus.meta.last_synced) : undefined,
        autoSync: platformStatus.meta?.connected ? true : undefined
      },
      {
        id: 'brevo',
        name: 'Brevo',
        description: 'Email marketing and campaigns',
        icon: '/icons/brevo.jpeg',
        connected: platformStatus.brevo?.connected || false,
        dataPoints: platformStatus.brevo?.connected ? 3800 : undefined,
        lastSync: platformStatus.brevo?.connected ? getTimeAgo(platformStatus.brevo.last_synced) : undefined,
        autoSync: platformStatus.brevo?.connected ? false : undefined
      },
      {
        id: 'hubspot',
        name: 'HubSpot',
        description: 'CRM and marketing automation',
        icon: '/icons/hubspot.svg',
        connected: platformStatus.hubspot?.connected || false,
        dataPoints: platformStatus.hubspot?.connected ? 5200 : undefined,
        lastSync: platformStatus.hubspot?.connected ? getTimeAgo(platformStatus.hubspot.last_synced) : undefined,
        autoSync: platformStatus.hubspot?.connected ? true : undefined
      },
      {
        id: 'mailchimp',
        name: 'Mailchimp',
        description: 'Email marketing and campaigns',
        icon: '/icons/mailchimp.png',
        connected: platformStatus.mailchimp?.connected || false,
        dataPoints: platformStatus.mailchimp?.connected ? 4500 : undefined,
        lastSync: platformStatus.mailchimp?.connected ? getTimeAgo(platformStatus.mailchimp.last_synced) : undefined,
        autoSync: platformStatus.mailchimp?.connected ? true : undefined
      },
      {
        id: 'linkedin',
        name: 'LinkedIn Ads',
        description: 'B2B advertising and lead generation',
        icon: '/icons/linkedin.svg',
        connected: false
      },
      {
        id: 'tiktok',
        name: 'TikTok Ads',
        description: 'Short-form video advertising',
        icon: '/icons/tiktok.svg',
        connected: false
      },
    ]
    setIntegrations(integrationsData)
  }, [platformStatus])

  const checkConnections = async () => {
    // Prevent duplicate concurrent calls
    if (isCheckingConnections) {
      console.log('[IntegrationsPage] Already checking connections, skipping...')
      return
    }

    setIsCheckingConnections(true)
    try {
      console.log('[IntegrationsPage] Fetching platform status with sessionId:', sessionId)

      // Get available accounts to check what's connected
      const accountsResponse = await apiFetch('/api/accounts/available', {
        headers: {
          'X-Session-ID': sessionId || ''
        }
      })

      // Track account-specific linking (for showing checkmarks)
      let googleLinked = false
      let metaLinked = false
      let ga4Linked = false
      let brevoLinked = false

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json()
        console.log('[IntegrationsPage] Accounts data:', accountsData)

        // Cache GA4 properties for later use
        if (accountsData.ga4_properties) {
          setGa4Properties(accountsData.ga4_properties)
        }

        if (accountsData.accounts && accountsData.accounts.length > 0) {
          // Find the selected account instead of just using first account
          const account = selectedAccount
            ? accountsData.accounts.find((acc: any) => acc.id === selectedAccount.id)
            : accountsData.accounts[0]

          if (account) {
            console.log('[IntegrationsPage] Checking connections for account:', account.name)
            googleLinked = !!account.google_ads_id
            metaLinked = !!account.meta_ads_id
            ga4Linked = !!account.ga4_property_id
            brevoLinked = !!account.brevo_api_key

            // Store account data with facebook_page_id for FacebookPageSelector
            setCurrentAccountData(account)

            // Store linked GA4 properties
            if (account.linked_ga4_properties) {
              setLinkedGA4Properties(account.linked_ga4_properties)
              console.log('[IntegrationsPage] Linked GA4 properties:', account.linked_ga4_properties)
            }
          }
        }
      }

      // Check HubSpot authentication status
      let hubspotConnected = false
      try {
        const hubspotResponse = await apiFetch(`/api/oauth/hubspot/status?session_id=${sessionId}`)
        if (hubspotResponse.ok) {
          const hubspotData = await hubspotResponse.json()
          hubspotConnected = hubspotData.authenticated || false
          console.log('[IntegrationsPage] HubSpot status:', hubspotData)
        }
      } catch (error) {
        console.error('[IntegrationsPage] Error checking HubSpot status:', error)
      }

      // Check Mailchimp authentication status
      let mailchimpConnected = false
      try {
        const mailchimpResponse = await apiFetch(`/api/oauth/mailchimp/status?session_id=${sessionId}`)
        if (mailchimpResponse.ok) {
          const mailchimpData = await mailchimpResponse.json()
          mailchimpConnected = mailchimpData.authenticated || false
          console.log('[IntegrationsPage] Mailchimp status:', mailchimpData)
        }
      } catch (error) {
        console.error('[IntegrationsPage] Error checking Mailchimp status:', error)
      }

      // Check Brevo authentication status
      let brevoConnected = false
      try {
        const brevoResponse = await apiFetch(`/api/oauth/brevo/status?session_id=${sessionId}`)
        if (brevoResponse.ok) {
          const brevoData = await brevoResponse.json()
          brevoConnected = brevoData.authenticated || false
          console.log('[IntegrationsPage] Brevo status:', brevoData)
        }
      } catch (error) {
        console.error('[IntegrationsPage] Error checking Brevo status:', error)
      }

      // CRITICAL FIX (Nov 11): Check if Meta CREDENTIALS actually exist in database
      // Don't rely on isMetaAuthenticated from session (can be stale after DB clear)
      let metaHasCredentials = false
      try {
        const metaCredsResponse = await apiFetch(`/api/oauth/meta/credentials-status?session_id=${sessionId}`)
        if (metaCredsResponse.ok) {
          const metaCredsData = await metaCredsResponse.json()
          metaHasCredentials = metaCredsData.has_credentials || false
          console.log('[IntegrationsPage] Meta credentials status:', metaCredsData)
        }
      } catch (error) {
        console.error('[IntegrationsPage] Error checking Meta credentials:', error)
      }

      // FIXED (Nov 28): Check if Google OAuth is authenticated (not just if they have Google Ads)
      // User-based accounts don't have google_ads_id but ARE authenticated with Google
      let googleHasCredentials = false
      try {
        const googleStatusResponse = await apiFetch(`/api/oauth/google/status`, {
          headers: { 'X-Session-ID': sessionId || '' }
        })
        if (googleStatusResponse.ok) {
          const googleStatusData = await googleStatusResponse.json()
          googleHasCredentials = googleStatusData.authenticated || false
          console.log('[IntegrationsPage] Google auth status:', googleHasCredentials)
        }
      } catch (error) {
        console.error('[IntegrationsPage] Error checking Google auth:', error)
      }

      // Use ACTUAL connection status from account data and API checks
      // FIXED (Nov 26): Check actual data, not stale context
      // FIXED (Nov 28): Google connected = has credentials OR has google_ads_id
      // GA4: connected only if GA4 property is selected for THIS account
      // Meta: connected only if credentials exist in credentials.db
      // FIXED (Nov 27): Use brevoLinked OR brevoConnected for Brevo status
      // brevoLinked = from account data (brevo_api_key field)
      // brevoConnected = from /api/oauth/brevo/status endpoint
      const platforms = {
        google: { connected: googleHasCredentials || googleLinked, linked: googleLinked, last_synced: new Date().toISOString() },
        ga4: { connected: ga4Linked, linked: ga4Linked, last_synced: new Date().toISOString() },
        meta: { connected: metaHasCredentials, linked: metaLinked, last_synced: new Date().toISOString() },
        brevo: { connected: brevoConnected || brevoLinked, linked: brevoLinked, last_synced: new Date().toISOString() },
        hubspot: { connected: hubspotConnected, linked: hubspotConnected, last_synced: new Date().toISOString() },
        mailchimp: { connected: mailchimpConnected, linked: mailchimpConnected, last_synced: new Date().toISOString() }
      }

      console.log('[IntegrationsPage] Computed platform status:', platforms)
      setPlatformStatus(platforms)

        // Build integrations list based on actual connection status
        const integrationsData: Integration[] = [
          // Google Ads
          {
            id: 'google',
            name: 'Google Ads',
            description: 'Advertising campaigns',
            icon: '/icons/google-ads.svg',
            connected: platforms.google?.connected || false,
            dataPoints: platforms.google?.connected ? 15000 : undefined,
            lastSync: platforms.google?.connected ? getTimeAgo(platforms.google.last_synced) : undefined,
            autoSync: platforms.google?.connected ? true : undefined
          },
          // GA4 (separate from Google Ads)
          {
            id: 'ga4',
            name: 'Google Analytics 4',
            description: 'Website and app analytics',
            icon: '/icons/google_analytics.svg',
            connected: platforms.ga4?.connected || false,
            dataPoints: platforms.ga4?.connected ? 17587 : undefined,
            lastSync: platforms.ga4?.connected ? getTimeAgo(platforms.ga4.last_synced) : undefined,
            autoSync: platforms.ga4?.connected ? true : undefined
          },
          // Meta
          {
            id: 'meta',
            name: 'Meta',
            description: 'Facebook & Instagram Ads',
            icon: '/icons/meta-color.svg',
            connected: platforms.meta?.connected || false,
            dataPoints: platforms.meta?.connected ? 8500 : undefined,
            lastSync: platforms.meta?.connected ? getTimeAgo(platforms.meta.last_synced) : undefined,
            autoSync: platforms.meta?.connected ? true : undefined
          },
          // Brevo
          {
            id: 'brevo',
            name: 'Brevo',
            description: 'Email marketing and campaigns',
            icon: '/icons/brevo.jpeg',
            connected: platforms.brevo?.connected || false,
            dataPoints: platforms.brevo?.connected ? 3800 : undefined,
            lastSync: platforms.brevo?.connected ? getTimeAgo(platforms.brevo.last_synced) : undefined,
            autoSync: platforms.brevo?.connected ? false : undefined
          },
          // HubSpot
          {
            id: 'hubspot',
            name: 'HubSpot',
            description: 'CRM and marketing automation',
            icon: '/icons/hubspot.svg',
            connected: platforms.hubspot?.connected || false,
            dataPoints: platforms.hubspot?.connected ? 5200 : undefined,
            lastSync: platforms.hubspot?.connected ? getTimeAgo(platforms.hubspot.last_synced) : undefined,
            autoSync: platforms.hubspot?.connected ? true : undefined
          },
          // Coming soon
          {
            id: 'linkedin',
            name: 'LinkedIn Ads',
            description: 'B2B advertising and lead generation',
            icon: '/icons/linkedin.svg',
            connected: false
          },
          {
            id: 'tiktok',
            name: 'TikTok Ads',
            description: 'Short-form video advertising',
            icon: '/icons/tiktok.svg',
            connected: false
          },
        ]

      setIntegrations(integrationsData)
      setLoading(false)
    } catch (error) {
      console.error('Error checking connections:', error)
      setLoading(false)
    } finally {
      setIsCheckingConnections(false)
    }
  }

  const handleSelectIntegration = async (integrationId: string) => {
    setSelectedIntegration(integrationId === selectedIntegration ? null : integrationId)
  }

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
      console.log('[Brevo] Submitting API key for account:', selectedAccount.name)

      // Use the NEW per-account endpoint (Nov 16 fix)
      const response = await apiFetch('/api/oauth/brevo/save-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: brevoApiKey.trim(),
          session_id: sessionId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to save API key')
      }

      const data = await response.json()
      console.log('[Brevo] API key saved successfully:', data)

      // Close modal and refresh connections
      setShowBrevoModal(false)
      setBrevoApiKey('')
      await checkConnections()

    } catch (error) {
      console.error('[Brevo] API key submission error:', error)
      setBrevoError(error instanceof Error ? error.message : 'Failed to save API key')
    } finally {
      setBrevoSubmitting(false)
    }
  }

  // Handle Brevo Unlink
  const handleBrevoUnlink = async () => {
    if (!confirm(`Disconnect Brevo from ${selectedAccount?.name || 'this account'}?`)) {
      return
    }

    setBrevoSubmitting(true)
    setBrevoError('')

    try {
      const response = await apiFetch(`/api/oauth/brevo/disconnect?session_id=${sessionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to disconnect Brevo')
      }

      console.log('[Brevo] Disconnected successfully')

      // Close modal and refresh connections
      setShowBrevoModal(false)
      await checkConnections()

    } catch (error) {
      console.error('[Brevo] Unlink error:', error)
      setBrevoError(error instanceof Error ? error.message : 'Failed to disconnect Brevo')
    } finally {
      setBrevoSubmitting(false)
    }
  }

  const handleConnect = async (integrationId: string) => {
    // GA4 uses property selector modal
    if (integrationId === 'ga4') {
      setShowGA4PropertySelector(true)
      return
    }

    // Brevo uses API key (not OAuth) - show modal instead
    if (integrationId === 'brevo') {
      setShowBrevoModal(true)
      setBrevoError('')
      setBrevoApiKey('')
      return
    }

    setConnectingId(integrationId)

    try {
      console.log(`Connecting to ${integrationId} with sessionId:`, sessionId)

      let authUrl: string | null = null

      // Get auth URL based on platform
      if (integrationId === 'google') {
        const response = await apiFetch(`/api/oauth/google/auth-url?session_id=${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      } else if (integrationId === 'meta') {
        const response = await apiFetch(`/api/oauth/meta/auth-url?session_id=${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      } else if (integrationId === 'hubspot') {
        const response = await apiFetch(`/api/oauth/hubspot/auth-url?session_id=${sessionId}`)
        if (response.ok) {
          const data = await response.json()
          authUrl = data.auth_url
        }
      } else if (integrationId === 'mailchimp') {
        const response = await apiFetch(`/api/oauth/mailchimp/auth-url?session_id=${sessionId}`)
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

          // For Meta/Google OAuth, call /complete endpoint to link credentials
          if (integrationId === 'meta' || integrationId === 'google') {
            try {
              const completeUrl = integrationId === 'meta'
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

                // For Meta, just mark as connected - user selects ad account/FB page via gear icons
                // No auto-popup - simpler UX, user has control
                if (integrationId === 'meta' && completeData.success) {
                  console.log('[META-OAUTH] Meta OAuth complete - credentials saved')
                  console.log('[META-OAUTH] User can select Meta ad account (gear) or Facebook page (FB icon)')
                  // Continue to checkConnections() below
                }
              }
            } catch (error) {
              console.error(`${integrationId} /complete error:`, error)
            }
          }

          // Refresh integration status
          console.log('[INTEGRATIONS] Calling checkConnections after OAuth complete...')
          await checkConnections()
          console.log('[INTEGRATIONS] checkConnections complete')

          setSelectedIntegration(integrationId)
          setConnectingId(null)
        }
      }, 500)
    } catch (error) {
      console.error(`${integrationId} connection error:`, error)
      alert(`Connection failed: ${error}`)
      setConnectingId(null)
    }
  }

  const connectedSources = integrations.filter(i => i.connected)
  const availableSources = integrations.filter(i => !i.connected)

  const totalDataPoints = connectedSources.reduce((sum, s) => sum + (s.dataPoints || 0), 0)
  const autoSyncCount = connectedSources.filter(s => s.autoSync).length

  return (
    <div
      className="w-full h-screen bg-white flex flex-col overflow-hidden"
      style={{ fontFamily: 'Figtree, sans-serif', maxWidth: '393px', margin: '0 auto' }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 mb-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Integrations</h1>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Loading State */}
        {loading && integrations.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        )}

        {/* Connected Sources Section */}
        {!loading && connectedSources.length > 0 && (
          <div className="mb-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">{connectedSources.length} Sources</h2>
              <p className="text-xs text-gray-500">Connect your data sources to unlock powerful new insights</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mx-auto mb-1">
                  <img src="/icons/checkmark-circle-outline.svg" alt="" className="w-4 h-4" />
                </div>
                <p className="text-xs text-gray-500">Connected</p>
                <p className="text-sm font-semibold text-gray-900">{connectedSources.length}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-1">
                  <img src="/icons/datapoints.svg" alt="" className="w-4 h-4" />
                </div>
                <p className="text-xs text-gray-500">Data Points</p>
                <p className="text-sm font-semibold text-gray-900">{totalDataPoints.toLocaleString()}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mx-auto mb-1">
                  <img src="/icons/autosync.svg" alt="" className="w-4 h-4" />
                </div>
                <p className="text-xs text-gray-500">Auto-Sync</p>
                <p className="text-sm font-semibold text-gray-900">{autoSyncCount}</p>
              </div>
            </div>

            {/* Connected Platforms List */}
            <div className="space-y-2">
              {connectedSources.map(integration => {
                const isSelected = selectedIntegration === integration.id

                return (
                  <div key={integration.id} className="w-full">
                    <div
                      onClick={() => handleSelectIntegration(integration.id)}
                      className={`w-full text-left transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-white border-2 border-gray-200'
                      } rounded-xl p-3 overflow-hidden cursor-pointer hover:border-blue-300 ${
                        loading ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <img src={integration.icon} alt="" className="w-10 h-10" />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-gray-900 truncate">{integration.name}</h3>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{integration.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Gear icon for Google Ads to switch accounts */}
                          {integration.id === 'google' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowGoogleAccountSelector(true)
                              }}
                              className="w-5 h-5 text-gray-800 hover:opacity-70 transition-opacity"
                              title="Switch Google Ads account"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          )}
                          {/* Gear icon for GA4 to manage properties */}
                          {integration.id === 'ga4' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowGA4PropertySelector(true)
                              }}
                              className="w-5 h-5 text-gray-800 hover:opacity-70 transition-opacity"
                              title="Manage GA4 properties"
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          )}
                          {/* Gear icons for Meta to select account and Facebook Page */}
                          {integration.id === 'meta' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowFacebookPageSelector(true)
                                }}
                                className="w-5 h-5 hover:opacity-70 transition-opacity"
                                title="Select Facebook Page for organic insights"
                              >
                                <img src="/icons/facebook.png" alt="Facebook" className="w-5 h-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowMetaAccountSelector(true)
                                }}
                                className="w-5 h-5 text-gray-800 hover:opacity-70 transition-opacity"
                                title="Change Meta account"
                              >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                            </>
                          )}
                          {/* Gear icon for Brevo to switch accounts or add new API key */}
                          {integration.id === 'brevo' && integration.connected && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowBrevoModal(true)
                                }}
                                className="w-5 h-5 text-gray-800 hover:opacity-70 transition-opacity"
                                title="Add another Brevo account"
                              >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowBrevoAccountSelector(true)
                                }}
                                className="w-5 h-5 text-gray-800 hover:opacity-70 transition-opacity"
                                title="Switch Brevo account"
                              >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                            </>
                          )}
                          {/* Icons for HubSpot to add portal and switch portals */}
                          {integration.id === 'hubspot' && integration.connected && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleConnect('hubspot')
                                }}
                                className="w-5 h-5 text-gray-800 hover:opacity-70 transition-opacity"
                                title="Add another HubSpot portal"
                              >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowHubSpotAccountSelector(true)
                                }}
                                className="w-5 h-5 text-gray-800 hover:opacity-70 transition-opacity"
                                title="Switch HubSpot portal"
                              >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                            </>
                          )}
                          {integration.id === 'mailchimp' && integration.connected && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleConnect('mailchimp')
                                }}
                                className="w-5 h-5 text-gray-800 hover:opacity-70 transition-opacity"
                                title="Connect another Mailchimp account"
                              >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowMailchimpAccountSelector(true)
                                }}
                                className="w-5 h-5 text-gray-800 hover:opacity-70 transition-opacity"
                                title="Switch Mailchimp account"
                              >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                            </>
                          )}
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-500">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <img src="/icons/checkmark-circle-outline.svg" alt="" className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                      {integration.dataPoints && (
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pl-[52px]">
                          <span>{integration.dataPoints.toLocaleString()} data points</span>
                          <span>Last: {integration.lastSync}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Available Integrations Section */}
        {!loading && availableSources.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Available Integrations</h2>
            <p className="text-xs text-gray-500 mb-4">Connect your data sources to unlock powerful new insights</p>

            <div className="space-y-2">
              {availableSources.map(integration => (
                <div key={integration.id} className="bg-white border border-gray-200 rounded-xl p-3 overflow-hidden">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <img src={integration.icon} alt="" className="w-10 h-10 opacity-60" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="font-semibold text-sm text-gray-900 truncate">{integration.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{integration.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConnect(integration.id)}
                      disabled={connectingId !== null || integration.id === 'linkedin' || integration.id === 'tiktok'}
                      className={`px-4 py-2 rounded-lg font-medium text-xs flex-shrink-0 ${
                        integration.id === 'linkedin' || integration.id === 'tiktok'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : connectingId === integration.id
                          ? 'bg-gray-600 text-white cursor-wait'
                          : 'bg-black text-white hover:bg-gray-800'
                      }`}
                    >
                      {integration.id === 'linkedin' || integration.id === 'tiktok'
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

        {/* Need Help Section */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Need help?</h2>
          <p className="text-xs text-gray-500 mb-3">Having trouble connecting your data sources? Here are some helpful resources:</p>

          <div className="space-y-2 pl-2">
            <Link
              to="/docs/integration-guide"
              className="block w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-left hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-900">Integration Documentation</h3>
                  <p className="text-xs text-gray-500">Step-by-step guides</p>
                </div>
              </div>
            </Link>

            <Link
              to="/docs/video-tutorial"
              className="block w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-left hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-900">Setup Video Tutorial</h3>
                  <p className="text-xs text-gray-500">Watch how to connect</p>
                </div>
              </div>
            </Link>

            <button className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-left hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-900">Contact Support</h3>
                  <p className="text-xs text-gray-500">Get help from our team</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Brevo API Key Modal */}
      {showBrevoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <img src="/icons/brevo.jpeg" alt="Brevo" className="w-10 h-10" />
                <h2 className="text-xl font-bold text-gray-900">
                  {currentAccountData?.brevo_api_key ? 'Manage Brevo Connection' : 'Connect Brevo'}
                </h2>
              </div>
              <p className="text-sm text-gray-600">
                {currentAccountData?.brevo_api_key
                  ? `Connected to ${currentAccountData.brevo_account_name || 'your Brevo account'} for ${selectedAccount?.name || 'this account'}`
                  : `Enter your Brevo API key to connect email marketing for ${selectedAccount?.name || 'this account'}.`
                }
              </p>
            </div>

            {/* Instructions - only show when NOT connected */}
            {!currentAccountData?.brevo_api_key && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">How to get your API key:</h3>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Log in to your Brevo account</li>
                  <li>Go to Settings → SMTP & API → API Keys</li>
                  <li>Click "Generate a new API key"</li>
                  <li>Copy the key and paste it below</li>
                </ol>
                <a
                  href="https://app.brevo.com/settings/keys/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Open Brevo API Settings
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}

            {/* API Key Input - only show when NOT connected */}
            {!currentAccountData?.brevo_api_key && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="text"
                  value={brevoApiKey}
                  onChange={(e) => setBrevoApiKey(e.target.value)}
                  placeholder="xkeysib-..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  disabled={brevoSubmitting}
                />
                {brevoError && (
                  <p className="mt-2 text-xs text-red-600">{brevoError}</p>
                )}
              </div>
            )}

            {/* Connected Account Display - show when connected */}
            {currentAccountData?.brevo_api_key && (
              <div className="mb-4 space-y-3">
                {/* Account Name */}
                {currentAccountData.brevo_account_name && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-green-900">{currentAccountData.brevo_account_name}</p>
                        <p className="text-xs text-green-700">Connected Brevo account</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Masked API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono text-gray-600">
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
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {currentAccountData?.brevo_api_key ? 'Close' : 'Cancel'}
              </button>
              {currentAccountData?.brevo_api_key ? (
                <button
                  onClick={handleBrevoUnlink}
                  disabled={brevoSubmitting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {brevoSubmitting ? 'Unlinking...' : 'Unlink'}
                </button>
              ) : (
                <button
                  onClick={handleBrevoSubmit}
                  disabled={brevoSubmitting || !brevoApiKey.trim()}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-medium text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
          console.log('[GOOGLE-ACCOUNT-SELECTOR] Account switched successfully')
          setShowGoogleAccountSelector(false)
          await checkConnections()
          await refreshAccounts()
        }}
      />

      {/* Meta Account Selector Modal */}
      <MetaAccountSelector
        isOpen={showMetaAccountSelector}
        onClose={() => setShowMetaAccountSelector(false)}
        onSuccess={async () => {
          console.log('[META-ACCOUNT-SELECTOR] Account linked successfully')
          setShowMetaAccountSelector(false)
          await checkConnections()
          await refreshAccounts()
        }}
        currentGoogleAccountName={selectedAccount?.name}
        currentAccountData={currentAccountData}
      />

      {/* Brevo Account Selector Modal */}
      <BrevoAccountSelector
        isOpen={showBrevoAccountSelector}
        onClose={() => setShowBrevoAccountSelector(false)}
        onSuccess={async () => {
          console.log('[BREVO-ACCOUNT-SELECTOR] Account switched successfully')
          setShowBrevoAccountSelector(false)
          await checkConnections()
          await refreshAccounts()
        }}
      />

      {/* HubSpot Account Selector Modal */}
      <HubSpotAccountSelector
        isOpen={showHubSpotAccountSelector}
        onClose={() => setShowHubSpotAccountSelector(false)}
        onSuccess={async () => {
          console.log('[HUBSPOT-ACCOUNT-SELECTOR] Portal switched successfully')
          setShowHubSpotAccountSelector(false)
          await checkConnections()
          await refreshAccounts()
        }}
      />

      {/* Mailchimp Account Selector Modal */}
      <MailchimpAccountSelector
        isOpen={showMailchimpAccountSelector}
        onClose={() => setShowMailchimpAccountSelector(false)}
        onSuccess={async () => {
          console.log('[MAILCHIMP-ACCOUNT-SELECTOR] Account switched successfully')
          setShowMailchimpAccountSelector(false)
          await checkConnections()
          await refreshAccounts()
        }}
      />

      {/* Facebook Page Selector Modal */}
      <FacebookPageSelector
        isOpen={showFacebookPageSelector}
        onClose={() => setShowFacebookPageSelector(false)}
        onSuccess={async () => {
          console.log('[FACEBOOK-PAGE-SELECTOR] Page linked successfully')
          setShowFacebookPageSelector(false)
          await checkConnections()
          await refreshAccounts()
        }}
        currentAccountName={selectedAccount?.name}
        currentAccountData={currentAccountData}
      />

      {/* GA4 Property Selector Modal */}
      <GA4PropertySelector
        isOpen={showGA4PropertySelector}
        onClose={() => setShowGA4PropertySelector(false)}
        onSuccess={async () => {
          console.log('[GA4-PROPERTY-SELECTOR] Property linked successfully')
          setShowGA4PropertySelector(false)
          await checkConnections()
          await refreshAccounts()
        }}
        currentAccountName={selectedAccount?.name}
        ga4Properties={ga4Properties}
        linkedProperties={linkedGA4Properties}
      />
    </div>
  )
}

export default IntegrationsPage
