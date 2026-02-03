import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSession } from '../contexts/session-context'
import { formatDateRangeDisplay } from '../utils/date-range'
import { getAccountIcon } from '../utils/account-icon'
import { sendChatMessage } from '../features/chat/services/chat-service'
import { usePlatformPreferences } from '../features/integrations/hooks/use-platform-preferences'
import BrevoConnectionModal from './brevo-connection-modal'
import DateRangeSelector from './date-range-selector'
import WorkspaceSwitcher from './workspace-switcher'
import CreateWorkspaceModal from './create-workspace-modal'

interface MainViewProps {
  onLogout: () => void
  onIntegrationsClick?: () => void
  onWorkspaceSettingsClick?: () => void
  onSummaryQuickClick?: (platforms?: string[]) => void
  onGrowQuickClick?: (platforms?: string[]) => void
  onOptimizeQuickClick?: (platforms?: string[]) => void
  onProtectQuickClick?: (platforms?: string[]) => void
}

const MainViewCopy = ({ onLogout: _onLogout, onIntegrationsClick, onWorkspaceSettingsClick, onGrowQuickClick, onOptimizeQuickClick, onProtectQuickClick }: MainViewProps) => {
  const { selectedAccount, availableAccounts, selectAccount, sessionId, refreshAccounts, user, activeWorkspace, refreshWorkspaces } = useSession()

  // Debug logging with timestamp
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 12)
  console.log(`[${timestamp}] [MainViewCopy RENDER] activeWorkspace:`, activeWorkspace?.tenant_id, activeWorkspace?.name)
  console.log(`[${timestamp}] [MainViewCopy RENDER] connected_platforms:`, activeWorkspace?.connected_platforms)

  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [showBurgerMenu, setShowBurgerMenu] = useState(false)
  const [showAccountSelector, setShowAccountSelector] = useState(false) // New state for account selection popout
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false) // Jan 2025: Workspace switcher
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false) // Jan 2025: Create workspace modal
  const [isChatLoading, setIsChatLoading] = useState(false) // Track chat loading state
  const [isAccountSwitching, setIsAccountSwitching] = useState(false)
  const [showBrevoModal, setShowBrevoModal] = useState(false) // Brevo connection modal
  const [showMore, setShowMore] = useState(false) // Toggle for More button
  const [dateRange, setDateRange] = useState('30_days') // Date range for chat queries
  const [showDatePicker, setShowDatePicker] = useState(false) // Show date picker modal
  const datePickerButtonRef = useRef<HTMLButtonElement>(null)

  // Platform configuration - maps to backend platform IDs
  // Order: Google Ads, GA4, Meta, Facebook, Brevo, Mailchimp, HubSpot
  // CRITICAL: Platform IDs must match backend TenantIntegration.platform values
  const platformConfig = useMemo(() => [
    { id: 'google_ads', name: 'Google Ads', icon: '/icons/radio buttons/Google-ads.png', accountKey: 'google_ads_id' },
    { id: 'ga4', name: 'Google Analytics', icon: '/icons/radio buttons/Google-analytics.png', accountKey: 'ga4_property_id' },
    { id: 'meta_ads', name: 'Meta Ads', icon: '/icons/radio buttons/Meta.png', accountKey: 'meta_ads_id' },
    { id: 'facebook_organic', name: 'Facebook Organic', icon: '/icons/radio buttons/Facebook.png', accountKey: 'facebook_page_id' },
    { id: 'brevo', name: 'Brevo', icon: '/icons/radio buttons/Brevo.png', accountKey: 'brevo_api_key' },
    { id: 'mailchimp', name: 'Mailchimp', icon: '/icons/radio buttons/mailchimp.png', accountKey: 'mailchimp_account_id' },
    { id: 'hubspot', name: 'HubSpot', icon: '/icons/radio buttons/Hubspot.png', accountKey: 'hubspot_portal_id' },
  ], [])

  // CRITICAL FIX (Jan 2026): Get connected platforms from WORKSPACE, not from selectedAccount
  // This ensures proper workspace isolation - each workspace has its own platform connections
  const connectedPlatforms = useMemo(() => {
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 12)
    console.log(`[${timestamp}] [MainViewCopy useMemo] Computing connectedPlatforms...`)
    console.log(`[${timestamp}] [MainViewCopy useMemo] activeWorkspace?.connected_platforms:`, activeWorkspace?.connected_platforms)

    // Use workspace-level connected_platforms array from backend
    if (activeWorkspace?.connected_platforms) {
      console.log(`[${timestamp}] [MainViewCopy useMemo] Returning:`, activeWorkspace.connected_platforms)
      return activeWorkspace.connected_platforms
    }
    // Fallback to empty array if no workspace or no platforms connected
    console.log(`[${timestamp}] [MainViewCopy useMemo] No platforms, returning empty array`)
    return []
  }, [activeWorkspace])

  // Platform preferences with caching and debounced saves
  const { selectedPlatforms, togglePlatform } = usePlatformPreferences({
    sessionId,
    selectedAccountId: selectedAccount?.id,
    connectedPlatforms
  })

  // FEB 2026: Show guidance when platforms need additional configuration
  // GA4 and Facebook Organic share auth with Google Ads and Meta Ads respectively,
  // but require property/page selection in Integrations
  // FIX (Feb 2026): Check if property/page is SELECTED, not just if platform is in connectedPlatforms
  // connectedPlatforms shows OAuth completion, but user still needs to pick specific property/page
  const configurationGuidance = useMemo(() => {
    const needsConfig: string[] = []

    // Google Ads connected but GA4 property not selected
    // Check selectedAccount.ga4_property_id instead of connectedPlatforms.includes('ga4')
    if (connectedPlatforms.includes('google_ads') && !selectedAccount?.ga4_property_id) {
      needsConfig.push('Google Analytics property')
    }

    // Meta Ads connected but Facebook Page not selected
    // Check selectedAccount.facebook_page_id instead of connectedPlatforms.includes('facebook_organic')
    if (connectedPlatforms.includes('meta_ads') && !selectedAccount?.facebook_page_id) {
      needsConfig.push('Facebook Page')
    }

    if (needsConfig.length === 0) return null

    return `Select your ${needsConfig.join(' and ')} in Integrations to unlock more insights`
  }, [connectedPlatforms, selectedAccount?.ga4_property_id, selectedAccount?.facebook_page_id])

  // Refresh accounts AND workspaces on mount to get latest platform connections
  // This ensures platform icons update after returning from Integrations page or completing onboarding
  useEffect(() => {
    if (sessionId) {
      console.log('[MainView] Refreshing accounts and workspaces to get latest platform connections...')
      refreshAccounts()
      // CRITICAL FIX (Jan 2026): Also refresh workspace data to update connected_platforms
      refreshWorkspaces().catch(err => console.error('[MainView] Failed to refresh workspaces:', err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  const handleAccountSwitch = useCallback(async (accountId: string) => {
    if (isAccountSwitching) return

    setIsAccountSwitching(true)
    setShowBurgerMenu(false)
    setShowAccountSelector(false)

    try {
      const success = await selectAccount(accountId)

      if (success) {
        // Clear any existing chat messages when switching accounts
        setChatMessages([])

        // Navigate to Integrations page after account switch
        // User needs to link platforms (GA4, Meta) for the new account
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

  const handleChatSubmit = useCallback(async (message: string) => {
    if (!message.trim()) return

    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: message }])
    
    // Set loading state and scroll to show loading indicator
    setIsChatLoading(true)
    
    // Auto-scroll after user message is added
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages-container')
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    }, 100)

    try {
      
      const result = await sendChatMessage({
        message,
        session_id: sessionId,
        user_id: user?.google_user_id || '',
        google_ads_id: selectedAccount?.google_ads_id,
        ga4_property_id: selectedAccount?.ga4_property_id,
        date_range: dateRange,
      })

      setIsChatLoading(false) // Remove loading state

      if (result.success && result.claude_response) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: result.claude_response }])
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble processing your question. Please try again.' }])
      }
      
      // Auto-scroll to show the top of Mia's response
      setTimeout(() => {
        const chatContainer = document.querySelector('.chat-messages-container')
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight - 100 // Show top of message
        }
      }, 100)
      
    } catch (error) {
      console.error('[CHAT] Error:', error)
      setIsChatLoading(false)
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your connection and try again.' }])
    }
  }, [sessionId, selectedAccount?.google_ads_id, selectedAccount?.ga4_property_id, dateRange, user?.google_user_id])

  return (
    <div className="w-full h-full relative bg-primary flex flex-col">
      {/* Header - Conditional: Burger Menu OR Back Button */}
      <div className={`flex items-center px-4 py-1 safe-top relative z-20 shrink-0 ${!showChat ? 'justify-start' : 'justify-between'}`}>
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
                <div className="absolute top-8 left-0 bg-primary rounded-lg shadow-lg border border-secondary min-w-64 z-30">
                  {/* Accounts Button */}
                  <button
                    onClick={() => setShowAccountSelector(true)}
                    className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center paragraph-xs"
                        style={{ backgroundColor: selectedAccount?.color }}
                      >
                        {getAccountIcon(selectedAccount?.business_type || '')}
                      </div>
                      <div>
                        <div className="subheading-md text-primary">Accounts</div>
                        <div className="paragraph-xs text-quaternary">{selectedAccount?.name}</div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Divider */}
                  <div className="border-t border-tertiary"></div>

                  {/* Workspaces Button - Jan 2025 */}
                  <button
                    onClick={() => setShowWorkspaceSwitcher(true)}
                    className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-brand-solid flex items-center justify-center label-xs text-primary-onbrand">
                        {activeWorkspace?.name?.charAt(0)?.toUpperCase() || 'W'}
                      </div>
                      <div>
                        <div className="subheading-md text-primary">Workspaces</div>
                        <div className="paragraph-xs text-quaternary">{activeWorkspace?.name || 'No workspace'}</div>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Divider */}
                  <div className="border-t border-tertiary"></div>

                  {/* Integrations Button */}
                  <button
                    onClick={() => {
                      onIntegrationsClick?.()
                      setShowBurgerMenu(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center gap-3"
                  >
                    <div className="relative">
                      <div className="w-5 h-5 rounded-full bg-primary-solid flex items-center justify-center">
                        <img src="/icons/plugin.svg" alt="Integrations" className="w-3.5 h-3.5 brightness-0 invert" />
                      </div>
                    </div>
                    <div className="subheading-bg text-primary">Integrations</div>
                  </button>

                  {/* Divider */}
                  <div className="border-t border-tertiary"></div>

                  {/* Sign Out Button */}
                  <button
                    onClick={() => {
                      _onLogout()
                      setShowBurgerMenu(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center gap-3"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-secondary">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className="subheading-bg text-primary">Sign Out</div>
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
                <div className="absolute top-8 left-0 bg-primary rounded-lg shadow-lg border border-secondary min-w-64 z-30">
                  {/* Back Button */}
                  <button
                    onClick={() => setShowAccountSelector(false)}
                    className="w-full px-4 py-3 text-left hover:bg-secondary flex items-center gap-3 border-b border-tertiary"
                  >
                    <svg className="w-4 h-4 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    <div className="subheading-md text-primary">Back</div>
                  </button>

                  {/* Available Accounts */}
                  <div className="px-2 py-2">
                    {availableAccounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => handleAccountSwitch(account.id)}
                        disabled={isAccountSwitching || account.id === selectedAccount?.id}
                        className={`w-full px-3 py-2 text-left rounded-lg flex items-center gap-3 paragraph-sm transition-colors ${
                          account.id === selectedAccount?.id
                            ? 'bg-secondary text-placeholder-subtle cursor-default'
                            : 'hover:bg-secondary text-secondary'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center paragraph-xs"
                          style={{ backgroundColor: account.color }}
                        >
                          {getAccountIcon(account.business_type)}
                        </div>
                        <div className="flex-1">
                          <div className="subheading-md text-primary">{account.name}</div>
                          <div className="paragraph-xs text-quaternary">{account.business_type}</div>
                        </div>
                        {account.id === selectedAccount?.id && (
                          <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {isAccountSwitching && account.id !== selectedAccount?.id && (
                          <div className="w-4 h-4 border-2 border-primary border-t-utility-info-500 rounded-full animate-spin"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Chat Header - Back button, Mia title, and Date picker */}
            {/* Back Button (Left) */}
            <button
              onClick={() => setShowChat(false)}
              className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-full border border-tertiary text-primary subheading-md hover:bg-tertiary transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>

            {/* Mia Header (Center) - Absolutely positioned to stay centered */}
            <h2 className="absolute left-1/2 transform -translate-x-1/2 label-bg text-primary">Mia</h2>

            {/* Date Range Picker Button (Right) */}
            <button
              ref={datePickerButtonRef}
              type="button"
              onClick={() => setShowDatePicker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary rounded-full border border-secondary subheading-md text-secondary hover:bg-secondary transition-colors whitespace-nowrap"
              title="Change date range"
            >
              <img src="/icons/calendar.svg" alt="Calendar" className="w-3.5 h-3.5" />
              <span>{formatDateRangeDisplay(dateRange, 'short')}</span>
            </button>
          </>
        )}
      </div>

      {/* Main Content - Flexbox Layout (FEB 2026 FIX: replaced absolute positioning) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!showChat ? (
          /* Home Screen - Centered content with proper flexbox */
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {/* Content wrapper - centers everything and provides consistent spacing */}
            <div className="flex flex-col items-center gap-5 w-full max-w-sm" style={{ fontFamily: 'Geologica, system-ui, sans-serif' }}>
              {/* Greeting */}
              <div className="text-center">
                <h2 className="paragraph-lg text-primary leading-[110%] tracking-[-0.03em] mb-1">
                  Hello {user?.name?.split(' ')[0] || 'there'}.
                </h2>
                <p className="paragraph-lg text-primary leading-[110%] tracking-[-0.03em]">
                  How can I help today?
                </p>
              </div>

              {/* Configuration Guidance Banner - FEB 2026 */}
              {configurationGuidance && (
                <button
                  onClick={() => onIntegrationsClick?.()}
                  className="flex items-center gap-2 px-4 py-2 bg-utility-info-100 border border-utility-info-300 rounded-full text-utility-info-700 paragraph-xs hover:bg-utility-info-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>{configurationGuidance}</span>
                </button>
              )}

              {/* Platform Toggles - Show all 7 platforms */}
              <div className="flex items-center justify-center gap-3">
                {platformConfig.map(platform => {
                  const isConnected = connectedPlatforms.includes(platform.id)
                  const isSelected = selectedPlatforms.includes(platform.id)

                  return (
                    <button
                      key={platform.id}
                      onClick={() => isConnected && togglePlatform(platform.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 group relative"
                      style={{
                        opacity: isConnected ? (isSelected ? 1 : 0.4) : 0.3,
                        transform: isSelected ? 'scale(1)' : 'scale(0.9)',
                        cursor: isConnected ? 'pointer' : 'not-allowed',
                      }}
                      disabled={!isConnected}
                    >
                      <img
                        src={platform.icon}
                        alt={platform.name}
                        className="w-6 h-6"
                        style={{
                          filter: isConnected && isSelected ? 'none' : 'grayscale(100%)',
                        }}
                      />
                      {/* Tooltip */}
                      <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-primary-solid text-primary-onbrand paragraph-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {platform.name}{!isConnected && ' (not connected)'}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Row 1: Grow, Optimise, Protect - Horizontal Pills */}
              <div className="flex gap-2 mt-2">
                {onGrowQuickClick && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      if (onGrowQuickClick) {
                        setTimeout(() => onGrowQuickClick(selectedPlatforms), 150)
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-secondary text-primary paragraph-sm px-5 py-3 transition-all duration-200 active:scale-95 touch-manipulation"
                  >
                    Grow
                  </button>
                )}

                {onOptimizeQuickClick && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      if (onOptimizeQuickClick) {
                        setTimeout(() => onOptimizeQuickClick(selectedPlatforms), 150)
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-secondary text-primary paragraph-sm px-5 py-3 transition-all duration-200 active:scale-95 touch-manipulation"
                  >
                    Optimise
                  </button>
                )}

                {onProtectQuickClick && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      if (onProtectQuickClick) {
                        setTimeout(() => onProtectQuickClick(selectedPlatforms), 150)
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-secondary text-primary paragraph-sm px-5 py-3 transition-all duration-200 active:scale-95 touch-manipulation"
                  >
                    Protect
                  </button>
                )}
              </div>

              {/* Row 2: More button OR Summary + Chat with Mia */}
              {!showMore ? (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setShowMore(true)
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-secondary text-primary paragraph-sm px-6 py-3 opacity-50 transition-all duration-200 active:scale-95 touch-manipulation"
                >
                  More
                </button>
              ) : (
                <div className="flex gap-2">
                  {/* Summary button - disabled/coming soon */}
                  <button
                    disabled
                    title="Coming Soon"
                    className="inline-flex items-center justify-center rounded-full cursor-not-allowed opacity-50 bg-secondary text-quaternary paragraph-sm px-6 py-3 whitespace-nowrap"
                  >
                    Summary
                  </button>

                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setTimeout(() => setShowChat(true), 150)
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-secondary text-primary paragraph-sm px-5 py-3 whitespace-nowrap transition-all duration-200 active:scale-95 touch-manipulation"
                  >
                    Chat with Mia
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Chat Interface - iPhone 16 Optimized with proper flex layout */
          <div className="w-full h-full flex flex-col" style={{ maxWidth: '393px' }}>
            {/* Chat Messages - Scrollable area */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 chat-messages-container">
              {chatMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-brand-solid text-primary-onbrand'
                      : 'bg-secondary text-primary border border-tertiary'
                  }`}>
                    <p className="paragraph-sm whitespace-pre-wrap leading-relaxed select-text">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Loading Indicator */}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary border border-tertiary rounded-2xl p-3 max-w-[85%]">
                    <div className="flex items-center gap-2 text-tertiary">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="paragraph-sm">Mia is analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input - Fixed at bottom and centered */}
            <div className="shrink-0 p-4 border-t border-tertiary bg-primary flex justify-center safe-bottom">
              <div className="flex gap-2" style={{ maxWidth: '393px', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Ask about your marketing performance..."
                  className="flex-1 px-4 py-3.5 border border-primary rounded-full focus:outline-none focus:ring-2 focus:ring-utility-info-500 focus:border-transparent paragraph-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement
                      handleChatSubmit(target.value)
                      target.value = ''
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[type="text"]') as HTMLInputElement
                    if (input?.value.trim()) {
                      handleChatSubmit(input.value)
                      input.value = ''
                    }
                  }}
                  className="px-5 py-3.5 bg-brand-solid text-primary-onbrand rounded-full hover:bg-brand-solid-hover transition-colors subheading-md"
                  disabled={isChatLoading}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
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
        anchorRef={datePickerButtonRef}
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
