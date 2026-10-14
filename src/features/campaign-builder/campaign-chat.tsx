import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChatMarkdown } from '../../components/chat-markdown'
import { useSession } from '../../contexts/session-context'
import { fetchConversationMessages, sendChatMessageStreaming } from '../chat/services/chat-service'
import { buildKey } from './use-build'

// The chat docked beside the campaign page (plan §8.3). It is the campaign's own chat: one
// conversation per campaign, reopened from the page. Mia sees the brief and the draft plan and
// can change them; after each reply the page re-reads its state, so her edits show at once.

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

export function CampaignChat({
  campaignId,
  conversationId,
  onChanged,
}: {
  campaignId: string
  conversationId: string
  onChanged?: () => void
}) {
  const { sessionId, activeWorkspace, user } = useSession()
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<Msg[]>([])
  const [streaming, setStreaming] = useState('')
  const [status, setStatus] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sessionId) return
    fetchConversationMessages(sessionId, conversationId)
      .then((m) => setMessages(m.map((x) => ({ role: x.role, content: x.content }))))
      .catch(() => setMessages([])) // a new campaign has no conversation yet
  }, [sessionId, conversationId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, streaming])

  const send = async () => {
    const text = input.trim()
    if (!text || !sessionId || loading) return
    const history = [...messages, { role: 'user' as const, content: text }]
    setMessages(history)
    setInput('')
    setLoading(true)
    setStreaming('')
    setStatus('')
    let received = ''
    let afterTool = false // Mia's reply resumes after a tool call: start a new paragraph
    try {
      await sendChatMessageStreaming(
        {
          message: text,
          session_id: sessionId,
          user_id: user?.google_user_id ?? '',
          date_range: '30_days',
          conversation_history: history.slice(-40),
          conversation_id: conversationId,
          campaign_page_id: campaignId,
        },
        (chunk) => {
          if (chunk.text) {
            if (afterTool && received && !received.endsWith('\n')) received += '\n\n'
            afterTool = false
            received += chunk.text
            setStreaming(received)
          } else if (chunk.status && chunk.status !== 'thinking') {
            afterTool = true
            setStatus(chunk.status)
          }
        },
      )
      setMessages((prev) => [...prev, { role: 'assistant', content: received || 'Something went wrong. Try again.' }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
      setStreaming('')
      setStatus('')
      onChanged?.() // before the refetch, so the page can tell this change came from the chat
      await queryClient.invalidateQueries({ queryKey: buildKey(activeWorkspace?.tenant_id, campaignId) })
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-secondary bg-primary" aria-label="Chat with Mia about this campaign">
      <header className="border-b border-secondary px-4 py-3">
        <p className="subheading-sm text-primary">Mia</p>
        <p className="paragraph-xs text-tertiary">Ask her to change the brief or the plan. Changes show on the page.</p>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {messages.length === 0 && !streaming ? (
          <p className="paragraph-sm text-tertiary">
            Try: “Make the budget R80k”, “Drop the emailer”, or “Why this concept?”
          </p>
        ) : null}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <p key={i} className="self-end max-w-[85%] rounded-xl bg-secondary px-3 py-2 paragraph-sm text-primary whitespace-pre-wrap">
              {m.content}
            </p>
          ) : (
            <ChatMarkdown key={i} content={m.content} className="paragraph-sm text-primary" />
          ),
        )}
        {loading ? (
          streaming ? (
            <ChatMarkdown content={streaming} className="paragraph-sm text-primary" />
          ) : (
            <p className="paragraph-xs text-tertiary">{status || 'Mia is thinking…'}</p>
          )
        ) : null}
        <div ref={endRef} />
      </div>
      <form
        className="border-t border-secondary p-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <label htmlFor="campaign-chat-input" className="sr-only">
          Message Mia
        </label>
        <textarea
          id="campaign-chat-input"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
          placeholder="Message Mia about this campaign"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="self-end rounded-lg bg-brand-solid px-3 py-2 paragraph-sm text-primary-onbrand disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </aside>
  )
}
