import { LoginPage } from '../features/auth/components/login-page'

interface IntroPageProps {
  onAuthSuccess?: () => void
  onMetaAuthSuccess?: () => void
  hasSeenIntro?: boolean
  onOAuthPopupClosed?: (platform: 'google' | 'meta' | null) => void
}

const IntroPage = ({ onAuthSuccess, onMetaAuthSuccess, onOAuthPopupClosed }: IntroPageProps) => {
  return (
    <LoginPage
      onAuthSuccess={onAuthSuccess}
      onMetaAuthSuccess={onMetaAuthSuccess}
      onOAuthPopupClosed={onOAuthPopupClosed}
    />
  )
}

export default IntroPage
