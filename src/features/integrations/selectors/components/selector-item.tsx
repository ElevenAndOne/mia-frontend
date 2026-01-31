interface SelectorItemProps {
  isSelected: boolean
  onSelect: () => void
  title: string
  subtitle?: string
  badge?: string
  badgeColor?: 'blue' | 'green' | 'gray'
  disabled?: boolean
  accentColor?: 'blue' | 'green' | 'orange' | 'black'
  selectionStyle?: 'checkbox' | 'radio'
  onRemove?: () => void
  children?: React.ReactNode
}

const ACCENT_COLORS = {
  blue: {
    selected: 'border-utility-info-500 bg-utility-info-100',
    checkbox: 'border-utility-info-600 bg-utility-info-600',
  },
  green: {
    selected: 'border-utility-success-500 bg-success-primary',
    checkbox: 'border-utility-success-600 bg-utility-success-600',
  },
  orange: {
    selected: 'border-brand bg-brand-primary',
    checkbox: 'border-brand bg-brand-solid',
  },
  black: {
    selected: 'border-primary bg-secondary',
    checkbox: 'border-primary bg-primary-solid',
  },
}

const BADGE_COLORS = {
  blue: 'bg-utility-info-200 text-utility-info-700',
  green: 'bg-success-secondary text-success',
  gray: 'bg-tertiary text-tertiary',
}

export function SelectorItem({
  isSelected,
  onSelect,
  title,
  subtitle,
  badge,
  badgeColor = 'blue',
  disabled = false,
  accentColor = 'blue',
  selectionStyle = 'checkbox',
  onRemove,
  children,
}: SelectorItemProps) {
  const colors = ACCENT_COLORS[accentColor]

  return (
    <div
      onClick={disabled ? undefined : onSelect}
      className={`relative p-4 rounded-lg border-2 transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        isSelected
          ? colors.selected
          : 'border-secondary bg-primary hover:border-primary'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Selection indicator (checkbox or radio) */}
        {selectionStyle === 'radio' ? (
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              isSelected ? colors.checkbox.replace('bg-', 'border-').replace(' bg-', ' ') : 'border-primary'
            }`}
          >
            {isSelected && (
              <div className={`w-3 h-3 rounded-full ${colors.checkbox.split(' ')[1]}`} />
            )}
          </div>
        ) : (
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
              isSelected ? colors.checkbox : 'border-primary'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-primary-onbrand" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="subheading-md text-primary truncate">{title}</p>
            {badge && (
              <span className={`subheading-sm px-2 py-0.5 rounded-full ${BADGE_COLORS[badgeColor]}`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="paragraph-sm text-quaternary truncate">{subtitle}</p>}
          {children}
        </div>

        {/* Remove button */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="ml-2 text-placeholder-subtle hover:text-error transition-colors shrink-0"
            title="Remove"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
