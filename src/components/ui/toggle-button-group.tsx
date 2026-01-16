import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ToggleOption<T extends string = string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

export interface ToggleButtonGroupProps<T extends string = string> {
  options: ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  fullWidth?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/**
 * ToggleButtonGroup component for mutually exclusive options
 *
 * Usage:
 * ```tsx
 * <ToggleButtonGroup
 *   options={[
 *     { value: 'link', label: 'Share Link' },
 *     { value: 'email', label: 'Send Email' }
 *   ]}
 *   value={inviteMethod}
 *   onChange={setInviteMethod}
 * />
 * ```
 */
export function ToggleButtonGroup<T extends string = string>({
  options,
  value,
  onChange,
  fullWidth = false,
  size = 'md',
  className,
}: ToggleButtonGroupProps<T>) {
  const containerStyles = cn(
    'inline-flex rounded-lg bg-gray-100 p-1',
    fullWidth && 'w-full',
    className
  )

  const sizeStyles = {
    sm: 'py-1.5 px-3 text-xs',
    md: 'py-2 px-3 text-sm',
  }

  return (
    <div className={containerStyles}>
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-center justify-center font-medium rounded-md transition-all',
              sizeStyles[size],
              fullWidth && 'flex-1',
              isSelected
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {option.icon && (
              <span className={cn('flex-shrink-0', option.label && 'mr-2')}>
                {option.icon}
              </span>
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Alternative ToggleButtonGroup with black selection (used in invites)
 */
export interface ToggleButtonGroupBlackProps<T extends string = string> {
  options: ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
  fullWidth?: boolean
  className?: string
}

export function ToggleButtonGroupBlack<T extends string = string>({
  options,
  value,
  onChange,
  fullWidth = false,
  className,
}: ToggleButtonGroupBlackProps<T>) {
  const containerStyles = cn('flex gap-3', fullWidth && 'w-full', className)

  return (
    <div className={containerStyles}>
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
              isSelected
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            )}
          >
            {option.icon && (
              <span className={cn('inline-flex items-center', option.label && 'mr-2')}>
                {option.icon}
              </span>
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
