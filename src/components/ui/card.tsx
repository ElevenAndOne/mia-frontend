import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'selected' | 'error'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const variantStyles = {
  default: 'bg-white border border-gray-200',
  selected: 'bg-blue-50 border-2 border-blue-500',
  error: 'bg-red-50 border border-red-200',
}

const paddingStyles = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
}

/**
 * Reusable Card component with consistent styling
 * Supports different variants and padding sizes
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl transition-all',
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
