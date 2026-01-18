import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/utils/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

/**
 * Reusable Input component with consistent styling
 * Supports error states and optional labels
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-4 py-3 border rounded-lg text-sm transition-all',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            error
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
