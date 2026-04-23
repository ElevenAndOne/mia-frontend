import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { logger } from '../../../utils/logger'
import { CHAT_PLATFORM_CONFIG } from '../config/chat-platforms'
import { useIntegrationStatus } from '../../integrations/hooks/use-integration-status'
import { useIntegrationPrompt } from '../../integrations/hooks/use-integration-prompt'
import { usePlatformPreferences } from '../../integrations/hooks/use-platform-preferences'
import {
  sendChatMessage,
  confirmAction,
  pollActionStatus,
  fetchConversationMessages,
} from '../services/chat-service'
import type { PendingAction } from '../services/chat-service'
import { StorageKey } from '../../../constants/storage-keys'

export interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  hidden?: boolean
  pendingAction?: PendingAction
  actionStatus?: 'pending' | 'confirmed' | 'running' | 'completed' | 'failed'
  actionResult?: Record<string, unknown>
}

interface LocationState {
  newChat?: boolean
  loadConversationId?: string
}

export const useChatView = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, sessionId, selectedAccount, activeWorkspace } = useSession()
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState(
    () => localStorage.getItem(StorageKey.DATE_RANGE) || '30_days'
  )

  // Persist date range to localStorage
  useEffect(() => {
    localStorage.setItem(StorageKey.DATE_RANGE, dateRange)
  }, [dateRange])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastUserMsgRef = useRef<HTMLDivElement>(null)
  const justSubmittedRef = useRef(false)
  const actionPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const actionPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      abortControllerRef.current?.abort()
      if (actionPollIntervalRef.current) clearInterval(actionPollIntervalRef.current)
      if (actionPollTimeoutRef.current) clearTimeout(actionPollTimeoutRef.current)
    }
  }, [])

  const { platformStatus, isLoading: integrationStatusLoading } = useIntegrationStatus(
    sessionId,
    selectedAccount?.id,
    activeWorkspace?.tenant_id
  )

  const connectedPlatforms = useMemo(() => {
    if (!platformStatus) return []

    return CHAT_PLATFORM_CONFIG.filter((platform) => {
      const status = platformStatus[platform.statusKey as keyof typeof platformStatus]
      return status?.connected
    }).map((platform) => platform.id)
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

  // After submitting, scroll so the user's message is near the top of the viewport
  useEffect(() => {
    if (!justSubmittedRef.current) return
    justSubmittedRef.current = false
    const container = scrollContainerRef.current
    const userMsg = lastUserMsgRef.current
    if (!container || !userMsg) return
    const msgTopRelative =
      userMsg.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop
    container.scrollTo({ top: Math.max(0, msgTopRelative - 16), behavior: 'smooth' })
  }, [messages])

  // During streaming: follow scroll only if already near the bottom
  useEffect(() => {
    if (!streamingContent) return
    const container = scrollContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    if (scrollHeight - scrollTop - clientHeight < 250) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamingContent])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setStreamingContent('')
    setConversationId(null)
  }, [])

  const loadConversation = useCallback(
    async (convId: string) => {
      if (!sessionId) return
      setIsLoading(true)
      const msgs = await fetchConversationMessages(sessionId, convId)
      if (msgs.length > 0) {
        setMessages(
          msgs.map((m, i) => ({
            id: `${m.role}-loaded-${i}`,
            role: m.role,
            content: m.content,
          }))
        )
        setConversationId(convId)
      }
      setIsLoading(false)
    },
    [sessionId]
  )

  // Handle "New Chat" / load-conversation navigation state from menu/sidebar
  useEffect(() => {
    const state = location.state as LocationState | null
    if (state?.newChat) {
      setMessages([])
      setStreamingContent('')
      setConversationId(null)
      navigate(location.pathname, { replace: true, state: {} })
    } else if (state?.loadConversationId) {
      const convId = state.loadConversationId
      navigate(location.pathname, { replace: true, state: {} })
      loadConversation(convId)
    }
  }, [location.state, location.pathname, navigate, loadConversation])

  const handleSubmit = useCallback(
    async (message: string, options?: { hidden?: boolean }) => {
      // Generate a conversation ID on the first message of a new chat session
      const activeConvId =
        conversationId ??
        (() => {
          const newId = crypto.randomUUID()
          setConversationId(newId)
          return newId
        })()

      const userMessage: ChatMessageItem = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        hidden: options?.hidden,
      }

      justSubmittedRef.current = true
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setStreamingContent('')

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        // Build conversation history from existing messages (last 20 for context)
        // Include completed action results so Claude knows what was created
        const history = messages.slice(-40).map((m) => {
          let content = m.content
          if (m.actionStatus === 'completed' && m.actionResult) {
            const resultMsg = (m.actionResult as Record<string, unknown>).message as
              | string
              | undefined
            if (resultMsg) {
              content += `\n\n[Action completed: ${resultMsg}]`
            }
          }
          return { role: m.role as 'user' | 'assistant', content }
        })

        const result = await sendChatMessage(
          {
            message,
            session_id: sessionId,
            user_id: user?.google_user_id || '',
            google_ads_id: selectedAccount?.google_ads_id,
            ga4_property_id: selectedAccount?.ga4_property_id,
            date_range: dateRange,
            selected_platforms: selectedPlatforms,
            conversation_history: history.length > 0 ? history : undefined,
            conversation_id: activeConvId,
          },
          abortController.signal
        )

        const assistantMessage: ChatMessageItem = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content:
            result.success && result.claude_response
              ? result.claude_response
              : 'Sorry, I had trouble processing your question. Please try again.',
          pendingAction: result.pending_action || undefined,
          actionStatus: result.pending_action ? 'pending' : undefined,
        }

        setMessages((prev) => [...prev, assistantMessage])
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // User cancelled — remove the unsent user message, stay silent
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
        } else {
          logger.error('[CHAT] Error:', error)
          const errorMessage: ChatMessageItem = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: 'Connection error. Please check your connection and try again.',
          }
          setMessages((prev) => [...prev, errorMessage])
        }
      } finally {
        abortControllerRef.current = null
        setIsLoading(false)
      }
    },
    [
      messages,
      sessionId,
      user?.google_user_id,
      selectedAccount?.google_ads_id,
      selectedAccount?.ga4_property_id,
      dateRange,
      selectedPlatforms,
      conversationId,
    ]
  )

  const handleQuickAction = useCallback(
    (actionId: string) => {
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
    },
    [navigate, selectedPlatforms, dateRange]
  )

  // Ref to allow action completion to trigger a follow-up chat message
  const handleSubmitRef = useRef(handleSubmit)
  useEffect(() => {
    handleSubmitRef.current = handleSubmit
  }, [handleSubmit])

  const handleConfirmAction = useCallback(
    async (messageId: string) => {
      const message = messages.find((m) => m.id === messageId)
      if (!message?.pendingAction || !sessionId) return

      // Update status to confirmed
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, actionStatus: 'confirmed' as const } : m))
      )

      try {
        const result = await confirmAction(sessionId, message.pendingAction)

        if (result.success && result.workflow_id) {
          // Update to running
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, actionStatus: 'running' as const } : m))
          )

          // Poll for completion
          const stopPolling = () => {
            if (actionPollIntervalRef.current) {
              clearInterval(actionPollIntervalRef.current)
              actionPollIntervalRef.current = null
            }
            if (actionPollTimeoutRef.current) {
              clearTimeout(actionPollTimeoutRef.current)
              actionPollTimeoutRef.current = null
            }
          }

          actionPollIntervalRef.current = setInterval(async () => {
            try {
              const status = await pollActionStatus(sessionId, result.workflow_id!)
              if (status.status === 'completed') {
                stopPolling()
                const resultMsg = status.result?.message || 'Action completed'
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === messageId
                      ? {
                          ...m,
                          actionStatus: 'completed' as const,
                          actionResult: status.result || undefined,
                        }
                      : m
                  )
                )
                // Auto-continue the chain: only fire when Claude flagged more steps pending
                if (message.pendingAction?.continue_chain) {
                  setTimeout(() => {
                    if (isMountedRef.current) {
                      handleSubmitRef.current(
                        `[Action completed: ${resultMsg}] Please continue with the next step.`,
                        { hidden: true }
                      )
                    }
                  }, 500)
                }
              } else if (status.status === 'failed') {
                stopPolling()
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === messageId
                      ? {
                          ...m,
                          actionStatus: 'failed' as const,
                          actionResult: status.result || undefined,
                        }
                      : m
                  )
                )
              }
            } catch {
              stopPolling()
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId ? { ...m, actionStatus: 'failed' as const } : m
                )
              )
            }
          }, 2000) // Poll every 2 seconds

          // Safety timeout — stop polling after 5 minutes
          actionPollTimeoutRef.current = setTimeout(stopPolling, 300000)
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, actionStatus: 'failed' as const } : m))
          )
        }
      } catch (error) {
        logger.error('[CHAT] Action confirm error:', error)
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, actionStatus: 'failed' as const } : m))
        )
      }
    },
    [messages, sessionId]
  )

  const handleCancelAction = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, pendingAction: undefined, actionStatus: undefined } : m
      )
    )
  }, [])

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const handleBack = useCallback(() => {
    abortControllerRef.current?.abort()
    setMessages([])
    setStreamingContent('')
    setConversationId(null)
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
    scrollContainerRef,
    lastUserMsgRef,
    handleNewChat,
    handleSubmit,
    handleQuickAction,
    handleConfirmAction,
    handleCancelAction,
    handleCancel,
    handleBack,
    integrationPrompt,
    loadConversation,
  }
}
