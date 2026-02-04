import { IconButton } from './icon-button'

interface CloseButtonProps {
  onClick: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  'aria-label'?: string
}

const ICON_SIZE_MAP = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

export function CloseButton({
  onClick,
  disabled = false,
  size = 'md',
  className = '',
  'aria-label': ariaLabel = 'Close',
}: CloseButtonProps) {
  return (
    <IconButton
      onClick={onClick}
      disabled={disabled}
      size={size}
      className={className}
      aria-label={ariaLabel}
    >
      <svg
        className={ICON_SIZE_MAP[size]}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </IconButton>
  )
}
