import { useState, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import FigmaLoginModal from './figma-login-modal'
import { useSession } from '../contexts/session-context'

interface VideoIntroViewProps {
  onAuthSuccess?: () => void
  onMetaAuthSuccess?: () => void
  hasSeenIntro?: boolean
  onOAuthPopupClosed?: (platform: 'google' | 'meta') => void
}

const VideoIntroView = ({ onAuthSuccess, onMetaAuthSuccess, hasSeenIntro = false, onOAuthPopupClosed }: VideoIntroViewProps) => {
  // Get auth state directly from session context as additional safeguard
  const { isAuthenticated, isMetaAuthenticated, connectingPlatform } = useSession()
  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated

  // Never show video if user is authenticated or OAuth is in progress
  const shouldHideVideo = hasSeenIntro || isAnyAuthenticated || !!connectingPlatform

  const [showLoginModal, setShowLoginModal] = useState(hasSeenIntro || isAnyAuthenticated)
  const [videoPhase, setVideoPhase] = useState<'intro' | 'looping'>('intro')
  const [modalTimerSet, setModalTimerSet] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [oauthStarted, setOAuthStarted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const modalTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-show login modal for returning users or authenticated users
  useEffect(() => {
    if ((hasSeenIntro || isAnyAuthenticated) && !showLoginModal) {
      setShowLoginModal(true)
    }
  }, [hasSeenIntro, isAnyAuthenticated, showLoginModal])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime
      const duration = video.duration

      // Show modal at 33 seconds
      if (duration && currentTime >= 33 && !modalTimerSet && !showLoginModal) {
        setModalTimerSet(true)
        setShowLoginModal(true)
      }

      // Check if we've reached the looping section (last 10 seconds)
      if (duration && currentTime >= (duration - 10) && videoPhase === 'intro') {
        setVideoPhase('looping')
      }

      // Handle seamless looping
      if (videoPhase === 'looping' && duration && currentTime >= duration - 0.1) {
        video.currentTime = duration - 10
      }
    }

    const handleEnded = () => {
      if (videoPhase === 'intro') {
        setVideoPhase('looping')
        const duration = video.duration
        if (duration) {
          video.currentTime = duration - 10
          video.play()
        }
        modalTimerRef.current = setTimeout(() => {
          setShowLoginModal(true)
        }, 3000)
      } else {
        const duration = video.duration
        if (duration) {
          video.currentTime = duration - 10
          video.play()
        }
      }
    }

    const handleCanPlayThrough = () => {
      // Don't autoplay if user has seen intro or is authenticated
      if (shouldHideVideo) return

      video.play().then(() => {
        setVideoPlaying(true)
      }).catch(error => {
        console.error('Video autoplay failed:', error)
      })
    }

    const handlePlaying = () => {
      setVideoPlaying(true)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('canplaythrough', handleCanPlayThrough)
    video.addEventListener('playing', handlePlaying)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('canplaythrough', handleCanPlayThrough)
      video.removeEventListener('playing', handlePlaying)

      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <div className="relative w-full h-full overflow-hidden bg-linear-to-br from-utility-purple-700 via-utility-purple-600 to-utility-blue-700">
      {/* Fullscreen Video Background - hidden when OAuth starts, for returning users, or when authenticated */}
      {!oauthStarted && !shouldHideVideo && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          autoPlay
          playsInline
          preload="auto"
          style={{ willChange: 'transform' }}
        >
          <source src="/videos/Mia_AppIntroVideo_compressed_fixed.mp4" type="video/mp4" />
        </video>
      )}

      {/* Tap to Play overlay for iOS when video not playing */}
      {!videoPlaying && !showLoginModal && !shouldHideVideo && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-pointer"
          onClick={handleTapToPlay}
        >
          <div className="bg-primary/20 backdrop-blur-sm rounded-full p-6 mb-4">
            <svg className="w-16 h-16 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <p className="text-primary text-lg font-medium">Tap to play</p>
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
            className="w-6 h-6 text-utility-purple-500"
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

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <FigmaLoginModal
            onAuthSuccess={onAuthSuccess}
            onMetaAuthSuccess={onMetaAuthSuccess}
            onOAuthPopupClosed={onOAuthPopupClosed}
            onOAuthStart={() => setOAuthStarted(true)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default VideoIntroView
