import { Button } from './button'

interface BackButtonProps {
  onClick?: () => void
  label?: string
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Unified back button component with arrow icon
 * - 'light' variant: white icon for use on colored backgrounds
 * - 'dark' variant: dark icon for use on white backgrounds
 */
export function BackButton({
  onClick,
  label,
  variant = 'dark',
  size = 'md',
  className = ''
}: BackButtonProps) {
  const iconSize = size === 'sm' ? 'w-4 h-3' : 'w-4 h-3.5'
  const textStyle = size === 'sm' ? 'subheading-sm' : 'subheading-md'
  const iconColor = variant === 'light' ? 'white' : 'currentColor'
  const textColor = variant === 'light' ? 'text-white' : 'text-tertiary'

  return (
    <Button
      onClick={onClick}
      variant="ghost"
      size={size === 'sm' ? 'sm' : 'md'}
      className={`min-w-[44px] min-h-[44px] active:scale-95 transition-all duration-100 hover:bg-transparent ${textColor} ${className}`}
      leftIcon={(
        <svg
          width="16"
          height="13"
          viewBox="0 0 16 13"
          fill="none"
          className={iconSize}
        >
          <path
            d="M7.18572 13L0.822088 6.63636L7.18572 0.272727L8.27947 1.35227L3.77663 5.85511H15.4386V7.41761H3.77663L8.27947 11.9062L7.18572 13Z"
            fill={iconColor}
          />
        </svg>
      )}
    >
      {label && <span className={textStyle}>{label}</span>}
    </Button>
  )
}
