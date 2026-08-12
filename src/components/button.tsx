import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover',
  secondary: 'bg-secondary text-primary hover:bg-tertiary border border-tertiary',
  ghost: 'bg-transparent text-secondary hover:bg-secondary',
  danger: 'bg-error-solid text-primary-onbrand hover:bg-error-solid-hover',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 paragraph-sm',
  md: 'px-4 py-2 subheading-md',
  lg: 'px-5 py-3 subheading-md',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  /** Pending state: shows a spinner in place of the left icon and disables the
   *  button, so an in-flight action can't be double-fired. */
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  loading = false,
  className = '',
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-lg transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} type={type} disabled={disabled || loading} {...props}>
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      ) : (
        leftIcon
      )}
      {children}
      {rightIcon}
    </button>
  )
}
