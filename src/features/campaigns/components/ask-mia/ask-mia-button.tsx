import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAskMia, type AskMiaContext } from '../../hooks/use-ask-mia'

interface Props {
  context: AskMiaContext
  currentValue?: string
  onInsert: (text: string) => void
}

const GAP = 6 // px between the trigger and the popover
const MARGIN = 12 // px breathing room from the viewport edge

// Popover position, computed from the trigger's viewport rect. Rendered in a
// portal (fixed) so it's never clipped by the builder's overflow-hidden cards or
// the scroll container, and so a long suggestion can never push the footer
// off-screen.
type Pos = { top?: number; bottom?: number; right: number; maxHeight: number }

// Inline "✦ Ask Mia" affordance for a single field. Opens a popover that fetches
// a campaign-scoped suggestion (Sonnet 4.6) which the user can Insert.
export const AskMiaButton = ({ context, currentValue, onInsert }: Props) => {
  const { suggestion, loading, error, generate, reset } = useAskMia(context)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    const right = window.innerWidth - rect.right
    const below = window.innerHeight - rect.bottom - GAP - MARGIN
    const above = rect.top - GAP - MARGIN
    // Drop downward unless there's clearly more room above.
    if (below < 240 && above > below) {
      setPos({ bottom: window.innerHeight - rect.top + GAP, right, maxHeight: above })
    } else {
      setPos({ top: rect.bottom + GAP, right, maxHeight: below })
    }
  }, [])

  useLayoutEffect(() => {
    if (open) reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false)
    }
    // Keep the popover pinned to the trigger as the page/cards scroll (capture
    // catches scrolling in nested containers too).
    document.addEventListener('mousedown', onDocMouseDown)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  const start = () => {
    setOpen(true)
    reset()
    void generate(currentValue)
  }

  const insert = () => {
    if (suggestion) onInsert(suggestion)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : start())}
        className="inline-flex items-center gap-1 label-xs text-utility-brand-700 hover:text-utility-brand-600 transition-colors"
        title="Ask Mia to suggest"
      >
        <span>✦</span> Ask Mia
      </button>

      {open && pos && createPortal(
        // Wrapped in .campaign-workspace so the scoped dark palette applies — the
        // portal renders outside the workspace subtree in the DOM.
        <div className="campaign-workspace">
          <div
            ref={popRef}
            style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, right: pos.right, maxHeight: pos.maxHeight }}
            className="w-80 flex flex-col bg-secondary border border-secondary rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-tertiary">
              <span className="label-xs text-utility-brand-700">✦ Mia suggests</span>
              <button onClick={() => setOpen(false)} className="text-quaternary hover:text-secondary">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 min-h-0 px-3 py-3 overflow-y-auto">
              {loading && (
                <div className="flex items-center gap-2 text-quaternary">
                  <div className="w-3.5 h-3.5 border-2 border-quaternary border-t-transparent rounded-full animate-spin" />
                  <span className="paragraph-xs">Thinking…</span>
                </div>
              )}
              {error && !loading && <p className="paragraph-xs text-utility-error-700">{error}</p>}
              {suggestion && !loading && <p className="paragraph-sm text-secondary whitespace-pre-wrap leading-relaxed">{suggestion}</p>}
            </div>

            <div className="shrink-0 flex gap-2 px-3 py-2 border-t border-tertiary">
              <button onClick={insert} disabled={!suggestion || loading} className="flex-1 py-1.5 rounded-lg bg-utility-brand-600 label-xs text-white hover:bg-utility-brand-700 disabled:opacity-40">Insert</button>
              <button onClick={() => void generate(currentValue)} disabled={loading} className="py-1.5 px-3 rounded-lg border border-tertiary label-xs text-secondary hover:bg-tertiary disabled:opacity-40">Regenerate</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
