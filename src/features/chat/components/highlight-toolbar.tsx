import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MagicWand02 } from '../../../components/icon/magic-wand-02'
import { Microphone01 } from '../../../components/icon/microphone-01'
import { Send02 } from '../../../components/icon/send-02'
import { useIsMobile } from '../../../hooks/use-is-mobile'

interface HighlightToolbarProps {
  /** Bounding rect of the highlighted selection, in viewport coordinates. */
  anchorRect: DOMRect
  /** The highlighted text (shown as a hint, sent to Mia as the span to change). */
  selectionText: string
  /** User asked Mia to change the span. */
  onSubmit: (instruction: string) => void
  onClose: () => void
  /** Optional voice-to-edit — reuse the existing transcribe flow. */
  onDictate?: () => void
}

// Each chip is an explicit, selection-scoped instruction so Mia changes only the
// highlighted span (not the whole document). Label is short; the sent instruction is
// the full scoped sentence.
const QUICK_ACTIONS: { label: string; instruction: string }[] = [
  { label: 'Punchier', instruction: 'Rewrite only the highlighted text to be punchier' },
  { label: 'Shorten', instruction: 'Shorten only the highlighted text' },
  { label: 'More playful', instruction: 'Rewrite only the highlighted text to be more playful' },
  { label: 'Rewrite', instruction: 'Rewrite only the highlighted text' },
]

export const HighlightToolbar = ({
  anchorRect,
  selectionText,
  onSubmit,
  onClose,
  onDictate,
}: HighlightToolbarProps) => {
  const [instruction, setInstruction] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  // Below md the toolbar docks to the bottom edge instead of anchoring to the
  // selection — anchored popovers fight the on-screen keyboard and iOS's callout.
  const docked = useIsMobile()

  useEffect(() => {
    // Autofocus opens the phone keyboard and wipes the visible selection — desktop only.
    if (!docked) inputRef.current?.focus()
  }, [docked])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPressOutside = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPressOutside)
    document.addEventListener('touchstart', onPressOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPressOutside)
      document.removeEventListener('touchstart', onPressOutside)
    }
  }, [onClose])

  // Docked mode rides above the on-screen keyboard via the visual viewport.
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  useEffect(() => {
    if (!docked) return
    const vv = window.visualViewport
    if (!vv) return
    const update = () =>
      setKeyboardOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [docked])

  // While the native selection is live, Chrome Android overlays a "tap to see
  // search results" chip along the bottom edge — hold the bar above it. The lift
  // drops once the selection collapses (e.g. the user taps our input).
  const [nativeSelActive, setNativeSelActive] = useState(
    () => !(window.getSelection()?.isCollapsed ?? true)
  )
  useEffect(() => {
    if (!docked) return
    const onSel = () => setNativeSelActive(!(window.getSelection()?.isCollapsed ?? true))
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [docked])

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    onClose()
  }

  // Position below the selection by default; flip above and clamp so it's always fully
  // on-screen (fixed-position toolbars near the viewport bottom otherwise drop off and
  // can't be scrolled to).
  const width = 340
  const [pos, setPos] = useState<{ top: number; left: number }>(() => ({
    top: anchorRect.bottom + 8,
    left: Math.max(12, Math.min(anchorRect.left, window.innerWidth - width - 12)),
  }))

  useLayoutEffect(() => {
    if (docked) return
    const margin = 12
    const height = rootRef.current?.offsetHeight ?? 160
    const left = Math.max(margin, Math.min(anchorRect.left, window.innerWidth - width - margin))
    let top = anchorRect.bottom + 8
    if (top + height > window.innerHeight - margin) {
      top = anchorRect.top - height - 8 // flip above the selection
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin))
    setPos({ top, left })
  }, [anchorRect, docked])

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Ask Mia to change this"
      className="fixed z-50 rounded-2xl border border-tertiary bg-primary shadow-lg p-3"
      style={
        docked
          ? {
              left: 8,
              right: 8,
              bottom: keyboardOffset + (keyboardOffset === 0 && nativeSelActive ? 72 : 8),
              paddingBottom: keyboardOffset > 0 ? undefined : 'max(0.75rem, env(safe-area-inset-bottom))',
            }
          : { top: pos.top, left: pos.left, width }
      }
    >
      <div className="flex items-center gap-2 mb-2">
        <MagicWand02 size={14} className="text-utility-brand-600 shrink-0" />
        <span className="paragraph-sm font-medium text-secondary">Ask Mia to change this</span>
        <span className="paragraph-sm text-quaternary italic ml-auto truncate max-w-[150px]">
          “{selectionText}”
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-tertiary bg-secondary focus-within:border-utility-brand-600 pl-3 pr-1.5 py-1.5">
        <input
          ref={inputRef}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(instruction)
          }}
          placeholder="Make it punchier and lead with the benefit"
          className="flex-1 bg-transparent paragraph-sm text-primary placeholder:text-quaternary outline-none min-w-0"
        />
        {onDictate && (
          <button
            type="button"
            onClick={onDictate}
            aria-label="Dictate the change"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-quaternary hover:text-utility-brand-600 hover:bg-tertiary transition-colors shrink-0"
          >
            <Microphone01 size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => submit(instruction)}
          disabled={!instruction.trim()}
          aria-label="Send to Mia"
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-utility-brand-600 text-white disabled:opacity-40 shrink-0"
        >
          <Send02 size={13} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {QUICK_ACTIONS.map(({ label, instruction }) => (
          <button
            key={label}
            type="button"
            onClick={() => submit(instruction)}
            className="paragraph-sm text-secondary rounded-full border border-tertiary px-2.5 py-1 hover:text-utility-brand-600 hover:border-utility-brand-600 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
