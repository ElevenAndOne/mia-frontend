import FigmaLoginModal from './figma-login-modal'

interface VideoIntroViewProps {
  onAuthSuccess?: () => void
  onMetaAuthSuccess?: () => void
  hasSeenIntro?: boolean
  onOAuthPopupClosed?: (platform: 'google' | 'meta') => void
}

const VideoIntroView = ({ onAuthSuccess, onMetaAuthSuccess, onOAuthPopupClosed }: VideoIntroViewProps) => {
  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-purple-900 via-purple-700 to-blue-800">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Logo and branding */}
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-16 sm:pt-24">
        <img
          src="/icons/Mia.png"
          alt="Mia"
          className="w-20 h-20 sm:w-24 sm:h-24 mb-4"
        />
        <h1 className="text-white text-3xl sm:text-4xl font-bold tracking-tight">
          Mia
        </h1>
        <p className="text-white/70 text-base sm:text-lg mt-2 text-center px-6">
          Your AI marketing assistant
        </p>
      </div>

      {/* Login Modal - always visible */}
      <FigmaLoginModal
        onAuthSuccess={onAuthSuccess}
        onMetaAuthSuccess={onMetaAuthSuccess}
        onOAuthPopupClosed={onOAuthPopupClosed}
      />
    </div>
  )
}

export default VideoIntroView
