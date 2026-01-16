import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '@/utils/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline-solid' | 'ghost' | 'link'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
}

/**
 * Unified Button component with consistent styling and behavior
 *
 * Variants:
 * - primary: Blue/Black solid background (main actions)
 * - secondary: Gray background or bordered (cancel, alternative actions)
 * - danger: Red background (destructive actions)
 * - outline: Bordered with no background
 * - ghost: No background, hover effect only
 * - link: Text-only, link-style button
 *
 * Sizes:
 * - sm: Compact (py-2 px-3)
 * - md: Default (py-2.5 px-4)
 * - lg: Large (py-3 px-6)
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      link: 'text-blue-600 hover:text-blue-700 hover:underline focus:ring-blue-500',
    }

    const sizeStyles = {
      sm: 'text-sm px-3 py-2',
      md: 'text-sm px-4 py-2.5',
      lg: 'text-base px-6 py-3',
    }

    const widthStyles = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          widthStyles,
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

/**
 * Alternative primary button variant with black background
 * Commonly used in landing pages and onboarding flows
 */
export const ButtonBlack = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  ({ className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="primary"
        className={cn('bg-black hover:bg-gray-800 focus:ring-gray-700', className)}
        {...props}
      />
    )
  }
)

ButtonBlack.displayName = 'ButtonBlack'

/**
 * Orange variant for special actions (e.g., GA4 property selection)
 */
export const ButtonOrange = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  ({ className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="primary"
        className={cn('bg-orange-600 hover:bg-orange-700 focus:ring-orange-500', className)}
        {...props}
      />
    )
  }
)

ButtonOrange.displayName = 'ButtonOrange'

/**
 * Green variant for success actions
 */
export const ButtonGreen = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  ({ className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="primary"
        className={cn('bg-green-600 hover:bg-green-700 focus:ring-green-500', className)}
        {...props}
      />
    )
  }
)

ButtonGreen.displayName = 'ButtonGreen'
