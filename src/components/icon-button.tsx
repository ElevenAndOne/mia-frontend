import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonVariant = 'ghost' | 'subtle' | 'outline' | 'solid'

type IconButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  ghost: 'text-placeholder-subtle hover:text-tertiary hover:bg-tertiary',
  subtle: 'bg-secondary text-secondary hover:bg-tertiary',
  outline: 'border border-tertiary text-secondary hover:bg-tertiary',
  solid: 'bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover',
}

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant
  size?: IconButtonSize
  children: ReactNode
  'aria-label': string
}

export function IconButton({
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  ...props
}: IconButtonProps) {
  const classes = [
    SIZE_CLASSES[size],
    'rounded-full flex items-center justify-center transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} type="button" {...props}>
      {children}
    </button>
  )
}
