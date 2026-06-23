import { useEffect, useRef, useState } from 'react'
import { useAskMia, type AskMiaContext } from '../../hooks/use-ask-mia'

interface Props {
  context: AskMiaContext
  currentValue?: string
  onInsert: (text: string) => void
}

// Inline "✦ Ask Mia" affordance for a single field. Opens a popover that fetches
// a campaign-scoped suggestion (Sonnet 4.6) which the user can Insert.
export const AskMiaButton = ({ context, currentValue, onInsert }: Props) => {
  const { suggestion, loading, error, generate, reset } = useAskMia(context)
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
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : start())}
        className="inline-flex items-center gap-1 label-xs text-utility-brand-700 hover:text-utility-brand-600 transition-colors"
        title="Ask Mia to suggest"
      >
        <span>✦</span> Ask Mia
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 bg-secondary border border-secondary rounded-xl shadow-xl z-30 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-tertiary">
            <span className="label-xs text-utility-brand-700">✦ Mia suggests</span>
            <button onClick={() => setOpen(false)} className="text-quaternary hover:text-secondary">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="px-3 py-3 max-h-56 overflow-y-auto">
            {loading && (
              <div className="flex items-center gap-2 text-quaternary">
                <div className="w-3.5 h-3.5 border-2 border-quaternary border-t-transparent rounded-full animate-spin" />
                <span className="paragraph-xs">Thinking…</span>
              </div>
            )}
            {error && !loading && <p className="paragraph-xs text-utility-error-700">{error}</p>}
            {suggestion && !loading && <p className="paragraph-sm text-secondary whitespace-pre-wrap leading-relaxed">{suggestion}</p>}
          </div>

          <div className="flex gap-2 px-3 py-2 border-t border-tertiary">
            <button onClick={insert} disabled={!suggestion || loading} className="flex-1 py-1.5 rounded-lg bg-utility-brand-600 label-xs text-white hover:bg-utility-brand-700 disabled:opacity-40">Insert</button>
            <button onClick={() => void generate(currentValue)} disabled={loading} className="py-1.5 px-3 rounded-lg border border-tertiary label-xs text-secondary hover:bg-tertiary disabled:opacity-40">Regenerate</button>
          </div>
        </div>
      )}
    </div>
  )
}
