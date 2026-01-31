import type { ReactNode } from 'react'

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  disabled?: boolean
}

interface SegmentedControlProps<T extends string> {
  options: Array<SegmentedControlOption<T>>
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  fullWidth?: boolean
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<SegmentedControlProps<string>['size']>, string> = {
  sm: 'px-3 py-1.5 subheading-sm',
  md: 'px-4 py-2 subheading-md',
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  fullWidth = false,
  className = '',
}: SegmentedControlProps<T>) => {
  return (
    <div
      className={`flex items-center gap-1 rounded-full bg-secondary p-1 border border-secondary ${className}`.trim()}
      role="group"
    >
      {options.map((option) => {
        const isActive = option.value === value
        const isDisabled = option.disabled
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={isDisabled}
            aria-pressed={isActive}
            className={`flex items-center justify-center gap-1 rounded-full transition-colors ${
              fullWidth ? 'flex-1' : ''
            } ${SIZE_CLASSES[size]} ${
              isActive
                ? 'bg-brand-solid text-primary-onbrand'
                : 'text-tertiary hover:text-secondary hover:bg-tertiary'
            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
