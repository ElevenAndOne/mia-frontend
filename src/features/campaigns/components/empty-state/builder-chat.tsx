import { useEffect, useRef, type WheelEvent } from 'react'
import { ChatMarkdown } from '../../../../components/chat-markdown'
import { ChatComposer } from './chat-composer'
import { BuildHistoryMenu } from './build-history-menu'
import { useBuilderChat } from '../../hooks/use-builder-chat'

// Empty-state "Build a campaign" surface: chat with Mia or upload a brief. On a
// successful save the hook navigates into the new campaign's Builder.
export const BuilderChat = () => {
  const c = useBuilderChat()
  const fileInput = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const started = c.messages.length > 0 || c.loading

  // Follow the stream ONLY while the user is parked at the bottom. Any upward intent
  // (wheel-up or an upward scroll delta) pauses following so they can read back while
  // Mia replies; returning to the bottom resumes it. Mirrors the main chat view —
  // the previous unconditional scrollIntoView yanked the user down every reveal tick.
  const shouldAutoScrollRef = useRef(true)
  const prevScrollTopRef = useRef(0)
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    const goingUp = el.scrollTop < prevScrollTopRef.current - 1
    if (goingUp) shouldAutoScrollRef.current = false
    else if (atBottom) shouldAutoScrollRef.current = true
    prevScrollTopRef.current = el.scrollTop
  }
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (e.deltaY < 0) shouldAutoScrollRef.current = false
  }

  // A new outgoing message means the user wants to follow the next reply — resume.
  const lastRole = c.messages[c.messages.length - 1]?.role
  useEffect(() => {
    if (lastRole === 'user') shouldAutoScrollRef.current = true
  }, [c.messages.length, lastRole])

  useEffect(() => {
    // Scroll the message container DIRECTLY (set scrollTop), NOT bottom.scrollIntoView().
    // scrollIntoView scrolls every scrollable ancestor to reveal the target, so inside the
    // Campaigns page (BuilderChat is nested under AppShell) it also yanked an outer scroller
    // and fought the user. Setting scrollRef.scrollTop only ever moves this container — and
    // only while the user is parked at the bottom (shouldAutoScrollRef).
    if (!shouldAutoScrollRef.current) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [c.messages, c.streaming])

  return (
    <div className="flex flex-col h-full min-h-0">
      <input ref={fileInput} type="file" accept="application/pdf,text/markdown,.md,.markdown" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void c.handlePdf(f); e.target.value = '' }} />

      <div className="flex justify-end px-1 pt-1">
        <BuildHistoryMenu builds={c.pastBuilds} onLoadList={c.openHistory} onSelect={c.loadPastBuild} onNew={c.startFresh} />
      </div>

      {c.pdfUploading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <div className="w-6 h-6 border-2 border-quaternary border-t-transparent rounded-full animate-spin" />
          <p className="paragraph-sm text-secondary">Parsing your campaign brief — this may take a minute…</p>
        </div>
      )}

      {!c.pdfUploading && !started && (
        <div className="text-center pt-12 pb-6 px-6">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" /></svg>
          </div>
          <p className="label-md text-primary mb-1">No campaigns yet</p>
          <p className="paragraph-sm text-tertiary mb-6">Chat with Mia to build your first campaign, or upload a brief.</p>
          <button onClick={() => c.send('Build a new campaign')} className="px-3 py-1.5 border border-secondary rounded-full paragraph-sm text-secondary hover:bg-secondary transition-colors">
            Build a new campaign
          </button>
          <div className="flex items-center gap-3 justify-center mt-5">
            <div className="h-px flex-1 bg-tertiary" /><span className="paragraph-xs text-quaternary">or</span><div className="h-px flex-1 bg-tertiary" />
          </div>
          <button onClick={() => fileInput.current?.click()} className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-secondary rounded-full paragraph-sm text-tertiary hover:bg-secondary hover:text-primary transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Upload campaign brief (PDF or Markdown)
          </button>
        </div>
      )}

      {!c.pdfUploading && started && (
        <div ref={scrollRef} onScroll={handleScroll} onWheel={handleWheel} className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-3">
          {c.messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl paragraph-sm leading-relaxed ${m.role === 'user' ? 'bg-brand-solid text-primary-onbrand' : 'bg-secondary text-primary border border-secondary'}`}>
                {m.role === 'user' ? <span className="whitespace-pre-wrap">{m.content}</span> : <ChatMarkdown content={m.content} />}
              </div>
            </div>
          ))}
          {c.loading && !c.streaming && (
            <div className="flex justify-start">
              <div className="bg-secondary border border-secondary rounded-2xl px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="paragraph-sm text-quaternary">{c.thinking}</span>
              </div>
            </div>
          )}
          {c.streaming && (
            <div className="flex justify-start">
              <div className="w-[85%] px-4 py-3 rounded-2xl paragraph-sm leading-relaxed bg-secondary text-primary border border-secondary">
                <ChatMarkdown content={c.streaming} />
              </div>
            </div>
          )}
          <div ref={bottom} />
        </div>
      )}

      {!c.pdfUploading && (
        <ChatComposer value={c.input} onChange={c.setInput} onSend={() => c.send()} disabled={c.loading} />
      )}
    </div>
  )
}
