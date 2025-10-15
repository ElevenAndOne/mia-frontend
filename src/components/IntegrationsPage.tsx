import { useState, useEffect } from 'react'
import { useSession } from '../contexts/SessionContext'
import { apiFetch } from '../utils/api'

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

const IntegrationsPage = ({ onBack }: { onBack: () => void }) => {
  const { sessionId } = useSession()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)

  // Check connection status on load
  useEffect(() => {
    checkConnections()
  }, [])

  const checkConnections = async () => {
    try {
      // Check HubSpot status
      const hubspotResponse = await apiFetch(`/api/oauth/hubspot/status?session_id=${sessionId}`)
      const hubspotStatus = hubspotResponse.ok ? await hubspotResponse.json() : { authenticated: false }

      setIntegrations([
        // Connected sources (hardcoded for now - Google/Meta/Brevo always connected)
        {
          id: 'google-ads',
          name: 'Google Ads',
          description: 'Search and display advertising platform',
          icon: '/icons/google-ads.svg',
          connected: true,
          dataPoints: 12000,
          lastSync: '2 minutes ago',
          autoSync: true
        },
        {
          id: 'google-analytics',
          name: 'Google Analytics',
          description: 'Website and app analytics data',
          icon: '/icons/google_analytics-icon.svg',
          connected: true,
          dataPoints: 20587,
          lastSync: '2 minutes ago',
          autoSync: true
        },
        {
          id: 'meta',
          name: 'Meta',
          description: 'Comprehensive marketing analytics solution',
          icon: '/icons/meta-color.svg',
          connected: true,
          dataPoints: 8500,
          lastSync: '2 minutes ago',
          autoSync: true
        },
        {
          id: 'brevo',
          name: 'Brevo',
          description: 'Email marketing and campaign analytics',
          icon: '/icons/brevo.jpeg',
          connected: true,
          dataPoints: 3800,
          lastSync: '10 minutes ago',
          autoSync: false
        },

        // HubSpot - dynamic based on OAuth status
        {
          id: 'hubspot',
          name: 'HubSpot',
          description: 'CRM and marketing automation platform',
          icon: '/icons/hubspot.svg',
          connected: hubspotStatus.authenticated,
          dataPoints: hubspotStatus.authenticated ? 5200 : undefined,
          lastSync: hubspotStatus.authenticated ? '5 minutes ago' : undefined,
          autoSync: hubspotStatus.authenticated ? true : undefined
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
          description: 'Short-form video advertising platform',
          icon: '/icons/tiktok.svg',
          connected: false
        },
      ])
    } catch (error) {
      console.error('Error checking connections:', error)
    }
  }

  const handleSelectIntegration = async (integrationId: string) => {
    // If clicking HubSpot, trigger OAuth popup
    if (integrationId === 'hubspot') {
      await handleConnect('hubspot')
      setSelectedIntegration('hubspot')
    } else {
      // For other platforms, just toggle selection (placeholder)
      setSelectedIntegration(integrationId === selectedIntegration ? null : integrationId)
    }
  }

  const handleConnect = async (integrationId: string) => {
    if (integrationId === 'hubspot') {
      setLoading(true)
      try {
        console.log('Connecting to HubSpot with sessionId:', sessionId)
        const response = await apiFetch(`/api/oauth/hubspot/auth-url?session_id=${sessionId}`)

        if (!response.ok) {
          throw new Error('Failed to get HubSpot auth URL')
        }

        const authData = await response.json()
        console.log('HubSpot auth data:', authData)

        if (authData.auth_url) {
          // Open popup for OAuth (like Google/Meta)
          const popup = window.open(
            authData.auth_url,
            'hubspot-oauth',
            'width=500,height=600,scrollbars=yes,resizable=yes'
          )

          if (!popup) {
            alert('Popup blocked. Please allow popups for this site.')
            setLoading(false)
            return
          }

          // Poll for popup close
          const pollTimer = setInterval(async () => {
            if (popup.closed) {
              clearInterval(pollTimer)
              console.log('HubSpot popup closed, refreshing status...')

              // Refresh integration status
              await checkConnections()

              // Keep HubSpot selected after OAuth
              setSelectedIntegration('hubspot')
              setLoading(false)
            }
          }, 500)
        } else {
          console.error('No auth_url in response:', authData)
          alert('Failed to get HubSpot connection URL. Check console.')
          setLoading(false)
        }
      } catch (error) {
        console.error('HubSpot connection error:', error)
        alert(`Connection failed: ${error}`)
        setLoading(false)
      }
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
        {/* Connected Sources Section */}
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
              const isHubSpot = integration.id === 'hubspot'
              const isClickable = isHubSpot // Only HubSpot is clickable for now

              return (
                <button
                  key={integration.id}
                  onClick={() => isClickable && handleSelectIntegration(integration.id)}
                  disabled={!isClickable || loading}
                  className={`w-full text-left transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-white border-2 border-gray-200'
                  } rounded-xl p-3 overflow-hidden ${
                    isClickable && !loading ? 'cursor-pointer hover:border-blue-300' : 'cursor-default'
                  } ${loading && isHubSpot ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                      <img src={integration.icon} alt="" className="w-10 h-10" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-gray-900 truncate">{integration.name}</h3>
                        {isHubSpot && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium flex-shrink-0">
                            ACTIVE
                          </span>
                        )}
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
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pl-[52px]">
                    <span>{integration.dataPoints?.toLocaleString()} data points</span>
                    <span>Last: {integration.lastSync}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Available Integrations Section */}
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
                    disabled={loading || integration.id === 'linkedin' || integration.id === 'tiktok'}
                    className={`px-4 py-2 rounded-lg font-medium text-xs flex-shrink-0 ${
                      integration.id === 'linkedin' || integration.id === 'tiktok'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    {integration.id === 'linkedin' || integration.id === 'tiktok' ? 'Soon' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

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
    </div>
  )
}

export default IntegrationsPage
