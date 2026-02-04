import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { CHAT_PLATFORM_CONFIG } from '../config/chat-platforms'
import { useIntegrationStatus } from '../../integrations/hooks/use-integration-status'
import { useIntegrationPrompt } from '../../integrations/hooks/use-integration-prompt'
import { usePlatformPreferences } from '../../integrations/hooks/use-platform-preferences'
import { sendChatMessage } from '../services/chat-service'

interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export const useChatView = () => {
  const navigate = useNavigate()
  const { user, sessionId, selectedAccount, activeWorkspace } = useSession()
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [dateRange, setDateRange] = useState('30_days')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { platformStatus, isLoading: integrationStatusLoading } = useIntegrationStatus(
    sessionId,
    selectedAccount?.id,
    activeWorkspace?.tenant_id,
  )

  const connectedPlatforms = useMemo(() => {
    if (!platformStatus) return []

    return CHAT_PLATFORM_CONFIG
      .filter((platform) => {
        const status = platformStatus[platform.statusKey as keyof typeof platformStatus]
        return status?.connected
      })
      .map((platform) => platform.id)
  }, [platformStatus])

  const integrationPrompt = useIntegrationPrompt({
    connectedPlatforms,
    isLoading: integrationStatusLoading,
  })

  const { selectedPlatforms, togglePlatform } = usePlatformPreferences({
    sessionId,
    selectedAccountId: selectedAccount?.id,
    connectedPlatforms,
  })

  const platforms = useMemo(() => {
    return CHAT_PLATFORM_CONFIG.map((platform) => ({
      id: platform.id,
      name: platform.name,
      icon: platform.icon,
      connected: connectedPlatforms.includes(platform.id),
    }))
  }, [connectedPlatforms])

  const hasSelectedPlatforms = selectedPlatforms.length > 0
  const hasMessages = messages.length > 0

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setStreamingContent('')
  }, [])

  const handleSubmit = useCallback(async (message: string) => {
    const userMessage: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setStreamingContent('')

    try {
      const result = await sendChatMessage({
        message,
        session_id: sessionId,
        user_id: user?.google_user_id || '',
        google_ads_id: selectedAccount?.google_ads_id,
        ga4_property_id: selectedAccount?.ga4_property_id,
        date_range: dateRange,
        selected_platforms: selectedPlatforms,
      })

      const assistantMessage: ChatMessageItem = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.success && result.claude_response
          ? result.claude_response
          : 'Sorry, I had trouble processing your question. Please try again.',
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('[CHAT] Error:', error)
      const errorMessage: ChatMessageItem = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Connection error. Please check your connection and try again.',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, user?.google_user_id, selectedAccount?.google_ads_id, selectedAccount?.ga4_property_id, dateRange, selectedPlatforms])

  const handleQuickAction = useCallback((actionId: string) => {
    const params = new URLSearchParams()
    if (selectedPlatforms.length > 0) {
      params.set('platforms', selectedPlatforms.join(','))
    }
    params.set('range', dateRange)

    switch (actionId) {
      case 'grow':
        navigate(`/insights/grow?${params.toString()}`)
        break
      case 'optimize':
        navigate(`/insights/optimize?${params.toString()}`)
        break
      case 'protect':
        navigate(`/insights/protect?${params.toString()}`)
        break
    }
  }, [navigate, selectedPlatforms, dateRange])

  return {
    userName: user?.name?.split(' ')[0],
    messages,
    isLoading,
    streamingContent,
    dateRange,
    setDateRange,
    platforms,
    selectedPlatforms,
    togglePlatform,
    hasSelectedPlatforms,
    hasMessages,
    messagesEndRef,
    handleNewChat,
    handleSubmit,
    handleQuickAction,
    integrationPrompt,
  }
}
