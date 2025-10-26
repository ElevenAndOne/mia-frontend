import { useState, useEffect, useRef } from 'react'
import { useSession } from '../contexts/SessionContext'
import { apiFetch } from '../utils/api'
import MetaAccountSelector from './MetaAccountSelector'
import GA4PropertySelector from './GA4PropertySelector'

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
    last_synced?: string
  }
  meta: {
    connected: boolean
    last_synced?: string
  }
  brevo: {
    connected: boolean
    last_synced?: string
  }
  hubspot: {
    connected: boolean
    last_synced?: string
  }
}

const IntegrationsPage = ({ onBack }: { onBack: () => void }) => {
  const { sessionId, user, selectedAccount } = useSession()
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

  // Meta Account Selector Modal State
  const [showMetaAccountSelector, setShowMetaAccountSelector] = useState(false)

  // GA4 Property Selector Modal State
  const [showGA4PropertySelector, setShowGA4PropertySelector] = useState(false)
  const [ga4Properties, setGa4Properties] = useState<any[]>([])

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

      let googleConnected = false
      let metaConnected = false
      let ga4Connected = false
      let brevoConnected = false

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
            googleConnected = !!account.google_ads_id
            metaConnected = !!account.meta_ads_id
            ga4Connected = !!account.ga4_property_id
            brevoConnected = !!account.brevo_api_key
          }
        }
      }

      // Build platform status object
      const platforms = {
        google: { connected: googleConnected, last_synced: new Date().toISOString() },
        ga4: { connected: ga4Connected, last_synced: new Date().toISOString() },
        meta: { connected: metaConnected, last_synced: new Date().toISOString() },
        brevo: { connected: brevoConnected, last_synced: new Date().toISOString() },
        hubspot: { connected: false }
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

    setBrevoSubmitting(true)
    setBrevoError('')

    try {
      // Get user_id from session validation first
      let userId = user?.google_user_id

      if (!userId) {
        console.log('[Brevo] User not in context, fetching from session...')

        // Try to get user_id from session validation endpoint
        const sessionResponse = await apiFetch(`/api/session/validate?session_id=${sessionId}`)
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json()
          userId = sessionData.user?.user_id
          console.log('[Brevo] Got user_id from session:', userId)
        }
      }

      if (!userId) {
        setBrevoError('User ID not available. Please refresh the page and try again.')
        setBrevoSubmitting(false)
        return
      }

      console.log('[Brevo] Submitting API key for user:', userId)

      const response = await apiFetch('/brevo-oauth/save-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          api_key: brevoApiKey.trim()
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

                // For Meta, show account selector modal
                if (integrationId === 'meta' && completeData.success) {
                  console.log('[META-OAUTH] Meta OAuth complete, showing account selector')
                  setShowMetaAccountSelector(true)
                  setConnectingId(null)
                  return // Don't refresh connections yet - wait for account selection
                }
              }
            } catch (error) {
              console.error(`${integrationId} /complete error:`, error)
            }
          }

          // Refresh integration status
          await checkConnections()

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
                  <button
                    key={integration.id}
                    onClick={() => handleSelectIntegration(integration.id)}
                    disabled={loading}
                    className={`w-full text-left transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-white border-2 border-gray-200'
                    } rounded-xl p-3 overflow-hidden cursor-pointer hover:border-blue-300 ${
                      loading ? 'opacity-50' : ''
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
                      <div className="flex-shrink-0">
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
                  </button>
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
            <button className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-left hover:bg-gray-100">
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
            </button>

            <button className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-left hover:bg-gray-100">
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
            </button>

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
                <h2 className="text-xl font-bold text-gray-900">Connect Brevo</h2>
              </div>
              <p className="text-sm text-gray-600">
                Enter your Brevo API key to connect your email marketing campaigns.
              </p>
            </div>

            {/* Instructions */}
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

            {/* API Key Input */}
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
                Cancel
              </button>
              <button
                onClick={handleBrevoSubmit}
                disabled={brevoSubmitting || !brevoApiKey.trim()}
                className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-medium text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {brevoSubmitting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meta Account Selector Modal */}
      <MetaAccountSelector
        isOpen={showMetaAccountSelector}
        onClose={() => setShowMetaAccountSelector(false)}
        onSuccess={() => {
          console.log('[META-ACCOUNT-SELECTOR] Account linked successfully')
          setShowMetaAccountSelector(false)
          // Just update status without refetching
          setPlatformStatus(prev => prev ? {...prev, meta: {connected: true, last_synced: new Date().toISOString()}} : prev)
        }}
        currentGoogleAccountName={platformStatus?.google?.connected ? 'your Google Ads account' : undefined}
      />

      {/* GA4 Property Selector Modal */}
      <GA4PropertySelector
        isOpen={showGA4PropertySelector}
        onClose={() => setShowGA4PropertySelector(false)}
        onSuccess={() => {
          console.log('[GA4-PROPERTY-SELECTOR] Property linked successfully')
          setShowGA4PropertySelector(false)
          // Just update status without refetching
          setPlatformStatus(prev => prev ? {...prev, ga4: {connected: true, last_synced: new Date().toISOString()}} : prev)
        }}
        currentAccountName={selectedAccount?.name}
        ga4Properties={ga4Properties}
      />
    </div>
  )
}

export default IntegrationsPage
