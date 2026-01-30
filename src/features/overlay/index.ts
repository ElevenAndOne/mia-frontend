// Components
export { Modal } from './components/modal'
export { Sheet } from './components/sheet'
export { Popover } from './components/popover'
export { Dropdown } from './components/dropdown'
export { Tooltip } from './components/tooltip'
export { OverlayPortal } from './components/overlay-portal'

// Context and Provider
export { OverlayProvider } from './overlay-context'

// Hooks
export { useOverlayContext, useIsMobile } from './hooks/use-overlay-context'
export { useClickOutside } from './hooks/use-click-outside'
export { useEscapeKey } from './hooks/use-escape-key'
export { useFocusTrap } from './hooks/use-focus-trap'
export { useFloatingPosition } from './hooks/use-floating-position'

// Utils
export { calculatePosition, getViewportRect } from './utils/position'

// Types
export type {
  OverlayType,
  OverlayPlacement,
  SheetPosition,
  ModalSize,
  OverlayPosition,
  OverlayOffset,
  BaseOverlayConfig,
  ModalProps,
  SheetProps,
  PopoverProps,
  DropdownItem,
  DropdownProps,
  TooltipProps,
  PositionOptions,
  UseFloatingPositionOptions,
  UseFocusTrapOptions,
  OverlayContextState,
  OverlayContextActions,
  OverlayContextType,
} from './types'
