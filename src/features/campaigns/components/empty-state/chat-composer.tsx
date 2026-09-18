import { useLayoutEffect, useRef } from 'react'
import { FileAttachment01 } from '../../../../components/icon/file-attachment-01'
import { XClose } from '../../../../components/icon/x-close'
import type { AttachedDocument } from '../../../chat/services/chat-service'

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
  /** Pending paste-cards ("Pasted text") shown as pills above the input. */
  pendingDocs?: AttachedDocument[]
  onRemoveDoc?: (index: number) => void
  /** A paste ≥ PASTE_TO_CARD_CHARS becomes an attachment card instead of inline text. */
  onPasteLarge?: (text: string) => void
}

const MAX_HEIGHT = 200
// Mirrors the main chat's threshold (chat-input.tsx PASTE_TO_CARD_CHARS).
const PASTE_TO_CARD_CHARS = 2000

// Auto-growing chat input. Height is recomputed in a layout effect on every value
// change — including paste — so a large pasted block grows the box (up to a cap,
// then scrolls) instead of collapsing to a 1-line scroll window.
export const ChatComposer = ({
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
  pendingDocs = [],
  onRemoveDoc,
  onPasteLarge,
}: ChatComposerProps) => {
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
      {pendingDocs.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {pendingDocs.map((doc, i) => (
            <div
              key={`${doc.filename}-${i}`}
              className="relative group flex items-center gap-1.5 px-3 py-2 rounded-lg border border-tertiary bg-quaternary max-w-[200px]"
            >
              <FileAttachment01 size={14} className="text-tertiary shrink-0" />
              <span className="paragraph-xs text-secondary truncate">{doc.filename}</span>
              {onRemoveDoc && (
                <button
                  type="button"
                  onClick={() => onRemoveDoc(i)}
                  className="shrink-0 w-5 h-5 rounded-full bg-tertiary flex items-center justify-center touch-manipulation opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-1"
                >
                  <XClose size={9} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
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
          onPaste={(e) => {
            if (!onPasteLarge) return
            const text = e.clipboardData.getData('text/plain')
            if (text && text.length >= PASTE_TO_CARD_CHARS) {
              e.preventDefault()
              onPasteLarge(text)
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
