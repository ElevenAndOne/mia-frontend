import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/utils'

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
  color?: 'white' | 'black' | 'blue' | 'current'
}

const sizeStyles = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-b-2',
}

const colorStyles = {
  white: 'border-white/30 border-t-white',
  black: 'border-gray-300 border-t-gray-900',
  blue: 'border-gray-300 border-t-blue-600',
  current: 'border-current/30 border-t-current',
}

/**
 * Reusable Spinner component for loading states
 * Supports different sizes and colors
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = 'md', color = 'blue', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'animate-spin rounded-full',
          sizeStyles[size],
          colorStyles[color],
          className
        )}
        role="status"
        aria-label="Loading"
        {...props}
      />
    )
  }
)

Spinner.displayName = 'Spinner'
