import type { ReactNode } from 'react'
import { LoginPageDesktop } from './login-page-desktop'
import { LoginPageMobile } from './login-page-mobile'
import { useLoginPage, type LoginMethod } from '../hooks/use-login-page'
import { Logo } from '../../../components/logo'

interface LoginPageProps {
  onAuthSuccess?: () => void
  onMetaAuthSuccess?: () => void
  onOAuthPopupClosed?: (platform: 'google' | 'meta' | null) => void
  onOAuthStart?: () => void
}

type AuthButtonVariant = 'solid' | 'light' | 'ghost'

interface AuthButtonConfig {
  id: string
  label: string
  variant: AuthButtonVariant
  iconSrc?: string
  icon?: ReactNode
  iconAlt?: string
  loading: boolean
  loadingMessage: string
  onClick: () => void
}

const buttonBase = 'w-full rounded-2xl px-4 py-3 flex items-center justify-center gap-3 transition-colors subheading-bg'

const getVariantClass = (variant: AuthButtonVariant, layout: 'mobile' | 'desktop') => {
  if (variant === 'solid') {
    return 'bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover'
  }
  if (variant === 'light') {
    return layout === 'mobile'
      ? 'bg-primary text-primary border border-white/20 hover:bg-white/90'
      : 'bg-secondary text-primary border border-secondary hover:bg-tertiary'
  }
  return layout === 'mobile'
    ? 'bg-white/10 text-primary-onbrand border border-white/20 hover:bg-white/20'
    : 'bg-primary text-primary border border-secondary hover:bg-secondary'
}

const renderAuthButtons = (layout: 'mobile' | 'desktop', buttons: AuthButtonConfig[], isBusy: boolean,): ReactNode => (
  <div className="space-y-3">
    {buttons.map((button) => (
      <button
        key={button.id}
        type="button"
        onClick={button.onClick}
        data-track-id={`auth-continue-${button.id}`}
        disabled={isBusy}
        className={`${buttonBase} ${getVariantClass(button.variant, layout)} ${isBusy ? 'opacity-60 cursor-not-allowed' : ''}`.trim()}
      >
        {button.loading ? (
          <span className="flex items-center gap-2 text-current">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            <span className="subheading-md">{button.loadingMessage || 'Working...'}</span>
          </span>
        ) : (
          <>
            {button.icon}
            <span>{button.label}</span>
          </>
        )}
      </button>
    ))}
  </div>
)

export const LoginPage = ({ onAuthSuccess, onMetaAuthSuccess, onOAuthPopupClosed, onOAuthStart }: LoginPageProps) => {
  const {
    isBusy,
    isGoogleLoading,
    googleLoadingMessage,
    isMetaLoading,
    metaLoadingMessage,
    handleLogin,
  } = useLoginPage({
    onAuthSuccess,
    onMetaAuthSuccess,
    onOAuthPopupClosed,
    onOAuthStart,
  })

  const makeHandler = (method: LoginMethod) => () => void handleLogin(method)

  const authButtons: AuthButtonConfig[] = [
    {
      id: 'google',
      label: 'Continue with Google',
      variant: 'light',
      iconSrc: '/icons/google_analytics-icon.svg',
      icon: <Logo.google />,
      iconAlt: 'Google',
      loading: isGoogleLoading,
      loadingMessage: googleLoadingMessage,
      onClick: makeHandler('google'),
    },
    {
      id: 'meta',
      label: 'Continue with Meta',
      variant: 'ghost',
      iconSrc: '/icons/meta-color.svg',
      icon: <Logo.meta />,
      iconAlt: 'Meta',
      loading: isMetaLoading,
      loadingMessage: metaLoadingMessage,
      onClick: makeHandler('meta'),
    },
  ]

  return (
    <div className="relative w-full h-full">
      <LoginPageMobile
        actionButtons={renderAuthButtons('mobile', authButtons, isBusy)}
      />
      <LoginPageDesktop
        actionButtons={renderAuthButtons('desktop', authButtons, isBusy)}
      />
    </div>
  )
}
