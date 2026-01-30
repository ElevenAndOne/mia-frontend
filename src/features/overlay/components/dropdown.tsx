import { useRef, useId, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { OverlayPortal } from './overlay-portal'
import { Sheet } from './sheet'
import { useFloatingPosition } from '../hooks/use-floating-position'
import { useClickOutside } from '../hooks/use-click-outside'
import { useEscapeKey } from '../hooks/use-escape-key'
import { useOverlayContext } from '../hooks/use-overlay-context'
import type { DropdownProps, DropdownItem } from '../types'

/**
 * Dropdown component for menu-style lists
 * Features:
 * - Anchored to trigger element
 * - Auto-positions above or below trigger
 * - Click-outside and escape key to close
 * - Closes after item selection
 * - Mobile adaptation (renders as Sheet on mobile)
 * - Accessible menu semantics
 */
export function Dropdown({
  isOpen,
  onClose,
  anchorRef,
  items,
  placement = 'bottom-end',
  closeOnEscape = true,
  closeOnOutsideClick = true,
  className = '',
  mobileAdaptation = 'sheet',
}: DropdownProps) {
  const floatingRef = useRef<HTMLDivElement>(null)
  const { isMobile, registerOverlay, unregisterOverlay, getZIndex } = useOverlayContext()
  const overlayId = useId()

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
    offset: 4,
    flip: true,
    shift: true,
    isOpen: isOpen && !isMobile,
  })

  // Click outside handling
  useClickOutside([anchorRef, floatingRef], onClose, isOpen && closeOnOutsideClick && !isMobile)

  // Escape key handling
  useEscapeKey(onClose, isOpen && closeOnEscape)

  const zIndex = getZIndex(overlayId)

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled) {
      item.onClick()
      onClose()
    }
  }

  const renderItems = () => (
    <div role="menu">
      {items.map((item, index) =>
        item.divider ? (
          <div
            key={`divider-${index}`}
            className="border-t border-gray-200 my-1"
            role="separator"
          />
        ) : (
          <button
            key={item.id}
            type="button"
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
              item.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : item.destructive
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
            role="menuitem"
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>
  )

  // Mobile adaptation: render as Sheet
  if (isMobile && mobileAdaptation === 'sheet') {
    return (
      <Sheet isOpen={isOpen} onClose={onClose} position="bottom">
        <div className="py-2">{renderItems()}</div>
      </Sheet>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <OverlayPortal>
          <motion.div
            ref={floatingRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className={`fixed bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-44 overflow-hidden ${className}`.trim()}
            style={{
              left: position?.x ?? 0,
              top: position?.y ?? 0,
              transformOrigin: position?.transformOrigin ?? 'top right',
              zIndex,
              // Hide until position is calculated
              visibility: position ? 'visible' : 'hidden',
            }}
          >
            {renderItems()}
          </motion.div>
        </OverlayPortal>
      )}
    </AnimatePresence>
  )
}
