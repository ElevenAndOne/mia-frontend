import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Copy01 } from '../../../components/icon/copy-01'
import { MagicWand02 } from '../../../components/icon/magic-wand-02'
import { Send02 } from '../../../components/icon/send-02'
import { useClipboard } from '../../../hooks/use-clipboard'
import { useIsMobile } from '../../../hooks/use-is-mobile'

interface HighlightToolbarProps {
  /** Bounding rect of the highlighted selection, in viewport coordinates. */
  anchorRect: DOMRect
  /** The highlighted text (shown as a hint; quoted into the chat composer). */
  selectionText: string
  /** Main chat: quote the highlight into the composer so the user talks to Mia about it there. */
  onAsk?: () => void
  /** Surfaces without a composer (campaign builder, memo drawer): send a typed, span-scoped
   *  instruction straight to Mia. Shown only when onAsk is absent. */
  onSubmit?: (instruction: string) => void
  onClose: () => void
  /** Presses inside this element don't close the toolbar — lets pick mode swap
   *  the target line with another tap instead of dismissing. */
  ignoreOutsideRef?: React.RefObject<HTMLElement | null>
}

/**
 * Highlight → Copy, or quote into the chat. Editing happens in the conversation
 * (options, feedback, "go with 3"), not through preset buttons on the canvas — the
 * Punchier / Shorten / More playful chips were removed 2026-09-16 after a designer's
 * session showed the canvas loop fighting the natural chat one.
 */
export const HighlightToolbar = ({
  anchorRect,
  selectionText,
  onAsk,
  onSubmit,
  onClose,
  ignoreOutsideRef,
}: HighlightToolbarProps) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [instruction, setInstruction] = useState('')
  const instructionMode = !onAsk && Boolean(onSubmit)
  // Copy the highlighted span (e.g. to paste into Figma).
  const { copied, copy } = useClipboard()
  // Below md the toolbar docks to the bottom edge instead of anchoring to the
  // selection — anchored popovers fight the on-screen keyboard and iOS's callout.
  const docked = useIsMobile()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onPressOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (ignoreOutsideRef?.current?.contains(target)) return
      if (rootRef.current && !rootRef.current.contains(target)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPressOutside)
    document.addEventListener('touchstart', onPressOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPressOutside)
      document.removeEventListener('touchstart', onPressOutside)
    }
  }, [onClose, ignoreOutsideRef])

  // While the native selection is live, Chrome Android overlays a "tap to see
  // search results" chip along the bottom edge — hold the bar above it.
  const [nativeSelActive, setNativeSelActive] = useState(
    () => !(window.getSelection()?.isCollapsed ?? true)
  )
  useEffect(() => {
    if (!docked) return
    const onSel = () => setNativeSelActive(!(window.getSelection()?.isCollapsed ?? true))
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [docked])

  // Position below the selection by default; flip above and clamp so it's always fully
  // on-screen.
  const width = 320
  const [pos, setPos] = useState<{ top: number; left: number }>(() => ({
    top: anchorRect.bottom + 8,
    left: Math.max(12, Math.min(anchorRect.left, window.innerWidth - width - 12)),
  }))

  useLayoutEffect(() => {
    if (docked) return
    const margin = 12
    const height = rootRef.current?.offsetHeight ?? 96
    const left = Math.max(margin, Math.min(anchorRect.left, window.innerWidth - width - margin))
    let top = anchorRect.bottom + 8
    if (top + height > window.innerHeight - margin) {
      top = anchorRect.top - height - 8 // flip above the selection
    }
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin))
    setPos({ top, left })
  }, [anchorRect, docked])

  useEffect(() => {
    // Autofocus opens the phone keyboard and wipes the visible selection — desktop only.
    if (instructionMode && !docked) inputRef.current?.focus()
  }, [instructionMode, docked])

  const ask = () => {
    onAsk?.()
    onClose()
  }
  const submit = () => {
    const trimmed = instruction.trim()
    if (!trimmed || !onSubmit) return
    onSubmit(trimmed)
    onClose()
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Ask Mia about this"
      className="fixed z-50 rounded-2xl border border-tertiary bg-primary shadow-lg p-3"
      style={
        docked
          ? {
              left: 8,
              right: 8,
              bottom: nativeSelActive ? 72 : 8,
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            }
          : { top: pos.top, left: pos.left, width }
      }
    >
      <p className="paragraph-sm text-quaternary italic truncate mb-2">“{selectionText}”</p>
      <div className="flex items-center gap-2">
        {instructionMode ? (
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-tertiary bg-secondary focus-within:border-utility-brand-600 pl-3 pr-1.5 py-1.5 min-w-0">
            <input
              ref={inputRef}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              placeholder="Tell Mia what to change here"
              className="flex-1 bg-transparent paragraph-sm text-primary placeholder:text-quaternary outline-none min-w-0"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!instruction.trim()}
              aria-label="Send to Mia"
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-utility-brand-600 text-white disabled:opacity-40 shrink-0"
            >
              <Send02 size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={ask}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-utility-brand-600 text-white paragraph-sm font-medium py-2 hover:opacity-90 transition-opacity"
          >
            <MagicWand02 size={14} />
            Ask Mia about this
          </button>
        )}
        <button
          type="button"
          onClick={() => copy(selectionText)}
          aria-label="Copy highlighted text"
          title={copied ? 'Copied' : 'Copy highlighted text'}
          className="w-9 h-9 rounded-xl border border-tertiary flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors shrink-0"
        >
          <Copy01 size={14} className={copied ? 'text-utility-brand-600' : ''} />
        </button>
      </div>
    </div>
  )
}
