import { useLayoutEffect, useRef } from 'react'

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
}

const MAX_HEIGHT = 200

// Auto-growing chat input. Height is recomputed in a layout effect on every value
// change — including paste — so a large pasted block grows the box (up to a cap,
// then scrolls) instead of collapsing to a 1-line scroll window.
export const ChatComposer = ({ value, onChange, onSend, disabled, placeholder }: ChatComposerProps) => {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [value])

  return (
    <div className="shrink-0 p-4 border-t border-tertiary bg-primary">
      <div className="flex gap-2 items-end">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          placeholder={placeholder ?? 'Ask Mia to build a campaign for…'}
          rows={1}
          disabled={disabled}
          className="flex-1 px-4 py-3 border border-secondary rounded-2xl paragraph-sm bg-secondary text-primary resize-none outline-none focus:border-utility-brand-400 min-h-[48px] max-h-[200px]"
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="px-5 py-3 bg-brand-solid text-primary-onbrand rounded-full subheading-md hover:bg-brand-solid-hover transition-colors disabled:opacity-40 shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  )
}
