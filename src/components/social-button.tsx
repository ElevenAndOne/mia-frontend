type Provider = 'google' | 'facebook' | 'apple'
type Variant = 'filled' | 'outlined' | 'ghost'
type Theme = 'light' | 'dark' | 'responsive'

interface SocialButtonProps {
  provider: Provider
  variant?: Variant
  theme?: Theme
  label?: string
  iconOnly?: boolean
  loading?: boolean
  loadingMessage?: string
  disabled?: boolean
  onClick?: () => void
  className?: string
}

const PROVIDER_CONFIG: Record<Provider, { label: string; icon: string }> = {
  google: {
    label: 'Sign in with Google',
    icon: '/icons/google_analytics-icon.svg',
  },
  facebook: {
    label: 'Sign in with Facebook',
    icon: '/icons/meta-color.svg',
  },
  apple: {
    label: 'Sign in with Apple',
    icon: '/icons/apple.svg',
  },
}

const LIGHT_VARIANTS: Record<Variant, string> = {
  filled: 'bg-secondary text-primary border border-secondary hover:bg-tertiary',
  outlined: 'bg-primary text-primary border border-secondary hover:bg-secondary',
  ghost: 'bg-transparent text-tertiary border border-tertiary hover:bg-tertiary hover:text-primary',
}

const DARK_VARIANTS: Record<Variant, string> = {
  filled: 'bg-primary text-primary border border-white/20 hover:bg-white/90',
  outlined: 'bg-white/10 text-primary-onbrand border border-white/20 hover:bg-white/20',
  ghost: 'bg-transparent text-white/60 border border-white/20 hover:bg-white/10 hover:text-white',
}

const RESPONSIVE_VARIANTS: Record<Variant, string> = {
  filled: 'bg-primary text-primary border border-white/20 hover:bg-white/90 lg:bg-secondary lg:border-secondary lg:hover:bg-tertiary',
  outlined: 'bg-white/10 text-primary-onbrand border border-white/20 hover:bg-white/20 lg:bg-primary lg:text-primary lg:border-secondary lg:hover:bg-secondary',
  ghost: 'bg-transparent text-white/60 border border-white/20 hover:bg-white/10 lg:text-tertiary lg:border-tertiary lg:hover:bg-tertiary lg:hover:text-primary',
}

export function SocialButton({
  provider,
  variant = 'outlined',
  theme = 'light',
  label,
  iconOnly = false,
  loading = false,
  loadingMessage,
  disabled = false,
  onClick,
  className = '',
}: SocialButtonProps) {
  const config = PROVIDER_CONFIG[provider]
  const displayLabel = label ?? config.label
  const isDisabled = disabled || loading

  const getVariantClasses = () => {
    if (theme === 'responsive') return RESPONSIVE_VARIANTS[variant]
    if (theme === 'dark') return DARK_VARIANTS[variant]
    return LIGHT_VARIANTS[variant]
  }

  const baseClasses = [
    'rounded-xl',
    'flex items-center justify-center gap-3',
    'transition-colors',
    'subheading-bg',
    'disabled:opacity-60 disabled:cursor-not-allowed',
  ]

  const sizeClasses = iconOnly ? 'w-12 h-12 p-0' : 'w-full px-4 py-3'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses.join(' ')} ${sizeClasses} ${getVariantClasses()} ${className}`.trim()}
    >
      {loading ? (
        <span className="flex items-center gap-2 text-current">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {!iconOnly && (
            <span className="subheading-md">{loadingMessage || 'Working...'}</span>
          )}
        </span>
      ) : (
        <>
          <img src={config.icon} alt={provider} className="w-5 h-5" />
          {!iconOnly && <span>{displayLabel}</span>}
        </>
      )}
    </button>
  )
}
