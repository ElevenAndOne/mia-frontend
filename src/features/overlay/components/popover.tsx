import { useRef, useId, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { OverlayPortal } from './overlay-portal'
import { Sheet } from './sheet'
import { useFloatingPosition } from '../hooks/use-floating-position'
import { useClickOutside } from '../hooks/use-click-outside'
import { useEscapeKey } from '../hooks/use-escape-key'
import { useOverlayContext } from '../hooks/use-overlay-context'
import type { PopoverProps } from '../types'

/**
 * Popover component for anchored overlays
 * Features:
 * - Anchored to trigger element
 * - Auto-flips when hitting viewport edge
 * - Shifts to stay within viewport
 * - Click-outside and escape key to close
 * - Mobile adaptation (renders as Sheet on mobile)
 */
export function Popover({
  isOpen,
  onClose,
  anchorRef,
  children,
  placement = 'bottom',
  offset = 8,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  className = '',
  mobileAdaptation = 'sheet',
}: PopoverProps) {
  const floatingRef = useRef<HTMLDivElement>(null)
  const { isMobile, registerOverlay, unregisterOverlay, getZIndex } = useOverlayContext()
  const overlayId = useId()
  const shouldUseSheet = isMobile && mobileAdaptation === 'sheet'

  // Register/unregister overlay for stacking management
  useEffect(() => {
    if (isOpen) {
      registerOverlay(overlayId)
      return () => unregisterOverlay(overlayId)
    }
  }, [isOpen, overlayId, registerOverlay, unregisterOverlay])

  // Calculate position relative to anchor
  const { position } = useFloatingPosition(anchorRef, floatingRef, {
    placement,
    offset,
    flip: true,
    shift: true,
    isOpen: isOpen && !shouldUseSheet,
  })

  // Click outside handling
  useClickOutside([anchorRef, floatingRef], onClose, isOpen && closeOnOutsideClick && !shouldUseSheet)

  // Escape key handling
  useEscapeKey(onClose, isOpen && closeOnEscape)

  const zIndex = getZIndex(overlayId)

  // Mobile adaptation: render as Sheet
  if (shouldUseSheet) {
    return (
      <Sheet isOpen={isOpen} onClose={onClose} position="bottom">
        <div className={`p-4 ${className}`.trim()}>{children}</div>
      </Sheet>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <OverlayPortal>
          <motion.div
            ref={floatingRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className={`fixed bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`.trim()}
            style={{
              left: position?.x ?? 0,
              top: position?.y ?? 0,
              transformOrigin: position?.transformOrigin ?? 'top left',
              zIndex,
              // Hide until position is calculated
              visibility: position ? 'visible' : 'hidden',
            }}
            role="dialog"
          >
            {children}
          </motion.div>
        </OverlayPortal>
      )}
    </AnimatePresence>
  )
}
