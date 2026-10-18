import { useEffect, useState, type ReactNode } from 'react'
import { fetchInviter, pendingReferral, type Inviter } from '../../referrals/referral'
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

const buttonBase =
  'w-full rounded-2xl px-4 py-3 flex items-center justify-center gap-3 transition-colors subheading-bg'

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

const renderAuthButtons = (
  layout: 'mobile' | 'desktop',
  buttons: AuthButtonConfig[],
  isBusy: boolean
): ReactNode => (
  <div className="space-y-3">
    {buttons.map((button) => (
      <button
        key={button.id}
        type="button"
        onClick={button.onClick}
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

export const LoginPage = ({
  onAuthSuccess,
  onMetaAuthSuccess,
  onOAuthPopupClosed,
  onOAuthStart,
}: LoginPageProps) => {
  const { isBusy, isGoogleLoading, googleLoadingMessage, isMetaLoading, metaLoadingMessage, handleLogin } =
    useLoginPage({
      onAuthSuccess,
      onMetaAuthSuccess,
      onOAuthPopupClosed,
      onOAuthStart,
    })

  const makeHandler = (method: LoginMethod) => () => void handleLogin(method)

  // Came through someone's invite (referrals, P2): say who, above the buttons.
  const [inviter, setInviter] = useState<Inviter | null>(null)
  useEffect(() => {
    const code = pendingReferral()
    if (code) void fetchInviter(code).then(setInviter)
  }, [])

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
      // Signing in with Facebook is the front door for a business that has a Page and no
      // Google account — which is most of them. handleLogin has had the Meta branch all
      // along; it was the button that never called it.
      onClick: makeHandler('meta'),
    },
  ]

  return (
    <div className="relative w-full h-full">
      {inviter?.first_name && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-2rem)] rounded-full bg-primary/90 px-4 py-2 paragraph-sm text-primary shadow">
          {inviter.first_name} from {inviter.business} invited you to Mia
        </div>
      )}
      <LoginPageMobile actionButtons={renderAuthButtons('mobile', authButtons, isBusy)} />
      <LoginPageDesktop actionButtons={renderAuthButtons('desktop', authButtons, isBusy)} />
    </div>
  )
}
