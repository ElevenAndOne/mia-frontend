import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/utils/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'owner' | 'admin' | 'analyst' | 'viewer' | 'primary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md'
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-800',
  owner: 'bg-yellow-100 text-yellow-800',
  admin: 'bg-blue-100 text-blue-800',
  analyst: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800',
  primary: 'bg-blue-100 text-blue-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

/**
 * Reusable Badge component for status and role indicators
 * Supports different variants for roles (owner, admin, analyst, viewer) and states
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium rounded-full',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'
