import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FigmaLoginModal from './FigmaLoginModal'

interface VideoIntroViewProps {
  onAuthSuccess?: () => void
  hasSeenIntro?: boolean  // If true, skip video and show login modal immediately
}

const VideoIntroView = ({ onAuthSuccess, hasSeenIntro = false }: VideoIntroViewProps) => {
  const [showLoginModal, setShowLoginModal] = useState(hasSeenIntro)  // ✅ Show immediately if returning user
  const [videoPhase, setVideoPhase] = useState<'intro' | 'looping'>('intro')
  const [modalTimerSet, setModalTimerSet] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const modalTimerRef = useRef<NodeJS.Timeout | null>(null)

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  // ✅ CRITICAL: Auto-show login modal for returning users (signed out / session expired)
  useEffect(() => {
    if (hasSeenIntro && !showLoginModal) {
      console.log('[VIDEO-INTRO] Returning user detected - showing login modal immediately')
      setShowLoginModal(true)
    }
  }, [hasSeenIntro])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime
      const duration = video.duration

      // Show modal at 33 seconds (only once)
      if (duration && currentTime >= 33 && !modalTimerSet && !showLoginModal) {
        setModalTimerSet(true)
        setShowLoginModal(true)
      }

      // Check if we've reached the looping section (last 10 seconds)
      if (duration && currentTime >= (duration - 10) && videoPhase === 'intro') {
        setVideoPhase('looping')
      }

      // Handle seamless looping - jump back to loop start before video ends
      if (videoPhase === 'looping' && duration && currentTime >= duration - 0.1) {
        video.currentTime = duration - 10
      }
    }

    const handleEnded = () => {
      // This should rarely fire due to seamless loop handling above
      if (videoPhase === 'intro') {
        setVideoPhase('looping')
        const duration = video.duration
        if (duration) {
          video.currentTime = duration - 10
          video.play()
        }
        // Show modal after delay
        modalTimerRef.current = setTimeout(() => {
          setShowLoginModal(true)
        }, 3000)
      } else {
        // In loop phase - restart the loop section
        const duration = video.duration
        if (duration) {
          video.currentTime = duration - 10
          video.play()
        }
      }
    }

    const handleLoadedMetadata = () => {
      setVideoLoaded(true)
    }

    const handleCanPlayThrough = () => {
      // ✅ Don't autoplay video if user has seen intro before
      if (hasSeenIntro) {
        console.log('[VIDEO-INTRO] Skipping video autoplay for returning user')
        return
      }

      video.play().then(() => {
        setVideoPlaying(true)
      }).catch(error => {
        console.error('🚫 Video autoplay failed:', error)
        // Don't show modal immediately - let user tap to play or use skip button
      })
    }

    const handlePlaying = () => {
      setVideoPlaying(true)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplaythrough', handleCanPlayThrough)
    video.addEventListener('playing', handlePlaying)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplaythrough', handleCanPlayThrough)
      video.removeEventListener('playing', handlePlaying)

      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current)
      }
    }
  }, []) // Remove videoPhase dependency to prevent effect re-running

  // Handle tap to play for iOS
  const handleTapToPlay = () => {
    const video = videoRef.current
    if (video) {
      video.play().then(() => {
        setVideoPlaying(true)
      }).catch(err => {
        console.error('Tap to play failed:', err)
      })
    }
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-purple-900 via-purple-700 to-blue-800">
      {/* Fullscreen Video Background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        autoPlay
        playsInline
        // @ts-ignore - webkit prefix for iOS
        webkit-playsinline="true"
        preload="auto"
        style={{ willChange: 'transform' }}
      >
        <source src="/videos/Mia_AppIntroVideo_compressed_fixed.mp4" type="video/mp4" />
      </video>

      {/* Tap to Play overlay for iOS when video not playing */}
      {!videoPlaying && !showLoginModal && !hasSeenIntro && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-pointer"
          onClick={handleTapToPlay}
        >
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 mb-4">
            <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <p className="text-white text-lg font-medium">Tap to play</p>
        </div>
      )}

      {/* Skip Button - Top Right */}
      {!showLoginModal && (
        <button
          onClick={() => setShowLoginModal(true)}
          className="absolute top-4 right-4 z-50 p-3 transition-all duration-200 hover:opacity-70"
          aria-label="Skip video"
        >
          <svg
            className="w-6 h-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* Login Modal - slides up from bottom */}
      <AnimatePresence>
        {showLoginModal && (
          <FigmaLoginModal
            onAuthSuccess={onAuthSuccess}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

export default VideoIntroView