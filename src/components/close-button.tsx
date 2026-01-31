interface CloseButtonProps {
  onClick: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  'aria-label'?: string
}

const SIZE_MAP = {
  sm: { button: 'w-6 h-6', icon: 'w-4 h-4' },
  md: { button: 'w-8 h-8', icon: 'w-5 h-5' },
  lg: { button: 'w-10 h-10', icon: 'w-6 h-6' },
}

export function CloseButton({
  onClick,
  disabled = false,
  size = 'md',
  className = '',
  'aria-label': ariaLabel = 'Close',
}: CloseButtonProps) {
  const sizes = SIZE_MAP[size]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${sizes.button} rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={ariaLabel}
    >
      <svg
        className={sizes.icon}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}
