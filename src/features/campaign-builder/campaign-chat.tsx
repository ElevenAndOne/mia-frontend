import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChatMarkdown } from '../../components/chat-markdown'
import { useSession } from '../../contexts/session-context'
import { fetchConversationMessages, sendChatMessageStreaming } from '../chat/services/chat-service'
import { buildKey } from './use-build'
import { ASK_EVENT, clearFocus, type AskFocus } from './components/your-turn'

// The chat docked beside the campaign page (plan §8.3). It is the campaign's own chat: one
// conversation per campaign, reopened from the page. Mia sees the brief and the draft plan and
// can change them; after each reply the page re-reads its state, so her edits show at once.
// Streaming and scrolling work like the main Mia chat (use-chat-view): the text is revealed at a steady
// pace, and the view only follows the reply while the PM is at the bottom (19 Oct).

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const PIN_PREFIX = '📌 About: '
const REVEAL_INTERVAL_MS = 40 // same pace as the main chat: ~125 characters a second
const CHARS_PER_TICK = 5
// "Ask Mia" pins the item to the message box and waits for the PM (local test 27 Oct: it sent a stock question at once,
// and two presses gave two generic answers). These are one-tap starts; the PM can type their own instead.
const QUICK_ASKS = ['Why this?', 'How would you fix it?']
const CONNECTION_ERROR = 'Connection error. Please try again.'
const FAILED = 'Something went wrong. Try again.'

type Pending = { id: string; summary: string[]; at?: string; about?: string }

export function CampaignChat({
  campaignId,
  conversationId,
  pending = [],
  busy = null,
  error = null,
  errorAt = null,
  onApply,
  onDrop,
  onChanged,
  answerUndo = null,
  onUndoAnswer,
  answerNotes = [],
  readingAnswers = 0,
}: {
  campaignId: string
  conversationId: string
  // Changes Mia proposed. Apply applies exactly these stored edits; Not now drops them (review 20 Oct: a "yes"
  // used to ask Mia to make the change again, and her second attempt could differ).
  pending?: Pending[]
  busy?: string | null
  // Why the last Apply or Not now was refused, said under that card (DFSA 27 Oct: it showed only at the top of the
  // page, out of sight, so Apply looked like it did nothing). errorAt is the press it came from ("apply:<id>"); any
  // other error stays at the top of the page.
  error?: string | null
  errorAt?: string | null
  onApply?: (id: string) => Promise<unknown>
  onDrop?: (id: string) => Promise<unknown>
  onChanged?: () => void
  // What the last answer changed in the plan, while it can still be undone (the PM answered, so it was applied)
  answerUndo?: { id: string; label: string } | null
  onUndoAnswer?: (questionId: string) => Promise<unknown>
  // Mia's lines about the PM's answers (saved in the history by the server), and how many she's still applying
  answerNotes?: { nid: string; text: string }[]
  readingAnswers?: number
}) {
  const { sessionId, activeWorkspace, user } = useSession()
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<Msg[]>([])
  const [streaming, setStreaming] = useState('')
  const [status, setStatus] = useState('')
  const [input, setInput] = useState('')
  const [pin, setPin] = useState<AskFocus | null>(null) // what "Ask Mia" pinned, sent with the PM's next message
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const follow = useRef(true) // follow the reply only while the PM is parked at the bottom
  const prevTop = useRef(0)
  const messagesRef = useRef<Msg[]>([])
  messagesRef.current = messages

  useEffect(() => {
    if (!sessionId) return
    fetchConversationMessages(sessionId, conversationId)
      // an error from an earlier attempt isn't shown as if it were current (local test 27 Oct)
      .then((m) =>
        setMessages(
          m
            .filter((x) => !(x.role === 'assistant' && [CONNECTION_ERROR, FAILED].includes(x.content.trim())))
            .map((x) => ({ role: x.role, content: x.content })),
        ),
      )
      .catch(() => setMessages([])) // a new campaign has no conversation yet
  }, [sessionId, conversationId])

  // Scroll the chat box itself: scrollIntoView also scrolled the whole page (live test 20 Oct).
  const toBottom = () => {
    const el = scrollRef.current
    if (follow.current && el) el.scrollTop = el.scrollHeight
  }
  useEffect(toBottom, [messages, pending.length])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    if (el.scrollTop < prevTop.current - 1) follow.current = false // scrolling up always wins
    else if (atBottom) follow.current = true
    prevTop.current = el.scrollTop
  }

  const send = useCallback(
    async (typed: string, pin: AskFocus | null) => {
      if (!typed.trim() || !sessionId) return
      // The pin travels in the message itself, so Mia (and the saved history) knows what was asked about.
      const text = pin ? `${PIN_PREFIX}${pin.label}${pin.detail ? `\n${pin.detail}` : ''}\n\n${typed.trim()}` : typed.trim()
      const history = [...messagesRef.current, { role: 'user' as const, content: text }]
      setMessages(history)
      setInput('')
      setLoading(true)
      setStreaming('')
      setStatus('')
      follow.current = true
      // Steady reveal, independent of how the chunks arrive (the main chat's mechanism).
      let received = ''
      let shown = 0
      let done = false
      let afterTool = false // Mia's reply resumes after a tool call: start a new paragraph
      let finish: () => void = () => undefined
      const revealed = new Promise<void>((r) => (finish = r))
      const tick = setInterval(() => {
        const remaining = received.length - shown
        if (done) {
          shown = received.length
          setStreaming(received)
          clearInterval(tick)
          finish()
        } else if (remaining > 0) {
          shown += Math.min(CHARS_PER_TICK, remaining)
          setStreaming(received.slice(0, shown))
        }
        toBottom()
      }, REVEAL_INTERVAL_MS)
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
            } else if (chunk.status && chunk.status !== 'thinking') {
              afterTool = true
              setStatus(chunk.status)
            }
          },
        )
      } catch {
        received = received || CONNECTION_ERROR
      } finally {
        done = true
        await revealed
        setMessages((prev) => [...prev, { role: 'assistant', content: received || FAILED }])
        setLoading(false)
        setStreaming('')
        setStatus('')
        onChanged?.() // before the refetch, so the page can tell this change came from the chat
        await queryClient.invalidateQueries({ queryKey: buildKey(activeWorkspace?.tenant_id, campaignId), exact: true })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, conversationId, campaignId, user?.google_user_id, activeWorkspace?.tenant_id],
  )

  // "Ask Mia" on the page pins the item to the message box and puts the cursor there; nothing is sent until the PM
  // sends. An answer saved on the page (it carries its text) is sent at once, as it was; one sent while Mia is still
  // replying waits its turn (review 22 Oct, 5.1: it was dropped, so the answer never got its "what this changes" card).
  const loadingRef = useRef(false)
  loadingRef.current = loading
  const queued = useRef<AskFocus[]>([])
  useEffect(() => {
    const on = (e: Event) => {
      const focus = (e as CustomEvent<AskFocus>).detail
      if (!focus.text) {
        setPin({ label: focus.label, detail: focus.detail })
        requestAnimationFrame(() => inputRef.current?.focus())
        return
      }
      if (loadingRef.current) {
        queued.current.push(focus)
        return
      }
      void send(focus.text, { label: focus.label, detail: focus.detail })
    }
    window.addEventListener(ASK_EVENT, on)
    return () => window.removeEventListener(ASK_EVENT, on)
  }, [send])
  // Mia's line about an answer lands when she's applied it: hers alone, no PM bubble above it. Lines already there when
  // the page opened are in the history the chat loaded, so only new ones are added.
  const seenNotes = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (seenNotes.current === null) {
      seenNotes.current = new Set(answerNotes.map((n) => n.nid))
      return
    }
    const fresh = answerNotes.filter((n) => !seenNotes.current!.has(n.nid))
    if (!fresh.length) return
    fresh.forEach((n) => seenNotes.current!.add(n.nid))
    follow.current = true
    setMessages((prev) => [...prev, ...fresh.map((n) => ({ role: 'assistant' as const, content: n.text }))])
  }, [answerNotes])
  useEffect(() => {
    if (loading) return
    const next = queued.current.shift()
    if (next?.text) void send(next.text, { label: next.label, detail: next.detail })
  }, [loading, send])
  const sendTyped = (text: string) => {
    if (loading || !text.trim()) return
    void send(text, pin)
    setPin(null)
    clearFocus()
  }
  const cardError = (id: string) => (error && (errorAt === `apply:${id}` || errorAt === `drop:${id}`) ? error : null)
  // a card refused and gone from the list still says why, at the end of the cards
  const orphanError =
    error && /^(apply|drop):/.test(errorAt ?? '') && !pending.some((p) => errorAt?.endsWith(`:${p.id}`)) ? error : null

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-secondary bg-primary" aria-label="Chat with Mia about this campaign">
      <header className="border-b border-secondary px-4 py-3">
        <p className="subheading-sm text-primary">Mia</p>
        <p className="paragraph-xs text-tertiary">Ask her about anything on the page, or to change it. Changes show on the page.</p>
      </header>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onWheel={(e) => {
          if (e.deltaY < 0) follow.current = false
        }}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3"
      >
        {messages.length === 0 && !streaming ? (
          <p className="paragraph-sm text-tertiary">
            Press “Ask Mia” on anything in the list, or try: “Make the budget R80k”, “Drop the emailer”, “Why this idea?”
          </p>
        ) : null}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <UserMessage key={i} content={m.content} />
          ) : m.content === CONNECTION_ERROR && i === messages.length - 1 && !loading ? (
            // The message never reached Mia (local test 2, 29 Oct): send the same one again, in its place
            <p key={i} className="flex flex-wrap items-center gap-2 paragraph-sm text-secondary">
              Couldn't reach Mia, so she didn't get that.
              <button
                type="button"
                className="rounded-lg border border-secondary px-3 py-1 paragraph-sm text-primary"
                onClick={() => {
                  const at = messages.map((x) => x.role).lastIndexOf('user')
                  if (at < 0) return
                  const again = messages[at].content
                  setMessages(messages.slice(0, at))
                  messagesRef.current = messages.slice(0, at)
                  void send(again, null)
                }}
              >
                Send it again
              </button>
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
        {!loading
          ? pending.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-brand bg-brand-primary px-3 py-2">
                <p className="label-xs text-brand-secondary">Mia proposes{p.about ? ` · for ${p.about}` : ''}</p>
                <ul className="flex flex-col gap-1 paragraph-sm text-primary">
                  {p.summary.map((line, k) => (
                    <li key={k} className="[overflow-wrap:anywhere]">{line}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!!busy}
                    className="rounded-lg bg-brand-solid px-3 py-1.5 paragraph-sm text-primary-onbrand disabled:opacity-50"
                    onClick={() => {
                      clearFocus()
                      void onApply?.(p.id)
                    }}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    disabled={!!busy}
                    className="rounded-lg border border-secondary px-3 py-1.5 paragraph-sm text-primary disabled:opacity-50"
                    onClick={() => {
                      clearFocus()
                      void onDrop?.(p.id)
                    }}
                  >
                    Not now
                  </button>
                </div>
                {cardError(p.id) ? (
                  <p role="alert" className="rounded-lg border border-error bg-error-primary px-3 py-2 paragraph-sm text-error">
                    {cardError(p.id)}
                  </p>
                ) : null}
              </div>
            ))
          : null}
        {!loading && readingAnswers > 0 ? (
          <p className="paragraph-xs text-tertiary">Mia is applying your answer…</p>
        ) : null}
        {!loading && answerUndo ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-secondary px-3 py-2">
            <p className="flex-1 min-w-0 paragraph-sm text-secondary [overflow-wrap:anywhere]">
              From your answer: {answerUndo.label}
            </p>
            <button
              type="button"
              disabled={!!busy}
              className="rounded-lg border border-secondary px-3 py-1.5 paragraph-sm text-primary disabled:opacity-50"
              onClick={() => void onUndoAnswer?.(answerUndo.id)}
            >
              Undo
            </button>
            {error && errorAt === `undo:${answerUndo.id}` ? (
              <p role="alert" className="w-full paragraph-sm text-error">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
        {!loading && orphanError ? (
          <p role="alert" className="rounded-lg border border-error bg-error-primary px-3 py-2 paragraph-sm text-error">
            {orphanError}
          </p>
        ) : null}
        <div ref={endRef} />
      </div>
      <form
        className="border-t border-secondary p-3 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          sendTyped(input)
        }}
      >
        {pin ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-primary px-2 py-0.5 paragraph-xs text-brand-secondary">
              <span className="truncate">About: {pin.label}</span>
              <button
                type="button"
                aria-label="Remove what's pinned"
                className="text-brand-secondary hover:text-primary"
                onClick={() => {
                  setPin(null)
                  clearFocus()
                }}
              >
                ×
              </button>
            </span>
            {QUICK_ASKS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={loading}
                className="rounded-full border border-secondary px-2.5 py-0.5 paragraph-xs text-secondary hover:bg-secondary disabled:opacity-50"
                onClick={() => sendTyped(q)}
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <label htmlFor="campaign-chat-input" className="sr-only">
            Message Mia
          </label>
          <textarea
            id="campaign-chat-input"
            ref={inputRef}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
            placeholder={pin ? 'Ask Mia about this' : 'Message Mia about this campaign'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendTyped(input)
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
        </div>
      </form>
    </aside>
  )
}

// A message sent with a pin shows the pin as a chip and the PM's own words as the bubble.
function UserMessage({ content }: { content: string }) {
  if (!content.startsWith(PIN_PREFIX)) {
    return <p className="self-end max-w-[85%] rounded-xl bg-secondary px-3 py-2 paragraph-sm text-primary whitespace-pre-wrap">{content}</p>
  }
  const [head, ...rest] = content.split('\n\n')
  const label = head.slice(PIN_PREFIX.length).split('\n')[0]
  return (
    <div className="self-end max-w-[85%] flex flex-col items-end gap-1">
      <span className="rounded-md bg-brand-primary px-2 py-0.5 paragraph-xs text-brand-secondary">About: {label}</span>
      <p className="rounded-xl bg-secondary px-3 py-2 paragraph-sm text-primary whitespace-pre-wrap">{rest.join('\n\n')}</p>
    </div>
  )
}
