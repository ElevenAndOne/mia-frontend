import { useState } from 'react'
import { useSession } from '../../contexts/session-context'
import { getGlobalSDK } from '../../sdk'
import { ChatResponse } from '../../sdk/services/chat'
import BrevoConnectionModal from '../modals/brevo-connection-modal'
import DateRangeSelector from '../common/date-range-selector'

interface MainViewProps {
  onLogout: () => void
  onQuestionClick: (questionType: 'growth' | 'improve' | 'fix', data?: unknown) => void
  onCreativeClick?: () => void
  onIntegrationsClick?: () => void
  onSummaryQuickClick?: () => void
  onGrowQuickClick?: () => void
  onOptimizeQuickClick?: () => void
  onProtectQuickClick?: () => void
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

const MainViewCopy = ({ onLogout: _onLogout, onQuestionClick: _onQuestionClick, onCreativeClick: _onCreativeClick, onIntegrationsClick, onSummaryQuickClick, onGrowQuickClick, onOptimizeQuickClick, onProtectQuickClick }: MainViewProps) => {
  const { selectedAccount, availableAccounts, selectAccount, sessionId } = useSession()
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [showBurgerMenu, setShowBurgerMenu] = useState(false)
  const [showAccountSelector, setShowAccountSelector] = useState(false) // New state for account selection popout
  const [isChatLoading, setIsChatLoading] = useState(false) // Track chat loading state
  const [isAccountSwitching, setIsAccountSwitching] = useState(false)
  const [showBrevoModal, setShowBrevoModal] = useState(false) // Brevo connection modal
  const [showMore, setShowMore] = useState(false) // Toggle for More button
  const [dateRange, setDateRange] = useState('30_days') // Date range for chat queries
  const [showDatePicker, setShowDatePicker] = useState(false) // Show date picker modal

  const handleAccountSwitch = async (accountId: string) => {
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
  }

  const getAccountIcon = (businessType?: string) => {
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
  }

  const handleChatSubmit = async (message: string) => {
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
      const sdk = getGlobalSDK()
      
      const response = await sdk.client.post<ChatResponse>('/api/chat', {
        message: message,
        session_id: sessionId,
        user_id: '106540664695114193744',
        google_ads_id: selectedAccount?.google_ads_id,
        ga4_property_id: selectedAccount?.ga4_property_id,
        date_range: dateRange
      })

      if (!response.success) {
        throw new Error(response.error || 'Chat request failed')
      }

      setIsChatLoading(false) // Remove loading state

      const result = response.data
      const assistantResponse = result?.claude_response || 'Sorry, I had trouble processing your question. Please try again.'
      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }])
      
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
  }

  return (
    <div className="w-full h-full safe-full relative bg-white flex flex-col">
      {/* Header - Conditional: Burger Menu OR Back Button */}
      <div className={`flex items-center px-4 py-1 relative z-20 shrink-0 ${!showChat ? 'justify-start' : 'justify-between'}`}>
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
              {showBurgerMenu && !showAccountSelector && (
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

              {/* Account Selector Popout */}
              {showBurgerMenu && showAccountSelector && (
                <div className="absolute top-8 left-0 bg-white rounded-lg shadow-lg border border-gray-200 min-w-64 z-30">
                  {/* Back Button */}
                  <button
                    onClick={() => setShowAccountSelector(false)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    <div className="font-medium text-gray-900 text-sm">Back</div>
                  </button>

                  {/* Available Accounts */}
                  <div className="px-2 py-2">
                    {availableAccounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => handleAccountSwitch(account.id)}
                        disabled={isAccountSwitching || account.id === selectedAccount?.id}
                        className={`w-full px-3 py-2 text-left rounded-lg flex items-center gap-3 text-sm transition-colors ${
                          account.id === selectedAccount?.id
                            ? 'bg-gray-50 text-gray-400 cursor-default'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                          style={{ backgroundColor: account.color }}
                        >
                          {getAccountIcon(account.business_type)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{account.name}</div>
                          <div className="text-xs text-gray-500">{account.business_type}</div>
                        </div>
                        {account.id === selectedAccount?.id && (
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {isAccountSwitching && account.id !== selectedAccount?.id && (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
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
            {/* Greeting - Vertically Centered */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center" style={{ width: '340px', marginTop: '-60px' }}>
              <h2 style={{
                color: '#000',
                textAlign: 'center',
                fontFamily: 'Geologica, system-ui, sans-serif',
                fontSize: '26px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '110%',
                letterSpacing: '-0.78px',
                marginBottom: '4px'
              }}>Hello Sean.</h2>
              <p style={{
                color: '#000',
                fontFamily: 'Geologica, system-ui, sans-serif',
                fontSize: '26px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '110%',
                letterSpacing: '-0.78px',
                margin: '0px'
              }}>How can I help today?</p>
            </div>

            {/* New Button Layout - Horizontal Pills */}

            {/* Row 1: Grow, Optimise, Protect - Horizontal */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2" style={{ marginTop: '20px' }}>
              {onGrowQuickClick && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    if (onGrowQuickClick) {
                      setTimeout(() => onGrowQuickClick(), 150)
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor: '#E6E6E6',
                    color: '#000',
                    fontFamily: 'Geologica, system-ui, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  Grow
                </button>
              )}

              {onOptimizeQuickClick && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    if (onOptimizeQuickClick) {
                      setTimeout(() => onOptimizeQuickClick(), 150)
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor: '#E6E6E6',
                    color: '#000',
                    fontFamily: 'Geologica, system-ui, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  Optimise
                </button>
              )}

              {onProtectQuickClick && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    if (onProtectQuickClick) {
                      setTimeout(() => onProtectQuickClick(), 150)
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor: '#E6E6E6',
                    color: '#000',
                    fontFamily: 'Geologica, system-ui, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  Protect
                </button>
              )}
            </div>

            {/* Row 2: More button OR Summary + Chat with Mia */}
            {!showMore ? (
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ marginTop: '72px' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setShowMore(true)
                  }}
                  className="inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor: '#E6E6E6',
                    color: '#000',
                    fontFamily: 'Geologica, system-ui, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    opacity: 0.5,
                    paddingLeft: '24px',
                    paddingRight: '24px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  More
                </button>
              </div>
            ) : (
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2" style={{ marginTop: '72px', marginLeft: '5px' }}>
                {onSummaryQuickClick && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      if (onSummaryQuickClick) {
                        setTimeout(() => onSummaryQuickClick(), 150)
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: '#E6E6E6',
                      color: '#000',
                      fontFamily: 'Geologica, system-ui, sans-serif',
                      fontSize: '14px',
                      fontWeight: 400,
                      paddingLeft: '24px',
                      paddingRight: '24px',
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      whiteSpace: 'nowrap',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    Summary
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setTimeout(() => setShowChat(true), 150)
                  }}
                  className="inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor: '#E6E6E6',
                    color: '#000',
                    fontFamily: 'Geologica, system-ui, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    whiteSpace: 'nowrap',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  Chat with Mia
                </button>
              </div>
            )}


          </>
        ) : (
          /* Chat Interface - iPhone 16 Optimized with proper flex layout */
          <div className="w-full h-full flex flex-col" style={{ maxWidth: '393px' }}>
            {/* Chat Messages - Scrollable area */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 chat-messages-container">
              {chatMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 text-gray-800 border border-gray-100'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed select-text">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Loading Indicator */}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 max-w-[85%]">
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm">Mia is analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input - Fixed at bottom and centered */}
            <div className="shrink-0 p-4 border-t border-gray-100 bg-white flex justify-center" style={{ paddingBottom: '5rem' }}>
              <div className="flex gap-2" style={{ maxWidth: '393px', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Ask about your marketing performance..."
                  className="flex-1 px-4 py-3.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  className="px-5 py-3.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm font-medium"
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
      />
    </div>
  )
}

export default MainViewCopy
