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

  const variant = POSITION_VARIANTS[position]
  // Full-screen: same slide-in motion, but the panel covers the viewport and the
  // children own their scroll (max-h/rounded/overflow-y would fight a full-height pane).
  const panelClassName = fullScreen ? 'fixed inset-0 flex flex-col' : variant.className
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
          transform: shown ? 'none' : variant.closedTransform,
          transition: `transform ${TRANSITION_MS}ms ${EASE}`,
          willChange: 'transform',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {/* Handle indicator (bottom sheets only) */}
        {showHandle && position === 'bottom' && !fullScreen && (
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-tertiary rounded-full" />
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
          <div className="overflow-y-auto">{children}</div>
        )}
      </div>
    </OverlayPortal>
  )
}
