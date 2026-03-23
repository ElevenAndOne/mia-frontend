import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { CHAT_PLATFORM_CONFIG } from '../config/chat-platforms'
import { useIntegrationStatus } from '../../integrations/hooks/use-integration-status'
import { useIntegrationPrompt } from '../../integrations/hooks/use-integration-prompt'
import { usePlatformPreferences } from '../../integrations/hooks/use-platform-preferences'
import { sendChatMessage, confirmAction, pollActionStatus } from '../services/chat-service'
import type { PendingAction } from '../services/chat-service'
import { StorageKey } from '../../../constants/storage-keys'

export interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  pendingAction?: PendingAction
  actionStatus?: 'pending' | 'confirmed' | 'running' | 'completed' | 'failed'
  actionResult?: Record<string, unknown>
}

interface LocationState {
  newChat?: boolean
}

export const useChatView = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, sessionId, selectedAccount, activeWorkspace } = useSession()
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [dateRange, setDateRange] = useState(() =>
    localStorage.getItem(StorageKey.DATE_RANGE) || '30_days'
  )

  // Persist date range to localStorage
  useEffect(() => {
    localStorage.setItem(StorageKey.DATE_RANGE, dateRange)
  }, [dateRange])
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
        return status?.connected && status?.linked
      })
      .map((platform) => platform.id)
  }, [platformStatus])

  const integrationPrompt = useIntegrationPrompt({
    connectedPlatforms,
    isLoading: integrationStatusLoading,
    workspaceRole: activeWorkspace?.role,
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

  // Handle "New Chat" navigation state from menu/sidebar
  useEffect(() => {
    const state = location.state as LocationState | null
    if (state?.newChat) {
      setMessages([])
      setStreamingContent('')
      // Clear the navigation state so refresh doesn't re-trigger
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, location.pathname, navigate])

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
      // Build conversation history from existing messages (last 10 for context)
      const history = messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const result = await sendChatMessage({
        message,
        session_id: sessionId,
        user_id: user?.google_user_id || '',
        google_ads_id: selectedAccount?.google_ads_id,
        ga4_property_id: selectedAccount?.ga4_property_id,
        date_range: dateRange,
        selected_platforms: selectedPlatforms,
        conversation_history: history.length > 0 ? history : undefined,
      })

      const assistantMessage: ChatMessageItem = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.success && result.claude_response
          ? result.claude_response
          : 'Sorry, I had trouble processing your question. Please try again.',
        pendingAction: result.pending_action || undefined,
        actionStatus: result.pending_action ? 'pending' : undefined,
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
  }, [messages, sessionId, user?.google_user_id, selectedAccount?.google_ads_id, selectedAccount?.ga4_property_id, dateRange, selectedPlatforms])

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
      case 'predict':
        navigate('/insights/predict')
        break
    }
  }, [navigate, selectedPlatforms, dateRange])

  const handleConfirmAction = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message?.pendingAction || !sessionId) return

    // Update status to confirmed
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, actionStatus: 'confirmed' as const } : m
    ))

    try {
      const result = await confirmAction(sessionId, message.pendingAction)

      if (result.success && result.workflow_id) {
        // Update to running
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, actionStatus: 'running' as const } : m
        ))

        // Poll for completion
        const pollInterval = setInterval(async () => {
          try {
            const status = await pollActionStatus(sessionId, result.workflow_id!)
            if (status.status === 'completed') {
              clearInterval(pollInterval)
              setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, actionStatus: 'completed' as const, actionResult: status.result || undefined } : m
              ))
            } else if (status.status === 'failed') {
              clearInterval(pollInterval)
              setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, actionStatus: 'failed' as const, actionResult: status.result || undefined } : m
              ))
            }
          } catch {
            clearInterval(pollInterval)
            setMessages(prev => prev.map(m =>
              m.id === messageId ? { ...m, actionStatus: 'failed' as const } : m
            ))
          }
        }, 2000) // Poll every 2 seconds

        // Safety timeout — stop polling after 5 minutes
        setTimeout(() => clearInterval(pollInterval), 300000)
      } else {
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, actionStatus: 'failed' as const } : m
        ))
      }
    } catch (error) {
      console.error('[CHAT] Action confirm error:', error)
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, actionStatus: 'failed' as const } : m
      ))
    }
  }, [messages, sessionId])

  const handleCancelAction = useCallback((messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, pendingAction: undefined, actionStatus: undefined } : m
    ))
  }, [])

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
    handleConfirmAction,
    handleCancelAction,
    integrationPrompt,
  }
}
