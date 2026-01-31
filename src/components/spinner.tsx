type SpinnerSize = 'sm' | 'md' | 'lg'
type SpinnerVariant = 'primary' | 'light' | 'dark'

interface SpinnerProps {
  size?: SpinnerSize
  variant?: SpinnerVariant
  className?: string
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-4',
  lg: 'w-12 h-12 border-4',
}

const VARIANT_CLASSES: Record<SpinnerVariant, string> = {
  primary: 'border-utility-brand-200 border-t-utility-brand-600',
  light: 'border-white/30 border-t-white',
  dark: 'border-secondary border-t-utility-brand-600',
}

export function Spinner({ size = 'md', variant = 'primary', className = '' }: SpinnerProps) {
  return (
    <div
      className={`rounded-full animate-spin ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
