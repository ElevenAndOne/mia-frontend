import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { formatDateRangeDisplay } from '../../../utils/date-range'
import { sendChatMessage } from '../../chat/services/chat-service'
import { PLATFORM_CONFIG } from '../../integrations/config/platforms'
import { usePlatformPreferences } from '../../integrations/hooks/use-platform-preferences'

interface DashboardChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const useDashboardPage = () => {
  const navigate = useNavigate()
  const {
    selectedAccount,
    availableAccounts,
    selectAccount,
    sessionId,
    refreshAccounts,
    user,
    activeWorkspace,
    refreshWorkspaces,
    logout,
  } = useSession()
  const renderTimestamp = new Date().toISOString().split('T')[1].substring(0, 12)
  console.log(`[${renderTimestamp}] [DashboardPage] activeWorkspace:`, activeWorkspace?.tenant_id, activeWorkspace?.name)
  console.log(`[${renderTimestamp}] [DashboardPage] connected_platforms:`, activeWorkspace?.connected_platforms)

  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<DashboardChatMessage[]>([])
  const [showBurgerMenu, setShowBurgerMenu] = useState(false)
  const [showAccountSelector, setShowAccountSelector] = useState(false)
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false)
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isAccountSwitching, setIsAccountSwitching] = useState(false)
  const [showBrevoModal, setShowBrevoModal] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [dateRange, setDateRange] = useState('30_days')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const datePickerButtonRef = useRef<HTMLButtonElement>(null)

  const platformConfig = PLATFORM_CONFIG

  const connectedPlatforms = useMemo(() => {
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 12)
    console.log(`[${timestamp}] [DashboardPage] Computing connectedPlatforms...`)
    console.log(`[${timestamp}] [DashboardPage] activeWorkspace?.connected_platforms:`, activeWorkspace?.connected_platforms)
    if (activeWorkspace?.connected_platforms) {
      console.log(`[${timestamp}] [DashboardPage] Returning:`, activeWorkspace.connected_platforms)
      return activeWorkspace.connected_platforms
    }
    console.log(`[${timestamp}] [DashboardPage] No platforms, returning empty array`)
    return []
  }, [activeWorkspace])

  const { selectedPlatforms, togglePlatform } = usePlatformPreferences({
    sessionId,
    selectedAccountId: selectedAccount?.id,
    connectedPlatforms,
  })

  const configurationGuidance = useMemo(() => {
    const needsConfig: string[] = []

    if (connectedPlatforms.includes('google_ads') && !selectedAccount?.ga4_property_id) {
      needsConfig.push('Google Analytics property')
    }

    if (connectedPlatforms.includes('meta_ads') && !selectedAccount?.facebook_page_id) {
      needsConfig.push('Facebook Page')
    }

    if (needsConfig.length === 0) return null

    return `Select your ${needsConfig.join(' and ')} in Integrations to unlock more insights`
  }, [connectedPlatforms, selectedAccount?.ga4_property_id, selectedAccount?.facebook_page_id])

  useEffect(() => {
    if (sessionId) {
      refreshAccounts()
      refreshWorkspaces().catch(err => console.error('[MainView] Failed to refresh workspaces:', err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAccountSwitch = useCallback(async (accountId: string) => {
    if (isAccountSwitching) return

    setIsAccountSwitching(true)
    setShowBurgerMenu(false)
    setShowAccountSelector(false)

    try {
      const success = await selectAccount(accountId)

      if (success) {
        setChatMessages([])
        setTimeout(() => {
          setIsAccountSwitching(false)
          navigate('/integrations')
        }, 500)
      } else {
        console.error('❌ [MAIN] Failed to switch account')
        setIsAccountSwitching(false)
      }
    } catch (error) {
      console.error('❌ [MAIN] Account switch error:', error)
      setIsAccountSwitching(false)
    }
  }, [isAccountSwitching, navigate, selectAccount])

  const handleChatSubmit = useCallback(async (message: string) => {
    if (!message.trim()) return

    setChatMessages(prev => [...prev, { role: 'user', content: message }])
    setIsChatLoading(true)

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

      setIsChatLoading(false)

      if (result.success && result.claude_response) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: result.claude_response }])
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble processing your question. Please try again.' }])
      }

      setTimeout(() => {
        const chatContainer = document.querySelector('.chat-messages-container')
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight - 100
        }
      }, 100)
    } catch (error) {
      console.error('[CHAT] Error:', error)
      setIsChatLoading(false)
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please check your connection and try again.' }])
    }
  }, [dateRange, selectedAccount?.ga4_property_id, selectedAccount?.google_ads_id, sessionId, user?.google_user_id])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const onIntegrationsClick = () => navigate('/integrations')
  const onWorkspaceSettingsClick = () => navigate('/settings/workspace')

  const onGrowQuickClick = (platforms?: string[]) => {
    const params = new URLSearchParams()
    if (platforms?.length) params.set('platforms', platforms.join(','))
    navigate(`/insights/grow?${params.toString()}`, { state: { showDatePicker: true } })
  }

  const onOptimizeQuickClick = (platforms?: string[]) => {
    const params = new URLSearchParams()
    if (platforms?.length) params.set('platforms', platforms.join(','))
    navigate(`/insights/optimize?${params.toString()}`, { state: { showDatePicker: true } })
  }

  const onProtectQuickClick = (platforms?: string[]) => {
    const params = new URLSearchParams()
    if (platforms?.length) params.set('platforms', platforms.join(','))
    navigate(`/insights/protect?${params.toString()}`, { state: { showDatePicker: true } })
  }

  const userName = user?.name?.split(' ')[0] || 'there'
  const dateRangeLabel = formatDateRangeDisplay(dateRange, 'short')

  return {
    selectedAccount, availableAccounts, activeWorkspace, platformConfig,
    userName, dateRangeLabel, showChat, chatMessages,
    showBurgerMenu, showAccountSelector, showWorkspaceSwitcher, showCreateWorkspaceModal,
    isChatLoading, isAccountSwitching, showBrevoModal, showMore, dateRange, showDatePicker,
    connectedPlatforms, selectedPlatforms, configurationGuidance, datePickerButtonRef,
    setShowChat, setShowBurgerMenu, setShowAccountSelector, setShowWorkspaceSwitcher, setShowCreateWorkspaceModal,
    setShowBrevoModal, setShowMore, setShowDatePicker, setDateRange, togglePlatform,
    handleAccountSwitch, handleChatSubmit, handleLogout,
    onIntegrationsClick, onWorkspaceSettingsClick, onGrowQuickClick, onOptimizeQuickClick, onProtectQuickClick,
  }
}
