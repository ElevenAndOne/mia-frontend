import { useRef, useId, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { OverlayPortal } from './overlay-portal'
import { useFocusTrap } from '../hooks/use-focus-trap'
import { useEscapeKey } from '../hooks/use-escape-key'
import { useOverlayContext } from '../hooks/use-overlay-context'
import type { ModalProps } from '../types'

const SIZE_CLASSES: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full mx-4',
}

/**
 * Modal component for full-screen blocking overlays
 * Features:
 * - Renders via portal to document.body
 * - Focus trapping
 * - Escape key closes
 * - Backdrop click closes (configurable)
 * - Framer Motion animations
 */
export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  overlayClassName = '',
  panelClassName = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
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

  // Focus trap within modal
  useFocusTrap(modalRef, isOpen, { returnFocusOnDeactivate: true })

  // Escape key handling
  useEscapeKey(onClose, isOpen && closeOnEscape)

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
            className={`fixed inset-0 bg-overlay/40 flex items-center justify-center p-4 ${overlayClassName}`.trim()}
            style={{ zIndex }}
            onClick={closeOnOverlayClick ? onClose : undefined}
            role="presentation"
          >
            {/* Panel */}
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className={`relative bg-primary rounded-2xl shadow-2xl w-full ${SIZE_CLASSES[size]} ${panelClassName}`.trim()}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              tabIndex={-1}
            >
              {/* Header with title and close button */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-tertiary">
                  {title && (
                    <h2 id={titleId} className="title-h6 text-primary">
                      {title}
                    </h2>
                  )}
                  {!title && <div />}
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-8 h-8 rounded-full hover:bg-tertiary flex items-center justify-center transition-colors"
                      aria-label="Close modal"
                    >
                      <svg
                        className="w-5 h-5 text-tertiary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              {children}
            </motion.div>
          </motion.div>
        </OverlayPortal>
      )}
    </AnimatePresence>
  )
}
