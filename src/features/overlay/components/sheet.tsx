import { useRef, useId, useEffect, useState } from 'react'
import { OverlayPortal } from './overlay-portal'
import { useFocusTrap } from '../hooks/use-focus-trap'
import { useEscapeKey } from '../hooks/use-escape-key'
import { useOverlayContext } from '../hooks/use-overlay-context'
import type { SheetProps, SheetPosition } from '../types'

interface PositionVariant {
  closedTransform: string
  className: string
}

const POSITION_VARIANTS: Record<SheetPosition, PositionVariant> = {
  bottom: {
    closedTransform: 'translateY(100%)',
    className: 'fixed bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh]',
  },
  right: {
    closedTransform: 'translateX(100%)',
    className: 'fixed top-0 right-0 bottom-0 w-full max-w-md rounded-l-2xl',
  },
  left: {
    closedTransform: 'translateX(-100%)',
    className: 'fixed top-0 left-0 bottom-0 w-full max-w-md rounded-r-2xl',
  },
}

const TRANSITION_MS = 260
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'

/**
 * Sheet component for slide-in panels from screen edges
 * Features:
 * - Bottom, left, or right positioning
 * - CSS-transition animation: it runs on the compositor thread, so the slide
 *   stays smooth even while React is busy mounting the sheet's content —
 *   JS-driven animation (the previous framer-motion approach) dropped frames
 *   on Android exactly because mount work blocked its rAF loop
 * - Focus trapping
 * - Escape key and backdrop click to close
 */
export function Sheet({
  isOpen,
  onClose,
  children,
  title,
  position = 'bottom',
  showHandle = true,
  fullScreen = false,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  className = '',
}: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  // The distance travelled lives in a ref as well as state. State drives the transform (it
  // has to re-render to move the sheet); the ref is what onTouchEnd reads, because that
  // handler was created on an earlier render and its copy of the state may be a frame stale
  // — which is the difference between a 95px swipe closing the sheet and snapping back.
  const dragYRef = useRef(0)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const titleId = useId()
  const { registerOverlay, unregisterOverlay, getZIndex } = useOverlayContext()
  const overlayId = useId()

  // mounted keeps the DOM around through the exit transition; shown drives the
  // transforms. Open: mount closed, then flip shown after a double rAF so the
  // off-screen position paints first and the transition actually runs.
  const [mounted, setMounted] = useState(isOpen)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      let raf2 = 0
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(true))
      })
      return () => {
        cancelAnimationFrame(raf1)
        if (raf2) cancelAnimationFrame(raf2)
      }
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), TRANSITION_MS + 40)
    return () => clearTimeout(t)
  }, [isOpen])

  // Register/unregister overlay for stacking management
  useEffect(() => {
    if (isOpen) {
      registerOverlay(overlayId)
      return () => unregisterOverlay(overlayId)
    }
  }, [isOpen, overlayId, registerOverlay, unregisterOverlay])

  // Focus trap within sheet
  useFocusTrap(sheetRef, isOpen, { returnFocusOnDeactivate: true })

  // Escape key handling
  useEscapeKey(onClose, isOpen && closeOnEscape)

  // Swipe down to dismiss, from the handle only. Binding this to the whole panel would
  // fight the content's own scrolling — which is the thing that has to keep working, since
  // the best-post canvas is taller than a phone.
  const CLOSE_AFTER_PX = 90
  const dragProps =
    position === 'bottom'
      ? {
          onTouchStart: (e: React.TouchEvent) => {
            dragStartY.current = e.touches[0].clientY
            setDragging(true)
          },
          onTouchMove: (e: React.TouchEvent) => {
            if (dragStartY.current === null) return
            // Down only. Dragging a bottom sheet upwards has nowhere to go.
            const y = Math.max(0, e.touches[0].clientY - dragStartY.current)
            dragYRef.current = y
            setDragY(y)
          },
          onTouchEnd: () => {
            const travelled = dragYRef.current
            dragStartY.current = null
            dragYRef.current = 0
            setDragging(false)
            setDragY(0)
            if (travelled > CLOSE_AFTER_PX) onClose()
          },
        }
      : {}

  const variant = POSITION_VARIANTS[position]
  // Full-screen: same slide-in motion, but the panel covers the viewport and the
  // children own their scroll (max-h/rounded/overflow-y would fight a full-height pane).
  const panelClassName = fullScreen
    ? 'fixed inset-0 flex flex-col'
    : `${variant.className} flex flex-col`
  const zIndex = getZIndex(overlayId)

  if (!mounted) return null

  return (
    <OverlayPortal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-overlay/20"
        style={{
          zIndex,
          opacity: shown ? 1 : 0,
          transition: `opacity ${TRANSITION_MS}ms ease`,
        }}
        onClick={closeOnOutsideClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`${panelClassName} bg-primary shadow-xl overflow-hidden ${className}`.trim()}
        style={{
          zIndex: zIndex + 1,
          transform: shown
            ? dragY
              ? `translateY(${dragY}px)`
              : 'none'
            : variant.closedTransform,
          // No transition while a finger is on it, or the sheet lags behind the drag.
          transition: dragging ? 'none' : `transform ${TRANSITION_MS}ms ${EASE}`,
          willChange: 'transform',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {/* Handle indicator (bottom sheets only) */}
        {showHandle && position === 'bottom' && !fullScreen && (
          <div
            className="flex shrink-0 cursor-grab justify-center py-3 touch-none"
            role="button"
            tabIndex={0}
            aria-label="Close"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onClose()
            }}
            {...dragProps}
          >
            {/* bg-quaternary, not bg-tertiary: on the dark panel, above the bright paper of
                the canvas, the old bar was a dark-grey line on dark grey and read as the
                edge of the sheet. Nobody found it. */}
            <div className="w-12 h-1.5 bg-quaternary rounded-full" />
          </div>
        )}

        {/* Header with title */}
        {title && (
          <div className="px-4 pb-2">
            <h2 id={titleId} className="label-bg text-primary">
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        {fullScreen ? (
          <div className="flex-1 min-h-0 pb-[env(safe-area-inset-bottom)]">{children}</div>
        ) : (
          // flex-1 min-h-0, not a bare overflow-y-auto. The panel is overflow-hidden with a
          // max height, so without a height of its own this div grew to the content and was
          // simply clipped — the sheet looked scrollable and wasn't.
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {children}
          </div>
        )}
      </div>
    </OverlayPortal>
  )
}
