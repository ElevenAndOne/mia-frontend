import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../contexts/session-context-shim'
import { useIntegrationStatus } from '../features/integrations/hooks/use-integration-status'
import { useIntegrationModals } from '../features/integrations/hooks/use-integration-modals'
import { usePlatformConnectionHandlers } from '../features/integrations/hooks/use-platform-connection-handlers'
import PlatformCard from '../features/integrations/components/platform-card'
import ConnectionModals from '../features/integrations/components/connection-modals'

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
  facebook_organic: {
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
  const { sessionId, user, selectedAccount, isAuthenticated, isMetaAuthenticated, refreshAccounts, activeWorkspace } = useSession()

  // Use React Query hook for integration status (cached, deduplicated)
  const {
    platformStatus,
    currentAccountData,
    ga4Properties,
    linkedGA4Properties,
    isLoading: loading,
    isRefetching,
    invalidate: invalidateIntegrationStatus
  } = useIntegrationStatus(sessionId, selectedAccount?.id)

  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)

  // Modal state management
  const modals = useIntegrationModals()

  // Platform connection handlers
  const connectionHandlers = usePlatformConnectionHandlers({
    sessionId,
    selectedAccountId: selectedAccount?.id,
    activeWorkspaceTenantId: activeWorkspace?.tenant_id,
    onMetaComplete: () => modals.setShowMetaAccountSelector(true),
    onFacebookComplete: () => modals.setShowFacebookPageSelector(true),
    onGoogleComplete: () => {},
    onBrevoModalOpen: () => modals.setShowBrevoModal(true),
    onGA4PropertySelectorOpen: () => modals.setShowGA4PropertySelector(true),
    onFacebookPageSelectorOpen: () => modals.setShowFacebookPageSelector(true),
    invalidateIntegrationStatus
  })

  // Helper function to calculate "time ago" from ISO timestamp - memoized
  const getTimeAgo = useCallback((isoTimestamp: string | undefined): string => {
    if (!isoTimestamp) return 'Just now'

    try {
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
  }, [])

  // Build integrations list from platformStatus - memoized to prevent unnecessary recalculations
  const integrations = useMemo((): Integration[] => {
    if (!platformStatus) return []

    return [
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
        name: 'Meta Ads',
        description: 'Paid advertising campaigns',
        icon: '/icons/meta-color.svg',
        connected: platformStatus.meta?.connected || false,
        dataPoints: platformStatus.meta?.connected ? 8500 : undefined,
        lastSync: platformStatus.meta?.connected ? getTimeAgo(platformStatus.meta.last_synced) : undefined,
        autoSync: platformStatus.meta?.connected ? true : undefined
      },
      {
        id: 'facebook_organic',
        name: 'Facebook',
        description: 'Page posts, engagement & reach',
        icon: '/icons/facebook-48.png',
        connected: platformStatus.facebook_organic?.connected || false,
        dataPoints: platformStatus.facebook_organic?.connected ? 2500 : undefined,
        lastSync: platformStatus.facebook_organic?.connected ? getTimeAgo(platformStatus.facebook_organic.last_synced) : undefined,
        autoSync: platformStatus.facebook_organic?.connected ? true : undefined
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
        icon: '/icons/radio buttons/mailchimp.png',
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
  }, [platformStatus, getTimeAgo])

  // handleSelectIntegration - memoized with useCallback
  const handleSelectIntegration = useCallback((integrationId: string) => {
    setSelectedIntegration(prev => prev === integrationId ? null : integrationId)
  }, [])

  const connectedSources = integrations.filter(i => i.connected)
  const availableSources = integrations.filter(i => !i.connected)

  const totalDataPoints = connectedSources.reduce((sum, s) => sum + (s.dataPoints || 0), 0)
  const autoSyncCount = connectedSources.filter(s => s.autoSync).length

  return (
    <div
      className="w-full h-screen-dvh bg-white flex flex-col overflow-hidden"
      style={{ fontFamily: 'Figtree, sans-serif', maxWidth: '393px', margin: '0 auto' }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 shrink-0">
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
              {connectedSources.map(integration => (
                <PlatformCard
                  key={integration.id}
                  platform={{
                    id: integration.id,
                    name: integration.name,
                    description: integration.description,
                    icon: integration.icon
                  }}
                  status={{
                    connected: integration.connected,
                    dataPoints: integration.dataPoints,
                    lastSync: integration.lastSync,
                    autoSync: integration.autoSync
                  }}
                  isSelected={selectedIntegration === integration.id}
                  isDisabled={loading}
                  onSelect={handleSelectIntegration}
                  onManage={(id) => {
                    // Open the appropriate selector modal
                    if (id === 'google') modals.setShowGoogleAccountSelector(true)
                    else if (id === 'ga4') modals.setShowGA4PropertySelector(true)
                    else if (id === 'meta') modals.setShowMetaAccountSelector(true)
                    else if (id === 'facebook_organic') modals.setShowFacebookPageSelector(true)
                    else if (id === 'brevo') modals.setShowBrevoAccountSelector(true)
                    else if (id === 'hubspot') modals.setShowHubSpotAccountSelector(true)
                    else if (id === 'mailchimp') modals.setShowMailchimpAccountSelector(true)
                  }}
                  onReconnect={(id) => {
                    if (['google', 'meta', 'ga4', 'hubspot', 'mailchimp'].includes(id)) {
                      connectionHandlers.handleConnect(id)
                    }
                  }}
                  onAddAccount={(id) => {
                    if (id === 'brevo') modals.setShowBrevoModal(true)
                    else if (id === 'hubspot') connectionHandlers.handleConnect('hubspot')
                    else if (id === 'mailchimp') connectionHandlers.handleConnect('mailchimp')
                  }}
                  onDisconnectSuccess={() => {
                    invalidateIntegrationStatus()
                    refreshAccounts()
                  }}
                  sessionId={sessionId}
                  connectingId={connectionHandlers.connectingId}
                />
              ))}
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
                <PlatformCard
                  key={integration.id}
                  platform={{
                    id: integration.id,
                    name: integration.name,
                    description: integration.description,
                    icon: integration.icon
                  }}
                  status={{
                    connected: integration.connected
                  }}
                  isDisabled={connectionHandlers.connectingId !== null}
                  onConnect={connectionHandlers.handleConnect}
                  sessionId={sessionId}
                  connectingId={connectionHandlers.connectingId}
                />
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
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
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
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
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
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
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

      {/* All Connection Modals */}
      <ConnectionModals
        modals={{
          showBrevoModal: modals.showBrevoModal,
          showGoogleAccountSelector: modals.showGoogleAccountSelector,
          showMetaAccountSelector: modals.showMetaAccountSelector,
          showBrevoAccountSelector: modals.showBrevoAccountSelector,
          showHubSpotAccountSelector: modals.showHubSpotAccountSelector,
          showMailchimpAccountSelector: modals.showMailchimpAccountSelector,
          showFacebookPageSelector: modals.showFacebookPageSelector,
          showGA4PropertySelector: modals.showGA4PropertySelector
        }}
        handlers={{
          onBrevoSubmit: connectionHandlers.handleBrevoSubmit,
          onBrevoUnlink: connectionHandlers.handleBrevoUnlink,
          brevoSubmitting: connectionHandlers.brevoSubmitting
        }}
        onClose={{
          setShowBrevoModal: modals.setShowBrevoModal,
          setShowGoogleAccountSelector: modals.setShowGoogleAccountSelector,
          setShowMetaAccountSelector: modals.setShowMetaAccountSelector,
          setShowBrevoAccountSelector: modals.setShowBrevoAccountSelector,
          setShowHubSpotAccountSelector: modals.setShowHubSpotAccountSelector,
          setShowMailchimpAccountSelector: modals.setShowMailchimpAccountSelector,
          setShowFacebookPageSelector: modals.setShowFacebookPageSelector,
          setShowGA4PropertySelector: modals.setShowGA4PropertySelector
        }}
        onSuccess={async () => {
          console.log('[CONNECTION-MODAL] Connection successful')
          invalidateIntegrationStatus()
          await refreshAccounts()
        }}
        currentAccountData={currentAccountData}
        selectedAccount={selectedAccount ?? undefined}
        ga4Properties={ga4Properties}
        linkedGA4Properties={linkedGA4Properties}
      />
    </div>
  )
}

export default IntegrationsPage
