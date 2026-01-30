import type { ReactNode, RefObject } from 'react'

// Overlay type categories
export type OverlayType = 'modal' | 'sheet' | 'popover' | 'dropdown' | 'tooltip'

// Placement options for anchored overlays
export type OverlayPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'center'

// Sheet position options
export type SheetPosition = 'bottom' | 'left' | 'right'

// Modal size options
export type ModalSize = 'sm' | 'md' | 'lg' | 'full'

// Computed position result from positioning engine
export interface OverlayPosition {
  x: number
  y: number
  placement: OverlayPlacement
  transformOrigin: string
}

// Offset configuration for anchored overlays
export interface OverlayOffset {
  mainAxis?: number
  crossAxis?: number
}

// Base configuration for all overlays
export interface BaseOverlayConfig {
  closeOnEscape?: boolean
  closeOnOutsideClick?: boolean
}

// Modal-specific props
export interface ModalProps extends BaseOverlayConfig {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  size?: ModalSize
  closeOnOverlayClick?: boolean
  showCloseButton?: boolean
  overlayClassName?: string
  panelClassName?: string
}

// Sheet-specific props
export interface SheetProps extends BaseOverlayConfig {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  position?: SheetPosition
  showHandle?: boolean
  className?: string
}

// Popover-specific props
export interface PopoverProps extends BaseOverlayConfig {
  isOpen: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  children: ReactNode
  placement?: OverlayPlacement
  offset?: number
  className?: string
  mobileAdaptation?: 'sheet' | 'none'
}

// Dropdown item definition
export interface DropdownItem {
  id: string
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
  divider?: boolean
}

// Dropdown-specific props
export interface DropdownProps extends BaseOverlayConfig {
  isOpen: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  items: DropdownItem[]
  placement?: 'bottom-start' | 'bottom-end'
  className?: string
  mobileAdaptation?: 'sheet' | 'none'
}

// Tooltip-specific props
export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  placement?: Exclude<OverlayPlacement, 'center' | `${string}-start` | `${string}-end`>
  delay?: number
}

// Positioning options for the position calculation utility
export interface PositionOptions {
  anchor: DOMRect
  floating: { width: number; height: number }
  placement: OverlayPlacement
  offset?: OverlayOffset
  viewport: { width: number; height: number }
  flip?: boolean
  shift?: boolean
  padding?: number
}

// Hook options for floating position
export interface UseFloatingPositionOptions {
  placement: OverlayPlacement
  offset?: number
  flip?: boolean
  shift?: boolean
  isOpen: boolean
}

// Focus trap options
export interface UseFocusTrapOptions {
  returnFocusOnDeactivate?: boolean
}

// Overlay context state (for future stacking support)
export interface OverlayContextState {
  isMobile: boolean
  activeOverlays: string[]
}

// Overlay context actions
export interface OverlayContextActions {
  registerOverlay: (id: string) => void
  unregisterOverlay: (id: string) => void
  getZIndex: (id: string) => number
}

// Combined overlay context type
export type OverlayContextType = OverlayContextState & OverlayContextActions
