import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  variant?: 'default' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  rounded?: 'default' | 'full'
  'aria-label': string // Required for accessibility
}

/**
 * IconButton component for icon-only actions
 *
 * Variants:
 * - default: Gray hover background
 * - danger: Red text with red hover background
 * - ghost: Minimal hover effect
 *
 * Sizes:
 * - sm: 32x32 (p-2)
 * - md: 36x36 (p-2.5)
 * - lg: 40x40 (p-3)
 *
 * Rounded:
 * - default: rounded-lg
 * - full: rounded-full (circular)
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'default',
      size = 'md',
      rounded = 'default',
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
      default: 'text-gray-500 hover:bg-gray-100 focus:ring-gray-500',
      danger: 'text-red-500 hover:bg-red-50 focus:ring-red-500',
      ghost: 'text-gray-400 hover:text-gray-600 focus:ring-gray-500',
    }

    const sizeStyles = {
      sm: 'p-2',
      md: 'p-2.5',
      lg: 'p-3',
    }

    const roundedStyles = {
      default: 'rounded-lg',
      full: 'rounded-full',
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          roundedStyles[rounded],
          className
        )}
        {...props}
      >
        {icon}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
