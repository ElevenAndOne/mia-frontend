import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { logger } from '../../../utils/logger'
import { clearTrackerCache } from '../../campaign/services/campaign-tracker-service'
import { clearCampaignDetailCache } from '../../campaigns/campaign-detail-cache'
import { CHAT_PLATFORM_CONFIG } from '../config/chat-platforms'
import { useIntegrationStatus } from '../../integrations/hooks/use-integration-status'
import { useIntegrationPrompt } from '../../integrations/hooks/use-integration-prompt'
import { usePlatformPreferences } from '../../integrations/hooks/use-platform-preferences'
import { trackEvent } from '../../../utils/tracking'
import {
  sendChatMessageStreaming,
  confirmAction,
  pollActionStatus,
  fetchConversationMessages,
  transcribeAudio,
  uploadChatFile,
} from '../services/chat-service'
import type { PendingAction, AttachedDocument } from '../services/chat-service'
import { StorageKey } from '../../../constants/storage-keys'
import { submitSkillFeedback } from '../../marketing-context/services/marketing-context-service'
import type { CampaignInfo } from '../../campaign/components/race-campaign-tracker'

export interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  hidden?: boolean
  isStreaming?: boolean
  pendingAction?: PendingAction
  actionStatus?: 'pending' | 'confirmed' | 'running' | 'completed' | 'failed'
  actionResult?: Record<string, unknown>
  skillWorkspaces?: string[]
  images?: string[]
}

interface LocationState {
  newChat?: boolean
  loadConversationId?: string
}

export const useChatView = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, sessionId, selectedAccount, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [thinkingText, setThinkingText] = useState('Thinking...')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [documents, setDocuments] = useState<AttachedDocument[]>([])
  const [activeCampaign, setActiveCampaign] = useState<CampaignInfo | null>(null)
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

  // Interval-based streaming reveal — same mechanism as Quick Insights.
  // Text accumulates in receivedRef instantly; a fixed setInterval drip-feeds it to
  // display state at a steady pace INDEPENDENT of chunk arrival timing.
  // This decouples bursty network chunks from render cadence (key to smoothness).
  const receivedRef = useRef('')
  const displayIndexRef = useRef(0)
  const streamDoneRef = useRef(false)
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const REVEAL_INTERVAL_MS = 40  // ~25 ticks/sec (same as Quick Insights)
  const CHARS_PER_TICK = 5       // 125 chars/sec
  // Auto-scroll only when the user is already near the bottom — don't yank them
  // down while they've scrolled up to read.
  // Auto-scroll bookkeeping. We follow the stream ONLY while the user is parked at
  // the very bottom. Any upward intent (wheel-up or an upward scroll delta) pauses
  // following immediately; returning to the bottom resumes it. We detect intent
  // rather than a "near bottom" threshold because the 40ms reveal tick re-scrolls
  // continuously — a threshold check would re-snap the user back on every tick.
  const shouldAutoScrollRef = useRef(true)
  const prevScrollTopRef = useRef(0)
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    const goingUp = el.scrollTop < prevScrollTopRef.current - 1
    // Upward intent ALWAYS wins. A small scroll-up keeps the user inside the 24px
    // "atBottom" band, so if we re-enabled on atBottom first the reveal tick would
    // snap them back every 40ms — they'd have to fling >24px in one event to escape.
    // Only resume following once they're back at the bottom and NOT scrolling up.
    if (goingUp) shouldAutoScrollRef.current = false
    else if (atBottom) shouldAutoScrollRef.current = true
    prevScrollTopRef.current = el.scrollTop
  }, [])
  // Wheel-up is unambiguous user intent — pause instantly so a tick can't beat the
  // scroll event to the punch.
  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (e.deltaY < 0) shouldAutoScrollRef.current = false
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      abortControllerRef.current?.abort()
      if (actionPollIntervalRef.current) clearInterval(actionPollIntervalRef.current)
      if (actionPollTimeoutRef.current) clearTimeout(actionPollTimeoutRef.current)
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)
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

  const handleCampaignChange = useCallback((info: CampaignInfo | null) => {
    setActiveCampaign(info)
  }, [])

  const addImages = useCallback((newImages: string[]) => {
    setImages((prev) => [...prev, ...newImages].slice(0, 10))
  }, [])

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addDocument = useCallback(
    async (file: File) => {
      const result = await uploadChatFile(sessionId || 'default', file)
      if (result.type === 'image') {
        setImages((prev) => [...prev, result.data_url].slice(0, 10))
      } else if (result.type === 'pdf_images') {
        // Image-based PDF (Figma exports, slide decks) — each page becomes a vision image
        setImages((prev) => [...prev, ...result.pages].slice(0, 10))
      } else if (result.b64) {
        setDocuments((prev) => [...prev, { filename: result.filename, b64: result.b64 }])
      } else if (result.content) {
        setDocuments((prev) => [...prev, { filename: result.filename, content: result.content }])
      }
    },
    [sessionId]
  )

  const removeDocument = useCallback((index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = useCallback(
    async (message: string, options?: { hidden?: boolean }) => {
      const pendingImages = images.slice()
      const pendingDocuments = documents.slice()
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
        images: pendingImages.length > 0 ? pendingImages : undefined,
      }

      // Reset reveal state
      receivedRef.current = ''
      displayIndexRef.current = 0
      streamDoneRef.current = false
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)

      trackEvent(sessionId, 'chat_message_sent', 'home', {
        has_images: pendingImages.length > 0,
        has_documents: pendingDocuments.length > 0,
        platform_count: selectedPlatforms.length,
      })
      justSubmittedRef.current = true
      setMessages((prev) => [...prev, userMessage])
      setImages([])
      setDocuments([])
      setIsLoading(true)
      setStreamingContent('')
      setThinkingText('Thinking...')

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Start reveal interval — fires every 40ms INDEPENDENT of chunk arrival.
      // Each tick reveals CHARS_PER_TICK chars from the accumulated buffer.
      // When streaming is done, flushes all remaining text immediately so there
      // is zero trailing lag after Claude finishes generating.
      revealIntervalRef.current = setInterval(() => {
        const target = receivedRef.current.length
        const current = displayIndexRef.current
        const remaining = target - current

        if (remaining > 0) {
          // Always drip at steady pace — even after streaming ends, keep the consistent reveal
          displayIndexRef.current = current + Math.min(CHARS_PER_TICK, remaining)
          if (isMountedRef.current) {
            setStreamingContent(receivedRef.current.slice(0, displayIndexRef.current))
            // Only follow the stream while the user is pinned to the bottom. Use 'auto'
            // (instant) not 'smooth' — a queued smooth animation re-fired every 40ms is
            // what fought the user when they tried to scroll up.
            if (shouldAutoScrollRef.current) messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
          }
        } else if (streamDoneRef.current) {
          // Buffer fully caught up and streaming is done — stop
          if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)
          revealIntervalRef.current = null
        }
      }, REVEAL_INTERVAL_MS)

      try {
        const history = messages.slice(-60).map((m) => {
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

        let accumulated = ''
        let pendingAction: PendingAction | undefined
        let skillWorkspaces: string[] = []

        await sendChatMessageStreaming(
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
            images: pendingImages.length > 0 ? pendingImages : undefined,
            documents: pendingDocuments.length > 0 ? pendingDocuments : undefined,
            ...(activeCampaign
              ? {
                  campaign_id: activeCampaign.campaignId,
                  start_date: activeCampaign.startDate ?? undefined,
                  end_date: activeCampaign.endDate ?? undefined,
                }
              : {}),
          },
          (chunk) => {
            if (chunk.text) {
              accumulated += chunk.text
              receivedRef.current = accumulated  // interval reads this; no setState here
              // Backgrounded tab throttles the reveal interval — flush straight to
              // display so Mia keeps "typing" while you're on another tab.
              if (document.hidden) {
                displayIndexRef.current = accumulated.length
                setStreamingContent(accumulated)
              }
            } else if (chunk.status) {
              if (chunk.status !== 'thinking') setThinkingText(chunk.status)
            } else if (chunk.pending_action) {
              pendingAction = chunk.pending_action
            } else if (chunk.skill_workspaces) {
              skillWorkspaces = chunk.skill_workspaces
            }
          },
          abortController.signal
        )

        // Signal done — interval will flush remaining text and stop itself
        streamDoneRef.current = true

        // Wait for interval to finish flushing before snapping to final markdown
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (revealIntervalRef.current === null) {
              clearInterval(check)
              resolve()
            }
          }, REVEAL_INTERVAL_MS)
        })

        const finalContent = accumulated || 'Sorry, I had trouble processing your question. Please try again.'
        const assistantMessage: ChatMessageItem = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: finalContent,
          pendingAction,
          actionStatus: pendingAction ? 'pending' : undefined,
          skillWorkspaces,
        }
        setMessages((prev) => [...prev, assistantMessage])
      } catch (error) {
        if (revealIntervalRef.current) {
          clearInterval(revealIntervalRef.current)
          revealIntervalRef.current = null
        }
        if (error instanceof Error && error.name === 'AbortError') {
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
        setStreamingContent('')
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
      images,
      documents,
      activeCampaign,
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
        case 'strategise':
          navigate('/insights/strategise')
          break
        case 'predict':
          navigate('/predict')
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
        } else if (result.success && !result.workflow_id) {
          // Synchronous action completed immediately (e.g. campaign_add_channel_action)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, actionStatus: 'completed' as const, actionResult: result as Record<string, unknown> }
                : m
            )
          )
          // Campaign write: bust both caches so the Campaigns page shows fresh data
          // when the user navigates there (no auto-navigate — keep them in the chat flow).
          if (message.pendingAction?.action_type === 'campaign_add_channel_action') {
            clearTrackerCache()
            clearCampaignDetailCache()
            const phaseName = (result as Record<string, unknown>).phase_name as string | undefined
            showToast(
              'success',
              phaseName
                ? `Added to ${phaseName} phase ✓ Open Campaigns to view.`
                : 'Added to campaign ✓ Open Campaigns to view.',
              7000
            )
          }
          // Auto-continue a multi-step sequence (e.g. items spanning several phases),
          // same as the workflow path — otherwise the chain dies after the first confirm
          // and the model is tempted to fabricate the remaining steps.
          if (message.pendingAction?.continue_chain) {
            const resultMsg =
              ((result as Record<string, unknown>).message as string) || 'Action completed'
            setTimeout(() => {
              if (isMountedRef.current) {
                handleSubmitRef.current(
                  `[Action completed: ${resultMsg}] Please continue with the next step.`,
                  { hidden: true }
                )
              }
            }, 500)
          }
        } else {
          // Synchronous action rejected by the backend — show its real reason.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, actionStatus: 'failed' as const, actionResult: result as Record<string, unknown> }
                : m
            )
          )
        }
      } catch (error) {
        logger.error('[CHAT] Action confirm error:', error)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  actionStatus: 'failed' as const,
                  actionResult: { error: error instanceof Error ? error.message : String(error) },
                }
              : m
          )
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

  const handleFeedback = useCallback(
    async (feedback: 1 | -1, workspaceIds: string[], messageContent: string) => {
      if (!sessionId || workspaceIds.length === 0) return
      try {
        await submitSkillFeedback(sessionId, workspaceIds, messageContent, feedback)
      } catch {
        // fire-and-forget — feedback errors are non-critical
      }
    },
    [sessionId]
  )

  const handleTranscribeAudio = useCallback(
    async (audioBlob: Blob, mimeType: string): Promise<string> => {
      if (!sessionId) return ''
      return transcribeAudio(sessionId, audioBlob, mimeType)
    },
    [sessionId]
  )

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
    thinkingText,
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
    handleScroll,
    handleWheel,
    handleNewChat,
    handleSubmit,
    handleQuickAction,
    handleConfirmAction,
    handleCancelAction,
    handleCancel,
    handleBack,
    handleFeedback,
    handleTranscribeAudio,
    integrationPrompt,
    loadConversation,
    images,
    addImages,
    removeImage,
    documents,
    addDocument,
    removeDocument,
    activeCampaign,
    handleCampaignChange,
  }
}
