import { AnimatePresence } from 'framer-motion'
import FigmaLoginModal from './figma-login-modal'

interface VideoIntroViewProps {
  onAuthSuccess?: () => void
  onMetaAuthSuccess?: () => void
  hasSeenIntro?: boolean
  onOAuthPopupClosed?: (platform: 'google' | 'meta') => void
}

const VideoIntroView = ({ onAuthSuccess, onMetaAuthSuccess, onOAuthPopupClosed }: VideoIntroViewProps) => {
  return (
    <div className="relative w-full h-full overflow-hidden bg-linear-to-br from-purple-900 via-purple-700 to-blue-800">
      <AnimatePresence>
        <FigmaLoginModal
          onAuthSuccess={onAuthSuccess}
          onMetaAuthSuccess={onMetaAuthSuccess}
          onOAuthPopupClosed={onOAuthPopupClosed}
        />
      </AnimatePresence>
    </div>
  )
}

export default VideoIntroView
