import { AnimatePresence } from 'framer-motion'
import { LoginPage } from '../features/auth/components/login-page'

interface VideoIntroViewProps {
  onAuthSuccess?: () => void
  onMetaAuthSuccess?: () => void
  hasSeenIntro?: boolean
  onOAuthPopupClosed?: (platform: 'google' | 'meta') => void
}

const VideoIntroView = ({ onAuthSuccess, onMetaAuthSuccess, onOAuthPopupClosed }: VideoIntroViewProps) => {
  return (
    <div className="relative w-full h-full overflow-hidden bg-primary">
      <AnimatePresence>
        <LoginPage
          onAuthSuccess={onAuthSuccess}
          onMetaAuthSuccess={onMetaAuthSuccess}
          onOAuthPopupClosed={onOAuthPopupClosed}
        />
      </AnimatePresence>
    </div>
  )
}

export default VideoIntroView
