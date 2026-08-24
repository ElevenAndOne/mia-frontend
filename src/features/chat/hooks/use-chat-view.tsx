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
import { listDatasets } from '../../integrations/services/dataset-service'
import { trackEvent } from '../../../utils/tracking'
import {
  sendChatMessageStreaming,
  confirmAction,
  pollActionStatus,
  fetchConversationMessages,
  transcribeAudio,
  uploadChatFile,
  submitChatFeedback,
} from '../services/chat-service'
import type {
  PendingAction,
  AttachedDocument,
  CanvasDocument,
  DocumentContext,
} from '../services/chat-service'
import { useCanvas } from './use-canvas'
import { useThinkingPhrase } from './use-thinking-phrase'
import type { ChatImageJob } from '../components/chat-image-card'
import { collapseEdits, miaCreateApi, type MiaAsset } from '../../creative-studio/creative-studio-api'
import { StorageKey } from '../../../constants/storage-keys'
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
  /** chat_history row id — present once the turn is persisted; thumbs target this. */
  historyId?: number | null
  /** This user's recorded vote on the message (1 / -1), if any. */
  feedback?: 1 | -1 | null
  images?: string[]
  /** Creative generated during this turn — each renders as a polling image card. */
  imageJobs?: ChatImageJob[]
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
  // chat_history id awaiting thumbs-down details (null = modal closed)
  const [feedbackModalTarget, setFeedbackModalTarget] = useState<number | null>(null)
  // Empty by default → the whimsical rotating phrase shows; a real tool status
  // ("Checking your Google Ads performance…") overrides it when one arrives.
  const [thinkingText, setThinkingText] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [documents, setDocuments] = useState<AttachedDocument[]>([])
  // Image pinned as the edit target: the next generation edits THIS image instead of
  // the conversation's most recent one. {asset_id, cdn_url} — see CHAT_IMAGE_GEN_SCOPE.md.
  // The ref mirrors the state SYNCHRONOUSLY so "pin then submit in the same tick"
  // (the Use-in-post button) sends the fresh pin, not the stale closure value.
  const [editTarget, setEditTargetState] = useState<{ asset_id: string; cdn_url: string } | null>(null)
  const editTargetRef = useRef<{ asset_id: string; cdn_url: string } | null>(null)
  const setEditTarget = useCallback(
    (t: { asset_id: string; cdn_url: string } | null) => {
      editTargetRef.current = t
      setEditTargetState(t)
    },
    []
  )
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
  // Canvas document-event sink. Held in a ref because handleSubmit's onChunk (defined
  // below) needs it, but the canvas hook is instantiated after handleSubmit.
  const canvasDocEventRef = useRef<((doc: CanvasDocument) => void) | null>(null)
  // Same deal for the canvas refetch used by disconnect recovery.
  const canvasReloadRef = useRef<(() => void) | null>(null)

  // Interval-based streaming reveal — same mechanism as Quick Insights.
  // Text accumulates in receivedRef instantly; a fixed setInterval drip-feeds it to
  // display state at a steady pace INDEPENDENT of chunk arrival timing.
  // This decouples bursty network chunks from render cadence (key to smoothness).
  const receivedRef = useRef('')
  const displayIndexRef = useRef(0)
  const streamDoneRef = useRef(false)
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Resolves handleSubmit's "wait for the final flush" promise the moment the
  // reveal interval stops — replaces the old 40ms polling loop that watched
  // revealIntervalRef go null.
  const revealDoneRef = useRef<(() => void) | null>(null)
  const resolveRevealDone = useCallback(() => {
    revealDoneRef.current?.()
    revealDoneRef.current = null
  }, [])
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
      resolveRevealDone()
    }
  }, [])

  const { platformStatus, isLoading: integrationStatusLoading } = useIntegrationStatus(
    sessionId,
    selectedAccount?.id,
    activeWorkspace?.tenant_id
  )

  // Uploaded CSV datasets are "connected" for the picker when the workspace has ≥1.
  // Resolved here (not via platformStatus) since datasets are workspace-level, not
  // account-selectable. Flipping this true auto-enables the 'csv' toggle via
  // usePlatformPreferences' newly-connected detection — same as any real platform.
  const [hasDatasets, setHasDatasets] = useState(false)
  useEffect(() => {
    const tenantId = activeWorkspace?.tenant_id
    if (!sessionId || !tenantId) {
      setHasDatasets(false)
      return
    }
    let cancelled = false
    listDatasets(sessionId)
      .then((ds) => {
        if (!cancelled) setHasDatasets(ds.length > 0)
      })
      .catch(() => {
        if (!cancelled) setHasDatasets(false)
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, activeWorkspace?.tenant_id])

  const connectedPlatforms = useMemo(() => {
    const base = platformStatus
      ? CHAT_PLATFORM_CONFIG.filter((platform) => {
          if (platform.id === 'csv') return false // resolved via hasDatasets below
          const status = platformStatus[platform.statusKey as keyof typeof platformStatus]
          return status?.connected
        }).map((platform) => platform.id)
      : []
    if (hasDatasets) base.push('csv')
    return base
  }, [platformStatus, hasDatasets])

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

  // Rotate a whimsical phrase while loading and no real tool status has arrived.
  const thinkingPhrase = useThinkingPhrase(isLoading && !thinkingText)

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
    // The pin belongs to the thread it was set in — a new chat starts unpinned.
    setEditTarget(null)
    localStorage.removeItem(StorageKey.LAST_CONVERSATION)
    localStorage.removeItem(StorageKey.LAST_CANVAS_OPEN)
  }, [])

  // Image cards aren't persisted in chat history — every generated asset carries
  // conversation_id, so on reopen we fetch the conversation's assets, group them back
  // into cards (a set shares a variant_group; single jobs by job_id), and anchor each
  // card to the last assistant turn at/before its first asset was created.
  const restoreImageCards = useCallback(
    async (convId: string, msgs: Awaited<ReturnType<typeof fetchConversationMessages>>) => {
      const tenantId = activeWorkspace?.tenant_id
      if (!sessionId || !tenantId) return
      try {
        const [listed, pending] = await Promise.all([
          miaCreateApi.listConversationAssets(sessionId, tenantId, convId),
          miaCreateApi.listPendingJobs(sessionId, tenantId, convId),
        ])
        // An edit replaces the tile it came from — otherwise every version ever rendered
        // came back as its own card and the grid grew on each visit (2026-08-20).
        const assets = collapseEdits(listed.assets)
        if (!assets.length && !pending.jobs.length) return

        const groups = new Map<string, MiaAsset[]>()
        for (const a of assets) {
          const key = a.variant_group || a.job_id || a.asset_id
          groups.set(key, [...(groups.get(key) ?? []), a])
        }

        const assistants = msgs
          .map((m, i) => ({ m, id: `${m.role}-loaded-${i}` }))
          .filter((x) => x.m.role === 'assistant')
        if (!assistants.length) return

        const jobsByMsgId = new Map<string, ChatImageJob[]>()
        for (const group of groups.values()) {
          group.sort((x, y) => (x.created_at || '').localeCompare(y.created_at || ''))
          const t0 = group[0].created_at || ''
          // Last assistant turn that predates the first asset (ISO strings compare
          // lexicographically). Falls back to the first turn if none do.
          let anchor = assistants[0]
          for (const x of assistants) {
            if (!x.m.at || !t0 || x.m.at <= t0) anchor = x
          }
          const card: ChatImageJob = {
            tool: group.length > 1 && group.every((a) => a.ratio)
              ? 'make_placement_set'
              : 'generate_creative',
            status: 'done',
            job_id: group[0].job_id ?? null,
            variant_group: group[0].variant_group ?? null,
            num_images: group.length,
            assets: group,
          }
          jobsByMsgId.set(anchor.id, [...(jobsByMsgId.get(anchor.id) ?? []), card])
        }

        // Generations still running: attach a card with no assets so it resumes polling.
        // Grouped by variant_group so a 3-variant set is one card, not three.
        const pendingGroups = new Map<string, typeof pending.jobs>()
        for (const j of pending.jobs) {
          const key = j.variant_group || j.job_id
          pendingGroups.set(key, [...(pendingGroups.get(key) ?? []), j])
        }
        const lastAssistant = assistants[assistants.length - 1]
        for (const group of pendingGroups.values()) {
          jobsByMsgId.set(lastAssistant.id, [
            ...(jobsByMsgId.get(lastAssistant.id) ?? []),
            {
              tool: 'generate_creative',
              status: 'generating',
              job_id: group[0].variant_group ? null : group[0].job_id,
              variant_group: group[0].variant_group ?? null,
              num_images: group.length,
            },
          ])
        }

        setMessages((prev) =>
          prev.map((m) => (jobsByMsgId.has(m.id) ? { ...m, imageJobs: jobsByMsgId.get(m.id) } : m))
        )
      } catch {
        // Best-effort — a reopened thread without its images is still usable.
      }
    },
    [sessionId, activeWorkspace?.tenant_id]
  )

  const loadConversation = useCallback(
    async (convId: string) => {
      if (!sessionId) return
      setIsLoading(true)
      try {
        const msgs = await fetchConversationMessages(sessionId, convId)
        if (msgs.length > 0) {
          setMessages(
            msgs.map((m, i) => ({
              id: `${m.role}-loaded-${i}`,
              role: m.role,
              content: m.content,
              // Assistant rows carry their chat_history id + this user's existing vote,
              // so thumbs keep working (and show voted state) on reopened conversations.
              historyId: m.history_id ?? null,
              feedback: m.feedback ?? null,
            }))
          )
          setConversationId(convId)
          // A reopened thread starts unpinned; its image cards restore just below.
          setEditTarget(null)
          void restoreImageCards(convId, msgs)
        }
      } catch {
        showToast('error', "Couldn't open that conversation. Please try again.")
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, showToast, restoreImageCards, setEditTarget]
  )

  // Handle "New Chat" / load-conversation navigation state from menu/sidebar
  useEffect(() => {
    const state = location.state as LocationState | null
    if (state?.newChat) {
      setMessages([])
      setStreamingContent('')
      setConversationId(null)
      setEditTarget(null)
      localStorage.removeItem(StorageKey.LAST_CONVERSATION)
      navigate(location.pathname, { replace: true, state: {} })
    } else if (state?.loadConversationId) {
      const convId = state.loadConversationId
      navigate(location.pathname, { replace: true, state: {} })
      loadConversation(convId)
    }
  }, [location.state, location.pathname, navigate, loadConversation, setEditTarget])

  // Remember the open conversation (refreshed as messages arrive) so a phone tab
  // the OS killed in the background can pick up where the user left off.
  useEffect(() => {
    const tenantId = activeWorkspace?.tenant_id
    if (!conversationId || !tenantId) return
    localStorage.setItem(
      StorageKey.LAST_CONVERSATION,
      JSON.stringify({ id: conversationId, tenantId, ts: Date.now() })
    )
  }, [conversationId, messages.length, activeWorkspace?.tenant_id])

  // Resume that conversation on a cold start — mobile only (desktop opens fresh
  // by habit; phones lose the tab to memory pressure mid-task), same workspace,
  // and only within 30 minutes so tomorrow's session still starts clean.
  const resumeAttemptedRef = useRef(false)
  useEffect(() => {
    if (resumeAttemptedRef.current) return
    const tenantId = activeWorkspace?.tenant_id
    if (!sessionId || !tenantId) return
    const state = location.state as LocationState | null
    if (conversationId || messages.length > 0 || state?.newChat || state?.loadConversationId) {
      resumeAttemptedRef.current = true
      return
    }
    resumeAttemptedRef.current = true
    if (!window.matchMedia('(max-width: 767px)').matches) return
    try {
      const raw = localStorage.getItem(StorageKey.LAST_CONVERSATION)
      if (!raw) return
      const saved = JSON.parse(raw) as { id?: string; tenantId?: string; ts?: number }
      if (!saved.id || saved.tenantId !== tenantId) return
      if (!saved.ts || Date.now() - saved.ts > 30 * 60 * 1000) return
      void loadConversation(saved.id)
    } catch {
      /* corrupted key — start fresh */
    }
  }, [
    sessionId,
    activeWorkspace?.tenant_id,
    conversationId,
    messages.length,
    location.state,
    loadConversation,
  ])

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

  // A dropped stream usually means the phone backgrounded the tab (mobile
  // browsers kill in-flight fetches on screen lock / app switch). The backend
  // finishes the turn regardless and saves it to history — so wait until the
  // tab is visible again, then poll history for the reply to this turn.
  const recoverInterruptedTurn = useCallback(
    async (
      convId: string,
      userMessage: string
    ): Promise<{ content: string; historyId: number | null } | null> => {
      if (!sessionId) return null
      if (document.visibilityState !== 'visible') {
        await new Promise<void>((resolve) => {
          const onVisible = () => {
            if (document.visibilityState === 'visible') {
              document.removeEventListener('visibilitychange', onVisible)
              resolve()
            }
          }
          document.addEventListener('visibilitychange', onVisible)
        })
      }
      const deadline = Date.now() + 150_000
      while (Date.now() < deadline) {
        try {
          const msgs = await fetchConversationMessages(sessionId, convId)
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'user' && msgs[i].content === userMessage) {
              const reply = msgs[i + 1]
              if (reply && reply.role === 'assistant' && reply.content) {
                return { content: reply.content, historyId: reply.history_id ?? null }
              }
              break // turn found but Mia hasn't finished — poll again
            }
          }
        } catch {
          // backend unreachable (device still regaining network) — keep trying
        }
        await new Promise((r) => setTimeout(r, 3000))
      }
      return null
    },
    [sessionId]
  )

  const handleSubmit = useCallback(
    async (
      message: string,
      options?: { hidden?: boolean; documentContext?: DocumentContext }
    ) => {
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
      resolveRevealDone()

      trackEvent(sessionId, 'chat_message_sent', 'home', {
        has_images: pendingImages.length > 0,
        has_documents: pendingDocuments.length > 0,
        platform_count: selectedPlatforms.length,
      })
      justSubmittedRef.current = true
      // Sending a message IS intent to follow the reply — re-enable auto-scroll even if
      // the user had scrolled up earlier (otherwise the generating image card renders
      // below the fold and never gets revealed).
      shouldAutoScrollRef.current = true
      setMessages((prev) => [...prev, userMessage])
      setImages([])
      setDocuments([])
      setIsLoading(true)
      setStreamingContent('')
      setThinkingText('')

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Start reveal interval — fires every 40ms INDEPENDENT of chunk arrival.
      // Each tick reveals CHARS_PER_TICK chars from the accumulated buffer.
      // When streaming is done, flushes all remaining text immediately so there
      // is zero trailing lag after Claude finishes generating. (At 125 chars/sec
      // a steady drip kept "typing" a long answer for 15s+ after the model was
      // already done — flush-on-done is what the original design intended.)
      revealIntervalRef.current = setInterval(() => {
        const target = receivedRef.current.length
        const current = displayIndexRef.current
        const remaining = target - current

        if (streamDoneRef.current) {
          // Stream finished — flush whatever is left in one go, then stop.
          if (remaining > 0 && isMountedRef.current) {
            displayIndexRef.current = target
            setStreamingContent(receivedRef.current)
            if (shouldAutoScrollRef.current) messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
          }
          if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)
          revealIntervalRef.current = null
          resolveRevealDone()
        } else if (remaining > 0) {
          // Drip at a steady pace while the model is still generating.
          displayIndexRef.current = current + Math.min(CHARS_PER_TICK, remaining)
          if (isMountedRef.current) {
            setStreamingContent(receivedRef.current.slice(0, displayIndexRef.current))
            // Only follow the stream while the user is pinned to the bottom. Use 'auto'
            // (instant) not 'smooth' — a queued smooth animation re-fired every 40ms is
            // what fought the user when they tried to scroll up.
            if (shouldAutoScrollRef.current) messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
          }
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
        let historyId: number | null = null
        // ChatImageJob, not ImageJobEvent: the raw SSE assets (nullable, no media_type)
        // are normalized on push into renderable MiaAssets.
        const imageJobs: ChatImageJob[] = []
        // A failure reported mid-stream, surfaced after the turn settles so whatever text
        // did arrive is still shown.
        let streamError: string | null = null

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
            ...(options?.documentContext
              ? { document_context: options.documentContext }
              : {}),
            ...(editTargetRef.current
              ? { edit_target_asset_id: editTargetRef.current.asset_id }
              : {}),
          },
          (chunk) => {
            // The stream can report a mid-turn failure. With no branch for it the event
            // was dropped and the user got the generic "something went wrong" fallback
            // instead of the actual reason (rate limit, tool error, cap reached).
            if (chunk.error) {
              streamError = chunk.error
              return
            }
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
            } else if (chunk.history_id !== undefined) {
              // Final event: the persisted chat_history row id — thumbs feedback target.
              historyId = chunk.history_id
            } else if (chunk.document) {
              canvasDocEventRef.current?.(chunk.document)
            } else if (chunk.image_job) {
              // Creative started (or finished) this turn — the card polls for the images.
              // Sync results carry stored assets; normalize them to renderable MiaAssets.
              imageJobs.push({
                ...chunk.image_job,
                assets: chunk.image_job.assets?.map((a) => ({
                  media_type: 'image' as const,
                  ...a,
                })),
              })
            }
          },
          abortController.signal
        )

        // Signal done — the next interval tick flushes remaining text and stops.
        // Wait for that flush before snapping to the final markdown message.
        streamDoneRef.current = true
        await new Promise<void>((resolve) => {
          if (revealIntervalRef.current === null) resolve()
          else revealDoneRef.current = resolve
        })

        const finalContent = accumulated || 'Sorry, I had trouble processing your question. Please try again.'
        const assistantMessage: ChatMessageItem = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: finalContent,
          pendingAction,
          actionStatus: pendingAction ? 'pending' : undefined,
          skillWorkspaces,
          historyId,
          imageJobs: imageJobs.length > 0 ? imageJobs : undefined,
        }
        setMessages((prev) => [...prev, assistantMessage])
        // The settled message can be TALLER than the streamed text (image cards render
        // skeleton placeholders below it) — nudge the view down so the generating card
        // is visible, unless the user has scrolled up to read something.
        if (shouldAutoScrollRef.current) {
          requestAnimationFrame(() =>
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          )
        }
        // A pin is consumed by the generation it produced: once the edit exists, follow-up
        // instructions should chain on the newest image (the edit result), not keep
        // re-editing the original. Turns with no generation leave the pin in place.
        if (imageJobs.length > 0 && editTargetRef.current) setEditTarget(null)
        if (streamError) showToast('error', streamError)
      } catch (error) {
        if (revealIntervalRef.current) {
          clearInterval(revealIntervalRef.current)
          revealIntervalRef.current = null
        }
        resolveRevealDone()
        if (error instanceof Error && error.name === 'AbortError') {
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
        } else {
          logger.error('[CHAT] Error:', error)
          // Mia keeps working server-side through a disconnect — try to pick the
          // finished reply out of history before showing an error.
          setThinkingText('Reconnecting…')
          const recovered = await recoverInterruptedTurn(activeConvId, message)
          if (recovered) {
            setMessages((prev) => [
              ...prev,
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: recovered.content,
                historyId: recovered.historyId,
              },
            ])
            // Canvas documents created while we were away were persisted too.
            canvasReloadRef.current?.()
          } else {
            const errorMessage: ChatMessageItem = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: 'Connection error. Please check your connection and try again.',
            }
            setMessages((prev) => [...prev, errorMessage])
          }
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
      editTarget,
      setEditTarget,
      recoverInterruptedTurn,
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

  // Canvas (highlight-to-edit). An edit goes through the normal send path with
  // document_context attached; Mia's `document` SSE event then updates the pane.
  const sendCanvasEdit = useCallback((message: string, documentContext: DocumentContext) => {
    // hidden: true keeps the internal edit instruction ("Rewrite only the highlighted
    // text…") out of the visible chat thread; Mia's short confirmation still shows.
    handleSubmitRef.current(message, { documentContext, hidden: true })
  }, [])
  const canvas = useCanvas({ sessionId, conversationId, onSendEdit: sendCanvasEdit })
  useEffect(() => {
    canvasDocEventRef.current = canvas.handleDocumentEvent
    canvasReloadRef.current = canvas.reloadDocuments
  }, [canvas.handleDocumentEvent, canvas.reloadDocuments])

  const handleConfirmAction = useCallback(
    async (messageId: string, overrideParams?: Record<string, unknown>) => {
      const message = messages.find((m) => m.id === messageId)
      if (!message?.pendingAction || !sessionId) return

      // Update status to confirmed
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, actionStatus: 'confirmed' as const } : m))
      )

      // Edited gold-card values (campaign actions) override the proposed params.
      const actionToConfirm = overrideParams
        ? { ...message.pendingAction, params: overrideParams }
        : message.pendingAction

      try {
        const result = await confirmAction(sessionId, actionToConfirm)

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
                // A Temporal workflow can COMPLETE while the underlying activity
                // returned success:false (e.g. Meta rejected the write). Treat that
                // as a failure so the card shows red, not a misleading green.
                const succeeded =
                  (status.result as Record<string, unknown> | undefined)?.success !== false
                const resultMsg =
                  (status.result?.message as string | undefined) ||
                  (succeeded ? 'Action completed' : 'Action failed')
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === messageId
                      ? {
                          ...m,
                          actionStatus: succeeded ? ('completed' as const) : ('failed' as const),
                          actionResult: status.result || undefined,
                        }
                      : m
                  )
                )
                // Auto-continue the chain: only on genuine success + more steps pending
                if (succeeded && message.pendingAction?.continue_chain) {
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
    async (messageId: string, historyId: number, rating: 1 | -1) => {
      if (!sessionId) return
      // Optimistic — the thumb lights up immediately; a failed POST is non-critical.
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m))
      )
      if (rating === -1) {
        // Claude-style detail dialog. The -1 below is recorded regardless — dismissing
        // the modal loses nothing; submitting upserts category/details onto the row.
        setFeedbackModalTarget(historyId)
      }
      try {
        await submitChatFeedback(sessionId, historyId, rating)
      } catch {
        // fire-and-forget — feedback errors are non-critical
      }
    },
    [sessionId]
  )

  const handleFeedbackModalSubmit = useCallback(
    async (category: string | undefined, details: string | undefined) => {
      const target = feedbackModalTarget
      setFeedbackModalTarget(null)
      if (!sessionId || target === null || (!category && !details)) return
      try {
        await submitChatFeedback(sessionId, target, -1, category, details)
      } catch {
        // fire-and-forget — feedback errors are non-critical
      }
    },
    [sessionId, feedbackModalTarget]
  )

  const closeFeedbackModal = useCallback(() => setFeedbackModalTarget(null), [])

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
    thinkingText: thinkingText || thinkingPhrase,
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
    feedbackModalOpen: feedbackModalTarget !== null,
    handleFeedbackModalSubmit,
    closeFeedbackModal,
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
    canvas,
    editTarget,
    setEditTarget,
  }
}
