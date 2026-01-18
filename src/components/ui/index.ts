/**
 * UI Components - Barrel export file
 *
 * Centralizes exports for all reusable UI components
 */

// Button components
export { Button, ButtonBlack, ButtonOrange, ButtonGreen } from './button'
export type { ButtonProps } from './button'

export { IconButton } from './icon-button'
export type { IconButtonProps } from './icon-button'

export { ToggleButtonGroup, ToggleButtonGroupBlack } from './toggle-button-group'
export type { ToggleButtonGroupProps, ToggleButtonGroupBlackProps, ToggleOption } from './toggle-button-group'

// Form components
export { Input } from './input'
export type { InputProps } from './input'

export { Checkbox } from './checkbox'
export type { CheckboxProps } from './checkbox'

// Layout components
export { Card } from './card'
export type { CardProps } from './card'

export { Modal } from './modal'
export type { ModalProps } from './modal'

// Dialog components (compound pattern)
export * as Dialog from './dialog'
export type {
  DialogProps,
  DialogOverlayProps,
  DialogContentProps,
  DialogHeaderProps,
  DialogTitleProps,
  DialogDescriptionProps,
  DialogBodyProps,
  DialogFooterProps,
  DialogCloseProps,
} from './dialog'

// Feedback components
export { Alert, AlertError, AlertSuccess, AlertWarning, AlertInfo } from './alert'
export type { AlertProps } from './alert'

export { Badge } from './badge'
export type { BadgeProps } from './badge'

export { Spinner } from './spinner'
export type { SpinnerProps } from './spinner'

// Selection components
export { SelectableList } from './selectable-list'
export type { SelectableListProps, SelectableItem } from './selectable-list'

export { AccountSelectorModal } from './account-selector-modal'
export type { AccountSelectorModalProps, AccountSelectorConfig } from './account-selector-modal'

// Other existing components
export { default as DateRangeSelector } from './date-range-selector'
export { default as FigmaLoginModal } from './figma-login-modal'
export { default as LoadingScreen } from './loading-screen'
export { default as MicroCelebration } from './micro-celebration'
