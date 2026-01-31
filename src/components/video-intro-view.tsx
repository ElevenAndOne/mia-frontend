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
    <div className="relative w-full h-full overflow-hidden bg-linear-to-br from-utility-purple-700 via-utility-purple-600 to-utility-blue-700">
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
