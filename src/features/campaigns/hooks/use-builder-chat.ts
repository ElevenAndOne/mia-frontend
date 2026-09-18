import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { clearTrackerCache } from '../../campaign/services/campaign-tracker-service'
import { clearCampaignDetailCache } from '../campaign-detail-cache'
import {
  fetchConversationMessages,
  fetchRecentConversations,
  sendChatMessageStreaming,
  uploadChatFile,
  type AssetContext,
  type AttachedDocument,
  type RecentConversation,
} from '../../chat/services/chat-service'
import { useThinkingPhrase } from '../../chat/hooks/use-thinking-phrase'
import { fetchCampaignByConversation, fetchCampaignList } from '../services/campaign-api'
import { campaignListKey } from './use-campaign-list'

interface Message { role: 'user' | 'assistant'; content: string }

// Drives the empty-state "Build a campaign" chat. Streams Mia's reply, supports
// PDF/Markdown brief upload, lists past builds, and opens the builder canvas
// beside the chat as phases are saved (the user stays in the conversation).
export function useBuilderChat() {
  const { sessionId, activeWorkspace, user } = useSession()
  const { showToast } = useToast()
  const tenantId = activeWorkspace?.tenant_id

  const [messages, setMessages] = useState<Message[]>([])
  // The campaign being built this conversation — set by the campaign_saved stream
  // event (or the poll fallback); drives the canvas pane beside the chat.
  const [builtCampaignId, setBuiltCampaignId] = useState<string | null>(null)
  const [canvasRefresh, setCanvasRefresh] = useState(0)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  // Empty → rotating whimsical phrase; a real backend status (e.g. "Building your
  // campaign plan…", "Saving campaign phases…") overrides it.
  const [thinking, setThinking] = useState('')
  const [streaming, setStreaming] = useState('')
  const [pdfUploading, setPdfUploading] = useState(false)
  const [pastBuilds, setPastBuilds] = useState<RecentConversation[]>([])
  const conversationId = useRef<string | null>(null)
  const knownIds = useRef<Set<string>>(new Set())

  // Interval-based streaming reveal — identical mechanism to normal chat v2
  // (use-chat-view). Text accumulates in receivedRef instantly; a fixed 40ms
  // setInterval drip-feeds it to display state at a steady pace INDEPENDENT of
  // bursty chunk arrival. This is what makes the type-out smooth instead of choppy.
  const receivedRef = useRef('')
  const displayIndexRef = useRef(0)
  const streamDoneRef = useRef(false)
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)
  const REVEAL_INTERVAL_MS = 40 // ~25 ticks/sec
  const CHARS_PER_TICK = 5 // 125 chars/sec

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (!sessionId || !tenantId) return
    fetchCampaignList(sessionId, tenantId)
      .then((list) => { knownIds.current = new Set(list.map((c) => c.campaign_id)) })
      .catch(() => {})
  }, [sessionId, tenantId])

  const ensureConversation = () => {
    if (!conversationId.current) conversationId.current = crypto.randomUUID() // bare UUID — fits varchar(36)
    return conversationId.current
  }

  // A phase (or whole campaign) was saved — open/refresh the canvas pane. The user
  // stays in the chat; "Open in builder" in the canvas header navigates when ready.
  const queryClient = useQueryClient()
  const handleCampaignSaved = useCallback((campaignId: string) => {
    knownIds.current.add(campaignId)
    clearTrackerCache()
    clearCampaignDetailCache()
    // The campaign list is React-Query cached (5 min stale) — without this, a campaign
    // built in chat is invisible on /campaigns and in the switcher until the cache ages.
    void queryClient.invalidateQueries({ queryKey: campaignListKey(tenantId) })
    setBuiltCampaignId(campaignId)
    setCanvasRefresh((n) => n + 1)
  }, [queryClient, tenantId])

  // Fallback for the rare turn where the stream event is missed (e.g. disconnect
  // mid-save): diff the campaign list and populate the canvas the same way.
  const pollForSavedCampaign = useCallback(async () => {
    if (!sessionId || !tenantId) return
    const list = await fetchCampaignList(sessionId, tenantId).catch(() => null)
    if (!list) return
    const created = list.find((c) => !knownIds.current.has(c.campaign_id))
    if (created) handleCampaignSaved(created.campaign_id)
  }, [sessionId, tenantId, handleCampaignSaved])

  const runStream = useCallback(
    async (content: string, documents?: AttachedDocument[], assetContext?: AssetContext) => {
      if (!sessionId) return
      const convId = ensureConversation()
      const history = [...messages, { role: 'user' as const, content }]
      setMessages(history)
      setLoading(true)
      setThinking('')
      setStreaming('')

      // Reset + start the steady reveal tick (decoupled from chunk arrival).
      receivedRef.current = ''
      displayIndexRef.current = 0
      streamDoneRef.current = false
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)
      revealIntervalRef.current = setInterval(() => {
        const remaining = receivedRef.current.length - displayIndexRef.current
        if (streamDoneRef.current) {
          // Stream finished — flush the tail in one paint instead of dripping it out.
          if (remaining > 0 && isMountedRef.current) {
            displayIndexRef.current = receivedRef.current.length
            setStreaming(receivedRef.current)
          }
          if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)
          revealIntervalRef.current = null
        } else if (remaining > 0) {
          displayIndexRef.current += Math.min(CHARS_PER_TICK, remaining)
          if (isMountedRef.current) setStreaming(receivedRef.current.slice(0, displayIndexRef.current))
        }
      }, REVEAL_INTERVAL_MS)

      try {
        await sendChatMessageStreaming(
          {
            message: content,
            session_id: sessionId,
            user_id: user?.google_user_id ?? '',
            date_range: '30_days',
            conversation_history: history.slice(-60),
            workspace_hint: 'strategy_planning',
            conversation_id: convId,
            ...(documents ? { documents } : {}),
            ...(assetContext ? { asset_context: assetContext } : {}),
          },
          (chunk) => {
            if (chunk.text) {
              receivedRef.current += chunk.text
              // Backgrounded tab throttles setInterval — flush straight to display.
              if (document.hidden) {
                displayIndexRef.current = receivedRef.current.length
                setStreaming(receivedRef.current)
              }
            } else if (chunk.campaign_saved?.campaign_id) {
              handleCampaignSaved(chunk.campaign_saved.campaign_id)
            } else if (chunk.asset_updated) {
              // Span-patch landed on the Asset row — refresh the canvas (and any
              // campaign views) so the edited field shows immediately.
              clearCampaignDetailCache()
              setCanvasRefresh((n) => n + 1)
            } else if (chunk.status && chunk.status !== 'thinking') setThinking(chunk.status)
          },
        )
        // Signal done — let the reveal tick flush the remainder, then settle.
        streamDoneRef.current = true
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (revealIntervalRef.current === null) { clearInterval(check); resolve() }
          }, REVEAL_INTERVAL_MS)
        })
        setMessages((prev) => [...prev, { role: 'assistant', content: receivedRef.current || 'Something went wrong. Try again.' }])
        setTimeout(() => void pollForSavedCampaign(), 1000)
      } catch {
        if (revealIntervalRef.current) { clearInterval(revealIntervalRef.current); revealIntervalRef.current = null }
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
      } finally {
        setLoading(false)
        setStreaming('')
      }
    },
    [sessionId, user, messages, pollForSavedCampaign, handleCampaignSaved],
  )

  // Large pastes (a brief, a strategy doc) become an attached "Pasted text" card —
  // same behaviour as the main chat — instead of a wall of text in the composer.
  const [pendingDocs, setPendingDocs] = useState<AttachedDocument[]>([])
  const addPastedText = useCallback((text: string) => {
    setPendingDocs((prev) => {
      const pasteCount = prev.filter((d) => d.filename.startsWith('Pasted text')).length
      const filename = pasteCount === 0 ? 'Pasted text' : `Pasted text ${pasteCount + 1}`
      return [...prev, { filename, content: `File: ${filename}\n\n${text}` }]
    })
  }, [])
  const removePendingDoc = useCallback((index: number) => {
    setPendingDocs((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const send = useCallback(
    (text?: string) => {
      const value = (text ?? input).trim()
      if (!value || loading) return
      setInput('')
      const docs = pendingDocs.length > 0 ? pendingDocs : undefined
      setPendingDocs([])
      void runStream(value, docs)
    },
    [input, loading, runStream, pendingDocs],
  )

  // Highlight-to-edit from the builder canvas: sends the instruction as a normal
  // builder turn with the asset context attached; Mia calls edit_asset_field and
  // the asset_updated event above refreshes the canvas.
  const sendAssetEdit = useCallback(
    (instruction: string, assetContext: AssetContext) => {
      if (!instruction.trim() || loading) return
      void runStream(instruction.trim(), undefined, assetContext)
    },
    [loading, runStream],
  )

  const handlePdf = useCallback(
    async (file: File) => {
      if (!sessionId) return
      setPdfUploading(true)
      try {
        const result = await uploadChatFile(sessionId, file)
        let doc: AttachedDocument | null = null
        if (result.type === 'document') doc = { filename: result.filename, content: result.content ?? '' }
        else if (result.type === 'pdf_images') doc = { filename: result.filename, content: `[PDF: ${result.filename} — ${result.pages.length} pages attached as images]` }
        setPdfUploading(false)
        if (!doc) return
        await runStream(`Here is our campaign brief (${file.name}). Please build a full campaign from it.`, [doc])
      } catch {
        setPdfUploading(false)
      }
    },
    [sessionId, runStream],
  )

  const openHistory = useCallback(async () => {
    if (!sessionId) return
    try {
      setPastBuilds(await fetchRecentConversations(sessionId, 'strategy_planning'))
    } catch {
      showToast('error', "Couldn't load your past builds. Please try again.")
    }
  }, [sessionId, showToast])

  const loadPastBuild = useCallback(async (convId: string) => {
    if (!sessionId) return
    let msgs
    try {
      msgs = await fetchConversationMessages(sessionId, convId)
    } catch {
      showToast('error', "Couldn't load that build. Please try again.")
      return
    }
    setMessages(msgs.map((m) => ({ role: m.role, content: m.content })))
    conversationId.current = convId
    // Restore the canvas: assets record the conversation that built them, so a
    // saved past build reopens with its campaign canvas beside the chat.
    setBuiltCampaignId(null)
    if (tenantId) {
      const campaignId = await fetchCampaignByConversation(sessionId, tenantId, convId).catch(
        () => null,
      )
      if (campaignId) {
        knownIds.current.add(campaignId)
        setBuiltCampaignId(campaignId)
        setCanvasRefresh((n) => n + 1)
      }
    }
  }, [sessionId, tenantId, showToast])

  const startFresh = useCallback(() => {
    setMessages([])
    setStreaming('')
    conversationId.current = null
    setBuiltCampaignId(null)
  }, [])

  const thinkingPhrase = useThinkingPhrase(loading && !thinking)

  return {
    messages, input, setInput, loading, thinking: thinking || thinkingPhrase, streaming, pdfUploading,
    pastBuilds, send, handlePdf, openHistory, loadPastBuild, startFresh,
    builtCampaignId, canvasRefresh, sendAssetEdit,
    pendingDocs, addPastedText, removePendingDoc,
  }
}
