import type { ReactNode } from 'react'

interface SelectionCardProps {
  children: ReactNode
  leading: ReactNode
  trailing?: ReactNode
  footer?: ReactNode
  onSelect: () => void
  disabled?: boolean
  className?: string
}

export const SelectionCard = ({
  children,
  leading,
  trailing,
  footer,
  onSelect,
  disabled = false,
  className = '',
}: SelectionCardProps) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left transition-all ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="shrink-0">{leading}</div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
        {trailing}
      </div>
      {footer && (
        <div className="mt-3">
          {footer}
        </div>
      )}
    </button>
  )
}
