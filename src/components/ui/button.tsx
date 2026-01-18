import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '@/utils/utils'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'link'
type ButtonColor = 'blue' | 'black' | 'orange' | 'green' | 'red'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  color?: ButtonColor
  size?: ButtonSize
  fullWidth?: boolean
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
}

// Color styles for primary/solid variants
const colorStyles: Record<ButtonColor, string> = {
  blue: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  black: 'bg-black text-white hover:bg-gray-800 focus:ring-gray-700',
  orange: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
  green: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  red: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
}

// Variant styles (some override color)
const variantStyles: Record<ButtonVariant, string> = {
  primary: '', // Uses colorStyles
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500',
  ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  link: 'text-blue-600 hover:text-blue-700 hover:underline focus:ring-blue-500',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-2',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-6 py-3',
}

const LoadingSpinner = () => (
  <svg
    className="animate-spin -ml-1 mr-2 h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

/**
 * Button component with unified variants and colors
 *
 * @example
 * <Button>Default Blue</Button>
 * <Button color="black">Black</Button>
 * <Button color="orange">Orange</Button>
 * <Button variant="outline">Outline</Button>
 * <Button variant="ghost" size="sm">Small Ghost</Button>
 * <Button isLoading>Loading...</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      color = 'blue',
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
    // Determine styles based on variant
    const isPrimaryVariant = variant === 'primary'
    const variantStyle = isPrimaryVariant ? colorStyles[color] : variantStyles[variant]

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyle,
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading && <LoadingSpinner />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Legacy exports for backwards compatibility
export const ButtonBlack = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'color'>>(
  (props, ref) => <Button ref={ref} color="black" {...props} />
)
ButtonBlack.displayName = 'ButtonBlack'

export const ButtonOrange = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'color'>>(
  (props, ref) => <Button ref={ref} color="orange" {...props} />
)
ButtonOrange.displayName = 'ButtonOrange'

export const ButtonGreen = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'color'>>(
  (props, ref) => <Button ref={ref} color="green" {...props} />
)
ButtonGreen.displayName = 'ButtonGreen'
