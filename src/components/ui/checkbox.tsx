import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/utils/utils'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  color?: 'blue' | 'green' | 'orange' | 'black'
}

const colorStyles = {
  blue: 'text-blue-600 focus:ring-blue-500',
  green: 'text-green-600 focus:ring-green-500',
  orange: 'text-orange-600 focus:ring-orange-500',
  black: 'text-gray-900 focus:ring-gray-700',
}

/**
 * Reusable Checkbox component with consistent styling
 * Supports different colors and optional labels
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onChange, label, color = 'blue', id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          'flex items-center gap-2 cursor-pointer',
          props.disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={cn(
            'h-4 w-4 rounded border-gray-300 transition-colors',
            'focus:ring-2 focus:ring-offset-2',
            colorStyles[color],
            className
          )}
          {...props}
        />
        {label && (
          <span className="text-sm text-gray-700">{label}</span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'
