import { useState, useRef, useId, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { OverlayPortal } from './overlay-portal'
import { useFloatingPosition } from '../hooks/use-floating-position'
import type { TooltipProps, OverlayPlacement } from '../types'

/**
 * Tooltip component for brief contextual information
 * Features:
 * - Shows on hover/focus after configurable delay
 * - Positions relative to trigger element
 * - Auto-flips when hitting viewport edge
 * - Accessible with aria-describedby
 */
export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 200,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const floatingRef = useRef<HTMLDivElement>(null)
  const tooltipId = useId()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Calculate position relative to anchor
  const { position } = useFloatingPosition(anchorRef, floatingRef, {
    placement: placement as OverlayPlacement,
    offset: 6,
    flip: true,
    shift: true,
    isOpen,
  })

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true)
    }, delay)
  }, [delay])

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsOpen(false)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <span
        ref={anchorRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-describedby={isOpen ? tooltipId : undefined}
        className="inline-flex"
      >
        {children}
      </span>
      <AnimatePresence>
        {isOpen && (
          <OverlayPortal>
            <motion.div
              ref={floatingRef}
              id={tooltipId}
              role="tooltip"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="fixed px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
              style={{
                left: position?.x ?? 0,
                top: position?.y ?? 0,
                transformOrigin: position?.transformOrigin ?? 'bottom center',
                zIndex: 1500, // Tooltips always on top
                visibility: position ? 'visible' : 'hidden',
              }}
            >
              {content}
            </motion.div>
          </OverlayPortal>
        )}
      </AnimatePresence>
    </>
  )
}
