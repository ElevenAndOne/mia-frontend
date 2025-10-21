import { useState, useEffect } from 'react'
import { useSession } from '../contexts/SessionContext'
import { apiFetch } from '../utils/api'
import BrevoApiKeyModal from './BrevoApiKeyModal'

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
  google: boolean
  meta: boolean
  brevo: boolean
  hubspot: boolean
}

const IntegrationsPage = ({ onBack }: { onBack: () => void }) => {
  const { sessionId } = useSession()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null)
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const [isBrevoModalOpen, setIsBrevoModalOpen] = useState(false)

  // Check connection status on load - wait for sessionId to be available
  useEffect(() => {
    if (sessionId) {
      checkConnections()
    }
  }, [sessionId])

  const checkConnections = async () => {
    try {
      console.log('[IntegrationsPage] Fetching platform status with sessionId:', sessionId)

      // Get platform connection status from backend
      const response = await apiFetch(`/api/auth/platforms?session_id=${sessionId}`)

      if (response.ok) {
        const data = await response.json()
        console.log('[IntegrationsPage] Platform status:', data)
        setPlatformStatus(data.platforms)

        // Build integrations list based on actual connection status
        const integrationsData: Integration[] = [
          // Google (combined Ads + Analytics)
          {
            id: 'google',
            name: 'Google',
            description: 'Advertising & Analytics',
            icon: '/icons/google-ads.svg',
            connected: data.platforms.google || false,
            dataPoints: data.platforms.google ? 32587 : undefined,
            lastSync: data.platforms.google ? '2 minutes ago' : undefined,
            autoSync: data.platforms.google ? true : undefined
          },
          // Meta
          {
            id: 'meta',
            name: 'Meta',
            description: 'Facebook & Instagram Ads',
            icon: '/icons/meta-color.svg',
            connected: data.platforms.meta || false,
            dataPoints: data.platforms.meta ? 8500 : undefined,
            lastSync: data.platforms.meta ? '2 minutes ago' : undefined,
            autoSync: data.platforms.meta ? true : undefined
          },
          // Brevo
          {
            id: 'brevo',
            name: 'Brevo',
            description: 'Email marketing and campaigns',
            icon: '/icons/brevo.jpeg',
            connected: data.platforms.brevo || false,
            dataPoints: data.platforms.brevo ? 3800 : undefined,
            lastSync: data.platforms.brevo ? '10 minutes ago' : undefined,
            autoSync: data.platforms.brevo ? false : undefined
          },
          // HubSpot
          {
            id: 'hubspot',
            name: 'HubSpot',
            description: 'CRM and marketing automation',
            icon: '/icons/hubspot.svg',
            connected: data.platforms.hubspot || false,
            dataPoints: data.platforms.hubspot ? 5200 : undefined,
            lastSync: data.platforms.hubspot ? '5 minutes ago' : undefined,
            autoSync: data.platforms.hubspot ? true : undefined
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
      } else {
        console.error('Failed to fetch platform status:', response.status, response.statusText)
        // Fallback: assume nothing connected but still show integrations
        const fallbackData = { google: false, meta: false, brevo: false, hubspot: false }
        setPlatformStatus(fallbackData)

        // Build integrations with no connections
        const integrationsData: Integration[] = [
          { id: 'google', name: 'Google', description: 'Advertising & Analytics', icon: '/icons/google-ads.svg', connected: false },
          { id: 'meta', name: 'Meta', description: 'Facebook & Instagram Ads', icon: '/icons/meta-color.svg', connected: false },
          { id: 'brevo', name: 'Brevo', description: 'Email marketing and campaigns', icon: '/icons/brevo.jpeg', connected: false },
          { id: 'hubspot', name: 'HubSpot', description: 'CRM and marketing automation', icon: '/icons/hubspot.svg', connected: false },
          { id: 'linkedin', name: 'LinkedIn Ads', description: 'B2B advertising and lead generation', icon: '/icons/linkedin.svg', connected: false },
          { id: 'tiktok', name: 'TikTok Ads', description: 'Short-form video advertising', icon: '/icons/tiktok.svg', connected: false },
        ]
        setIntegrations(integrationsData)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking connections:', error)
      // Fallback: assume nothing connected but still show integrations
      const fallbackData = { google: false, meta: false, brevo: false, hubspot: false }
      setPlatformStatus(fallbackData)

      const integrationsData: Integration[] = [
        { id: 'google', name: 'Google', description: 'Advertising & Analytics', icon: '/icons/google-ads.svg', connected: false },
        { id: 'meta', name: 'Meta', description: 'Facebook & Instagram Ads', icon: '/icons/meta-color.svg', connected: false },
        { id: 'brevo', name: 'Brevo', description: 'Email marketing and campaigns', icon: '/icons/brevo.jpeg', connected: false },
        { id: 'hubspot', name: 'HubSpot', description: 'CRM and marketing automation', icon: '/icons/hubspot.svg', connected: false },
        { id: 'linkedin', name: 'LinkedIn Ads', description: 'B2B advertising and lead generation', icon: '/icons/linkedin.svg', connected: false },
        { id: 'tiktok', name: 'TikTok Ads', description: 'Short-form video advertising', icon: '/icons/tiktok.svg', connected: false },
      ]
      setIntegrations(integrationsData)
      setLoading(false)
    }
  }

  const handleSelectIntegration = async (integrationId: string) => {
    setSelectedIntegration(integrationId === selectedIntegration ? null : integrationId)
  }

  const handleConnect = async (integrationId: string) => {
    // Brevo uses API key modal instead of OAuth
    if (integrationId === 'brevo') {
      setIsBrevoModalOpen(true)
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

  const handleBrevoSuccess = async () => {
    console.log('[IntegrationsPage] Brevo connected successfully')
    await checkConnections()
    setSelectedIntegration('brevo')
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
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500">Connected</p>
                <p className="text-sm font-semibold text-gray-900">{connectedSources.length}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-1">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500">Data Points</p>
                <p className="text-sm font-semibold text-gray-900">{totalDataPoints.toLocaleString()}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mx-auto mb-1">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
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
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-blue-500' : 'bg-green-100'
                        }`}>
                          <svg className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-green-600'}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
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
      <BrevoApiKeyModal
        isOpen={isBrevoModalOpen}
        onClose={() => setIsBrevoModalOpen(false)}
        onSuccess={handleBrevoSuccess}
      />
    </div>
  )
}

export default IntegrationsPage
