import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from '../contexts/session-context-shim'
import { usePlatformPreferences } from '../hooks/use-platform-preferences'
import BrevoConnectionModal from '../features/integrations/components/brevo-connection-modal'
import DateRangeSelector from '../components/ui/date-range-selector'
import WorkspaceSwitcher from '../features/workspaces/components/workspace-switcher'
import CreateWorkspaceModal from '../features/workspaces/components/create-workspace-modal'
import ChatPanel from '../features/chat/components/chat-panel'
import AccountSwitcher from '../features/accounts/components/account-switcher'
import PlatformSelector from '../features/integrations/components/platform-selector'
import InsightsNavigation from '../features/insights/components/insights-navigation'

interface MainViewProps {
  onLogout: () => void
  onIntegrationsClick?: () => void
  onWorkspaceSettingsClick?: () => void
  onSummaryQuickClick?: (platforms?: string[]) => void
  onGrowQuickClick?: (platforms?: string[]) => void
  onOptimizeQuickClick?: (platforms?: string[]) => void
  onProtectQuickClick?: (platforms?: string[]) => void
}

// Helper function to format date range for display
const formatDateRangeDisplay = (dateRange: string): string => {
  // Handle preset ranges
  if (dateRange === '7_days') return '7d'
  if (dateRange === '14_days') return '14d'
  if (dateRange === '30_days') return '30d'
  if (dateRange === '90_days') return '90d'

  // Handle custom range (format: YYYY-MM-DD_YYYY-MM-DD)
  if (dateRange.includes('_') && dateRange.match(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/)) {
    const [startStr, endStr] = dateRange.split('_')
    const start = new Date(startStr)
    const end = new Date(endStr)

    // Format: "Aug 1 - Nov 16" (no year to keep it compact)
    const formatDate = (date: Date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      const day = date.getDate()
      return `${month} ${day}`
    }

    return `${formatDate(start)} - ${formatDate(end)}`
  }

  // Fallback
  return '90d'
}

const MainViewCopy = ({ onLogout: _onLogout, onIntegrationsClick, onWorkspaceSettingsClick, onSummaryQuickClick, onGrowQuickClick, onOptimizeQuickClick, onProtectQuickClick }: MainViewProps) => {
  const { selectedAccount, availableAccounts, selectAccount, sessionId, refreshAccounts, user, activeWorkspace } = useSession()
  const [showChat, setShowChat] = useState(false)
  const [showBurgerMenu, setShowBurgerMenu] = useState(false)
  const [showAccountSelector, setShowAccountSelector] = useState(false)
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false)
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)
  const [isAccountSwitching, setIsAccountSwitching] = useState(false)
  const [showBrevoModal, setShowBrevoModal] = useState(false)
  const [dateRange, setDateRange] = useState('30_days')
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Platform configuration - maps to backend platform IDs
  // Order: Google Ads, GA4, Meta, Facebook, Brevo, Mailchimp, HubSpot
  const platformConfig = useMemo(() => [
    { id: 'google_ads', name: 'Google Ads', icon: '/icons/radio buttons/Google-ads.png', accountKey: 'google_ads_id' },
    { id: 'ga4', name: 'Google Analytics', icon: '/icons/radio buttons/Google-analytics.png', accountKey: 'ga4_property_id' },
    { id: 'meta', name: 'Meta Ads', icon: '/icons/radio buttons/Meta.png', accountKey: 'meta_ads_id' },
    { id: 'facebook_organic', name: 'Facebook Organic', icon: '/icons/radio buttons/Facebook.png', accountKey: 'facebook_page_id' },
    { id: 'brevo', name: 'Brevo', icon: '/icons/radio buttons/Brevo.png', accountKey: 'brevo_api_key' },
    { id: 'mailchimp', name: 'Mailchimp', icon: '/icons/radio buttons/mailchimp.png', accountKey: 'mailchimp_account_id' },
    { id: 'hubspot', name: 'HubSpot', icon: '/icons/radio buttons/Hubspot.png', accountKey: 'hubspot_portal_id' },
  ], [])

  // Get connected platforms from selected account - memoized
  const connectedPlatforms = useMemo(() => {
    if (!selectedAccount) return []
    return platformConfig.filter(p => {
      type AccountKey = keyof typeof selectedAccount
      const value = selectedAccount[p.accountKey as AccountKey]
      return value && value !== ''
    }).map(p => p.id)
  }, [selectedAccount, platformConfig])

  // Platform preferences with caching and debounced saves
  const { selectedPlatforms, togglePlatform } = usePlatformPreferences({
    sessionId,
    selectedAccountId: selectedAccount?.id,
    connectedPlatforms
  })

  // Refresh accounts on mount to get latest platform connections
  // This ensures platform icons update after returning from Integrations page
  useEffect(() => {
    if (sessionId) {
      console.log('[MainView] Refreshing accounts to get latest platform connections...')
      refreshAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  const getAccountIcon = useCallback((businessType: string) => {
    switch (businessType?.toLowerCase()) {
      case 'food':
        return '🍎'
      case 'engineering':
        return '⚙️'
      case 'retail':
        return '🏪'
      default:
        return '🏢'
    }
  }, [])

  const handleAccountSwitch = useCallback(async (accountId: string) => {
    if (isAccountSwitching) return

    setIsAccountSwitching(true)
    setShowBurgerMenu(false)
    setShowAccountSelector(false)

    try {
      const success = await selectAccount(accountId)

      if (success) {
        // Navigate to Integrations page after account switch
        setTimeout(() => {
          setIsAccountSwitching(false)
          if (onIntegrationsClick) {
            onIntegrationsClick()
          }
        }, 500)
      } else {
        console.error('❌ [MAIN] Failed to switch account')
        setIsAccountSwitching(false)
      }
    } catch (error) {
      console.error('❌ [MAIN] Account switch error:', error)
      setIsAccountSwitching(false)
    }
  }, [isAccountSwitching, selectAccount, onIntegrationsClick])

  return (
    <div className="w-full h-full safe-full relative bg-white flex flex-col">
      {/* Header - Conditional: Burger Menu OR Back Button */}
      <div className={`flex items-center px-4 py-4 relative z-20 shrink-0 ${!showChat ? 'justify-start' : 'justify-between'}`}>
        {!showChat ? (
          <>
            {/* Menu Icon - Using Figma SVG */}
            <div className="relative">
              <button
                onClick={() => setShowBurgerMenu(!showBurgerMenu)}
                className="w-6 h-6 flex items-center justify-center"
              >
                <img src="/icons/menu.svg" alt="Menu" className="w-6 h-6" />
              </button>

              {/* New Clean Menu Dropdown */}
              {showBurgerMenu && !showAccountSelector && !showWorkspaceSwitcher && (
                <div className="absolute top-8 left-0 bg-white rounded-lg shadow-lg border border-gray-200 min-w-64 z-30">
                  {/* Accounts Button */}
                  <button
                    onClick={() => setShowAccountSelector(true)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: selectedAccount?.color }}
                      >
                        {getAccountIcon(selectedAccount?.business_type || '')}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">Accounts</div>
                        <div className="text-xs text-gray-500">{selectedAccount?.name}</div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Divider */}
                  <div className="border-t border-gray-100"></div>

                  {/* Workspaces Button - Jan 2025 */}
                  <button
                    onClick={() => setShowWorkspaceSwitcher(true)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                        {activeWorkspace?.name?.charAt(0)?.toUpperCase() || 'W'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">Workspaces</div>
                        <div className="text-xs text-gray-500">{activeWorkspace?.name || 'No workspace'}</div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Divider */}
                  <div className="border-t border-gray-100"></div>

                  {/* Integrations Button */}
                  <button
                    onClick={() => {
                      onIntegrationsClick?.()
                      setShowBurgerMenu(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                  >
                    <div className="relative">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                        <img src="/icons/plugin.svg" alt="Integrations" className="w-3.5 h-3.5 brightness-0 invert" />
                      </div>
                    </div>
                    <div className="font-medium text-gray-900 text-base">Integrations</div>
                  </button>

                  {/* Divider */}
                  <div className="border-t border-gray-100"></div>

                  {/* Sign Out Button */}
                  <button
                    onClick={() => {
                      _onLogout()
                      setShowBurgerMenu(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-700">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className="font-medium text-gray-900 text-base">Sign Out</div>
                  </button>
                </div>
              )}

              {/* Workspace Switcher Popout - Jan 2025 */}
              {showBurgerMenu && showWorkspaceSwitcher && (
                <WorkspaceSwitcher
                  onClose={() => {
                    setShowWorkspaceSwitcher(false)
                    setShowBurgerMenu(false)
                  }}
                  onCreateWorkspace={() => {
                    setShowWorkspaceSwitcher(false)
                    setShowBurgerMenu(false)
                    setShowCreateWorkspaceModal(true)
                  }}
                  onSettings={() => {
                    setShowWorkspaceSwitcher(false)
                    setShowBurgerMenu(false)
                    onWorkspaceSettingsClick?.()
                  }}
                />
              )}

              {/* Account Selector Popout */}
              {showBurgerMenu && showAccountSelector && (
                <AccountSwitcher
                  selectedAccount={selectedAccount}
                  availableAccounts={availableAccounts}
                  onSwitch={handleAccountSwitch}
                  isLoading={isAccountSwitching}
                  onClose={() => setShowAccountSelector(false)}
                />
              )}
            </div>
          </>
        ) : (
          <>
            {/* Chat Header - Back button, Mia title, and Date picker */}
            {/* Back Button (Left) */}
            <button
              onClick={() => setShowChat(false)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-full border border-gray-100 text-gray-800 font-medium hover:bg-gray-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>

            {/* Mia Header (Center) - Absolutely positioned to stay centered */}
            <h2 className="absolute left-1/2 transform -translate-x-1/2 text-lg font-semibold text-black">Mia</h2>

            {/* Date Range Picker Button (Right) */}
            <button
              onClick={() => setShowDatePicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors whitespace-nowrap"
              title="Change date range"
            >
              <img src="/icons/calendar.svg" alt="Calendar" className="w-3.5 h-3.5" />
              <span>{formatDateRangeDisplay(dateRange)}</span>
            </button>
          </>
        )}
      </div>

      {/* Main Content - iPhone 16 Pro Layout */}
      <div className="flex-1 flex flex-col items-center relative px-6 overflow-hidden">
        {!showChat ? (
          <>
            {/* Greeting - Centered with uniform spacing */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center" style={{ width: '340px', marginTop: '-85px' }}>
              <h2 style={{
                color: '#1B1B1B',
                textAlign: 'center',
                fontFamily: 'Geologica, system-ui, sans-serif',
                fontSize: '26px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '110%',
                letterSpacing: '-0.78px',
                marginBottom: '4px'
              }}>Hello {user?.name?.split(' ')[0] || 'there'}.</h2>
              <p style={{
                color: '#1B1B1B',
                fontFamily: 'Geologica, system-ui, sans-serif',
                fontSize: '26px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '110%',
                letterSpacing: '-0.78px',
                margin: '0px'
              }}>How can I help today?</p>
            </div>

            {/* Platform Toggles - Show all 6 platforms */}
            <PlatformSelector
              connectedPlatforms={connectedPlatforms}
              selectedPlatforms={selectedPlatforms}
              onToggle={togglePlatform}
              platformConfig={platformConfig}
            />

            {/* Insights Navigation - Grow/Optimize/Protect/More buttons */}
            <InsightsNavigation
              onGrowClick={onGrowQuickClick}
              onOptimizeClick={onOptimizeQuickClick}
              onProtectClick={onProtectQuickClick}
              onSummaryClick={onSummaryQuickClick}
              onChatClick={() => setShowChat(true)}
              selectedPlatforms={selectedPlatforms}
            />

          </>
        ) : (
          /* Chat Interface */
          <ChatPanel
            selectedPlatforms={selectedPlatforms}
            dateRange={dateRange}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>


      {/* Click outside to close burger menu */}
      {showBurgerMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowBurgerMenu(false)
            setShowAccountSelector(false)
          }}
        />
      )}

      {/* Brevo Connection Modal */}
      <BrevoConnectionModal
        isOpen={showBrevoModal}
        onClose={() => setShowBrevoModal(false)}
        onSuccess={() => {
          console.log('Brevo connected successfully')
          // Could trigger a refresh of platform status here if needed
        }}
      />

      {/* Date Range Selector */}
      <DateRangeSelector
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedRange={dateRange}
        onApply={(range) => setDateRange(range)}
      />

      {/* Create Workspace Modal - Jan 2025 */}
      <CreateWorkspaceModal
        isOpen={showCreateWorkspaceModal}
        onClose={() => setShowCreateWorkspaceModal(false)}
        onSuccess={(tenantId) => {
          console.log('[MAIN-VIEW] Workspace created:', tenantId)
          // Refresh the page to load new workspace
          window.location.reload()
        }}
      />
    </div>
  )
}

export default MainViewCopy