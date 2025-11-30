import { motion } from 'framer-motion'
import { useSession } from '../contexts/SessionContext'
import { useState } from 'react'

interface FigmaLoginModalProps {
  onAuthSuccess?: () => void
}

const FigmaLoginModal = ({ onAuthSuccess }: FigmaLoginModalProps) => {
  const { login, checkExistingAuth, refreshAccounts } = useSession()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [googleLoadingMessage, setGoogleLoadingMessage] = useState('')

  const handleLoginClick = async (method: string) => {
    if (method === 'Google') {
      try {
        setIsGoogleLoading(true)
        setGoogleLoadingMessage('Opening Google sign-in...')

        // Use new SessionContext login method
        const success = await login()

        if (success) {
          setGoogleLoadingMessage('Authentication successful!')

          // Trigger the auth success callback immediately
          if (onAuthSuccess) {
            onAuthSuccess()
          } else {
            console.warn('⚠️ No onAuthSuccess callback provided')
          }
        } else {
          throw new Error('Authentication failed')
        }

      } catch (error) {
        console.error('💥 Error during OAuth:', error)
        if (error instanceof Error) {
          alert(`Authentication failed: ${error.message}`)
        } else {
          alert('Authentication failed. Please try again.')
        }
        setIsGoogleLoading(false)
        setGoogleLoadingMessage('')
      }
    } else if (method === 'Login') {
      // Login button - check for existing session first, then redirect to Google OAuth
      // SECURITY FIX (Nov 30, 2025): Removed bypass-login endpoint call - always use proper OAuth

      try {
        setIsGoogleLoading(true)
        setGoogleLoadingMessage('Checking session...')

        // First, check if user is already authenticated via session validation
        const authCheck = await checkExistingAuth()

        if (authCheck) {
          console.log('[LOGIN] User already authenticated, skipping to app')
          setGoogleLoadingMessage('Session found! Redirecting...')

          // Refresh accounts to ensure we have latest data
          await refreshAccounts()

          // Small delay for UX
          setTimeout(() => {
            if (onAuthSuccess) {
              onAuthSuccess()
            }
            setIsGoogleLoading(false)
          }, 200)
          return
        }

        // No valid session found - redirect to Google OAuth (same as "Continue with Google")
        console.log('[LOGIN] No valid session, redirecting to Google OAuth')
        setGoogleLoadingMessage('Redirecting to sign in...')

        const success = await login()

        if (success) {
          setGoogleLoadingMessage('Authentication successful!')

          if (onAuthSuccess) {
            onAuthSuccess()
          }
        } else {
          throw new Error('Authentication failed')
        }

      } catch (error) {
        console.error('💥 Login failed:', error)
        if (error instanceof Error) {
          alert(`Login failed: ${error.message}`)
        } else {
          alert('Login failed. Please try again.')
        }
        setIsGoogleLoading(false)
        setGoogleLoadingMessage('')
      }
    } else {
      alert(`${method} login coming soon!`)
    }
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="fixed left-0 right-0 z-50"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        bottom: '-15px' // Push modal DOWN (away from text)
      }}
    >
      {/* White Modal - 3 buttons layout (Meta removed for cleaner UX - connect Meta via Integrations) */}
      <div
        className="bg-white rounded-t-[38px] px-6 py-5 shadow-2xl touch-manipulation"
        style={{
          touchAction: 'manipulation',
          height: '220px', // Adjusted for 3 buttons
          width: '100%'
        }}
      >
        {/* Continue with Google Button */}
        <button
          onClick={() => handleLoginClick('Google')}
          disabled={isGoogleLoading}
          className={`w-full border border-gray-200 rounded-2xl py-3 px-6 mb-2 flex items-center justify-center space-x-3 transition-colors touch-manipulation min-h-[44px] ${
            isGoogleLoading
              ? 'bg-gray-100 cursor-not-allowed'
              : 'bg-white hover:bg-gray-50 active:bg-gray-100'
          }`}
        >
          {isGoogleLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-gray-600 font-medium">{googleLoadingMessage}</span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <span className="text-gray-900 font-medium">Continue with Google</span>
            </>
          )}
        </button>

        {/* Sign up with email Button */}
        <button
          onClick={() => handleLoginClick('Email')}
          className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-6 mb-2 flex items-center justify-center space-x-3 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px]"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-gray-600">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
          <span className="text-gray-900 font-medium">Sign up with email</span>
        </button>

        {/* Log in Button - Black */}
        <button
          onClick={() => handleLoginClick('Login')}
          className="w-full bg-black text-white rounded-2xl py-3 px-6 font-medium hover:bg-gray-800 active:bg-gray-700 transition-colors touch-manipulation min-h-[44px]"
        >
          Log in
        </button>
      </div>
    </motion.div>
  )
}

export default FigmaLoginModal