import { useRef, useId, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { OverlayPortal } from './overlay-portal'
import { useFocusTrap } from '../hooks/use-focus-trap'
import { useEscapeKey } from '../hooks/use-escape-key'
import { useOverlayContext } from '../hooks/use-overlay-context'
import type { SheetProps, SheetPosition } from '../types'

interface PositionVariant {
  initial: Record<string, string | number>
  animate: Record<string, string | number>
  exit: Record<string, string | number>
  className: string
}

const POSITION_VARIANTS: Record<SheetPosition, PositionVariant> = {
  bottom: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    className: 'fixed bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh]',
  },
  right: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    className: 'fixed top-0 right-0 bottom-0 w-full max-w-md rounded-l-2xl',
  },
  left: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    className: 'fixed top-0 left-0 bottom-0 w-full max-w-md rounded-r-2xl',
  },
}

/**
 * Sheet component for slide-in panels from screen edges
 * Features:
 * - Bottom, left, or right positioning
 * - Spring animation for natural feel
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
  const panelClassName = fullScreen
    ? 'fixed inset-0 flex flex-col'
    : variant.className
  const zIndex = getZIndex(overlayId)

  return (
    <AnimatePresence>
      {isOpen && (
        <OverlayPortal>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-overlay/20"
            style={{ zIndex }}
            onClick={closeOnOutsideClick ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={variant.initial}
            animate={variant.animate}
            exit={variant.exit}
            // Tween, not spring: springs run long low-velocity tails that read as
            // jank on low-end Android GPUs; a short ease-out feels snappier.
            transition={{ type: 'tween', duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className={`${panelClassName} bg-primary shadow-xl overflow-hidden ${className}`.trim()}
            style={{ zIndex: zIndex + 1 }}
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
          </motion.div>
        </OverlayPortal>
      )}
    </AnimatePresence>
  )
}
