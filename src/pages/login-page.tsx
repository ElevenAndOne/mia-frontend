import { lazy } from 'react'

const FigmaLoginModal = lazy(() => import('@components/figma-login-modal'))

interface LoginPageProps {
  onAuthSuccess: () => void
  onMetaAuthSuccess: () => void
  onOAuthPopupClosed: (platform: 'google' | 'meta' | null) => void
}

export function LoginPage({ onAuthSuccess, onMetaAuthSuccess, onOAuthPopupClosed }: LoginPageProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-end bg-primary">
      {/* Logo and branding */}
      <div className="flex-1 flex flex-col items-center justify-center">
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
