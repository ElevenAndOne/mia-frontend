import type { ReactNode } from 'react'

interface MenuItemButtonProps {
  onClick?: () => void
  icon: ReactNode
  label: string
  variant?: 'default' | 'danger'
  disabled?: boolean
  className?: string
}

export const MenuItemButton = ({
  onClick,
  icon,
  label,
  variant = 'default',
  disabled = false,
  className = ''
}: MenuItemButtonProps) => {
  const baseClasses = 'w-full px-4 py-2.5 text-left paragraph-sm flex items-center gap-3 transition-colors'

  const variantClasses = variant === 'danger'
    ? 'text-error hover:bg-error-primary'
    : 'text-secondary hover:bg-secondary'

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${disabledClasses} ${className}`}
      role="menuitem"
    >
      <span className={variant === 'danger' ? '' : 'text-tertiary'}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}

export default MenuItemButton
