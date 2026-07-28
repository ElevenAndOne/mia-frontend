import { useRef, useState } from 'react'
import { ChatMarkdown } from '../../components/chat-markdown'
import { askPulse } from './services/pulse-service'
import type { PulseFilter, PulseRange, Workspace } from './types'

interface AskMessage {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED = [
  'Who was most active this week?',
  'Summarize the thumbs-down feedback',
  'Which skills are underperforming?',
  'Why did questions change vs last week?',
]

/** "Ask Mia Pulse" — LLM Q&A over the dashboard's own analytics. The current
 *  filter state rides along so answers default to what the viewer is looking at. */
export function AskPulse({
  sessionId,
  range,
  filter,
  workspaces,
}: {
  sessionId: string | null
  range: PulseRange
  filter: PulseFilter
  workspaces: Workspace[]
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AskMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  // Scroll ONLY the thread box (scrollTop can't move ancestors) — scrollIntoView
  // would drag the whole dashboard down on every streamed chunk.
  const scrollThread = () => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  const ask = async (question: string) => {
    if (!question.trim() || isLoading) return
    setOpen(true)
    setInput('')
    setIsLoading(true)
    setStatus('Thinking…')
    const history = messages.slice(-10)
    setMessages((prev) => [...prev, { role: 'user', content: question }])

    // Resolve the active filter to names so the model can speak in names, not ids.
    const tenantNames = filter.tenantIds
      .map((tid) => workspaces.find((w) => w.tenant_id === tid)?.name)
      .filter((n): n is string => !!n)
    const userName = filter.userId
      ? workspaces.flatMap((w) => w.members).find((m) => m.google_user_id === filter.userId)?.name
      : undefined

    let answer = ''
    try {
      await askPulse(
        sessionId,
        {
          question,
          history,
          range,
          tenant_ids: filter.tenantIds.length ? filter.tenantIds : undefined,
          user_ids: filter.userId ? [filter.userId] : undefined,
          tenant_names: tenantNames.length ? tenantNames : undefined,
          user_name: userName,
        },
        (chunk) => {
          if (chunk.text) {
            answer += chunk.text
            setStreaming(answer)
            setStatus('')
          } else if (chunk.status) {
            setStatus(chunk.status)
          } else if (chunk.error) {
            answer = answer || chunk.error
          }
          scrollThread()
        }
      )
    } catch {
      answer = answer || 'Something went wrong — please try again.'
    }
    setMessages((prev) => [...prev, { role: 'assistant', content: answer || 'No answer produced.' }])
    setStreaming('')
    setStatus('')
    setIsLoading(false)
  }

  return (
    <div className="plz-card plz-ask">
      <button type="button" className="plz-ask-head" onClick={() => setOpen((o) => !o)}>
        <span className="plz-ask-title">
          ✦ Ask Mia Pulse
          <span className="plz-ask-sub">questions about testers, usage &amp; feedback</span>
        </span>
        <span className={`plz-ask-chev${open ? ' open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="plz-ask-body">
          {messages.length === 0 && !isLoading && (
            <div className="plz-ask-suggest">
              {SUGGESTED.map((s) => (
                <button key={s} type="button" className="plz-ask-chip" onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {(messages.length > 0 || isLoading) && (
            <div className="plz-ask-thread" ref={threadRef}>
              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <div className="plz-ask-q" key={i}>
                    {m.content}
                  </div>
                ) : (
                  <div className="plz-ask-a" key={i}>
                    <ChatMarkdown content={m.content} />
                  </div>
                )
              )}
              {isLoading && (
                <div className="plz-ask-a">
                  {streaming ? <ChatMarkdown content={streaming} /> : null}
                  {status && <div className="plz-ask-status">{status}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <form
        className="plz-ask-inputrow"
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Ask about your testers — e.g. “compare Trystin and Sean this month”"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? '…' : 'Ask'}
        </button>
      </form>
    </div>
  )
}
