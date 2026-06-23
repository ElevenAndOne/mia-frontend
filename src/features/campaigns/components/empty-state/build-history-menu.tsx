import { useEffect, useRef, useState } from 'react'
import type { RecentConversation } from '../../../chat/services/chat-service'

interface Props {
  builds: RecentConversation[]
  onLoadList: () => void
  onSelect: (conversationId: string) => void
  onNew: () => void
}

// "Past builds" dropdown — campaign-builder conversations only (skill
// strategy_planning). Loads the list when opened.
export const BuildHistoryMenu = ({ builds, onLoadList, onSelect, onNew }: Props) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = () => {
    if (!open) onLoadList()
    setOpen((o) => !o)
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="paragraph-xs text-tertiary hover:text-primary transition-colors flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Past builds
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-72 max-h-80 overflow-y-auto bg-secondary border border-secondary rounded-xl shadow-lg z-20 py-1">
          <button onClick={() => { setOpen(false); onNew() }} className="w-full text-left px-3 py-2 paragraph-sm text-brand-solid hover:bg-tertiary transition-colors">+ New build</button>
          {builds.length === 0 && <p className="px-3 py-2 paragraph-xs text-quaternary">No past builds yet</p>}
          {builds.map((b) => (
            <button key={b.conversation_id} onClick={() => { setOpen(false); onSelect(b.conversation_id) }} className="w-full text-left px-3 py-2 hover:bg-tertiary transition-colors">
              <p className="paragraph-sm text-primary truncate">{b.title || 'Untitled build'}</p>
              <p className="paragraph-xs text-quaternary">{b.message_count} messages</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
