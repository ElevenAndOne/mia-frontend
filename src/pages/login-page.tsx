import { lazy } from 'react'

const FigmaLoginModal = lazy(() => import('@components/figma-login-modal'))

interface LoginPageProps {
  onAuthSuccess: () => void
  onMetaAuthSuccess: () => void
  onOAuthPopupClosed: (platform: 'google' | 'meta' | null) => void
}

export const LoginPage = ({
  onAuthSuccess,
  onMetaAuthSuccess,
  onOAuthPopupClosed
}: LoginPageProps) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-end bg-primary">
      {/* Logo and branding */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <img
          src="/icons/Mia.png"
          alt="Mia"
          className="w-24 h-24 mb-4"
        />
        <h1 className="display-sm text-primary mb-2">Welcome to Mia</h1>
        <p className="body-md text-secondary">Sign in to continue</p>
      </div>

      {/* Login modal pinned to bottom */}
      <FigmaLoginModal
        onAuthSuccess={onAuthSuccess}
        onMetaAuthSuccess={onMetaAuthSuccess}
        onOAuthPopupClosed={onOAuthPopupClosed}
      />
    </div>
  )
}

export default LoginPage
