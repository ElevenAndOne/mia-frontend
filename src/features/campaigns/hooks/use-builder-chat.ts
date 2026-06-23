import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { clearTrackerCache } from '../../campaign/services/campaign-tracker-service'
import { clearCampaignDetailCache } from '../campaign-detail-cache'
import {
  fetchConversationMessages,
  fetchRecentConversations,
  sendChatMessageStreaming,
  uploadChatFile,
  type AttachedDocument,
  type RecentConversation,
} from '../../chat/services/chat-service'
import { fetchCampaignList } from '../services/campaign-api'

interface Message { role: 'user' | 'assistant'; content: string }

// Drives the empty-state "Build a campaign" chat. Streams Mia's reply, supports
// PDF/Markdown brief upload, lists past builds, and navigates into the new
// campaign's Builder once one is saved.
export function useBuilderChat() {
  const { sessionId, activeWorkspace, user } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const navigate = useNavigate()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinking, setThinking] = useState('Thinking…')
  const [streaming, setStreaming] = useState('')
  const [pdfUploading, setPdfUploading] = useState(false)
  const [pastBuilds, setPastBuilds] = useState<RecentConversation[]>([])
  const conversationId = useRef<string | null>(null)
  const knownIds = useRef<Set<string>>(new Set())

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

  const pollForSavedCampaign = useCallback(async () => {
    if (!sessionId || !tenantId) return
    const list = await fetchCampaignList(sessionId, tenantId).catch(() => null)
    if (!list) return
    const created = list.find((c) => !knownIds.current.has(c.campaign_id))
    if (created) {
      clearTrackerCache()
      clearCampaignDetailCache()
      navigate(`/campaigns/${created.campaign_id}/builder`)
    }
  }, [sessionId, tenantId, navigate])

  const runStream = useCallback(
    async (content: string, documents?: AttachedDocument[]) => {
      if (!sessionId) return
      const convId = ensureConversation()
      const history = [...messages, { role: 'user' as const, content }]
      setMessages(history)
      setLoading(true)
      setThinking('Thinking…')
      setStreaming('')
      let acc = ''
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
          },
          (chunk) => {
            if (chunk.text) { acc += chunk.text; setStreaming(acc) }
            else if (chunk.status && chunk.status !== 'thinking') setThinking(chunk.status)
          },
        )
        setMessages((prev) => [...prev, { role: 'assistant', content: acc || 'Something went wrong. Try again.' }])
        setTimeout(() => void pollForSavedCampaign(), 1000)
      } catch {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
      } finally {
        setLoading(false)
        setStreaming('')
      }
    },
    [sessionId, user, messages, pollForSavedCampaign],
  )

  const send = useCallback(
    (text?: string) => {
      const value = (text ?? input).trim()
      if (!value || loading) return
      setInput('')
      void runStream(value)
    },
    [input, loading, runStream],
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
    setPastBuilds(await fetchRecentConversations(sessionId, 'strategy_planning'))
  }, [sessionId])

  const loadPastBuild = useCallback(async (convId: string) => {
    if (!sessionId) return
    const msgs = await fetchConversationMessages(sessionId, convId)
    setMessages(msgs.map((m) => ({ role: m.role, content: m.content })))
    conversationId.current = convId
  }, [sessionId])

  const startFresh = useCallback(() => {
    setMessages([])
    setStreaming('')
    conversationId.current = null
  }, [])

  return {
    messages, input, setInput, loading, thinking, streaming, pdfUploading,
    pastBuilds, send, handlePdf, openHistory, loadPastBuild, startFresh,
  }
}
