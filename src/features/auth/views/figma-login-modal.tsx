import { useSession } from '../../../contexts/session-context'
import { useState } from 'react'

interface FigmaLoginModalProps {
  onAuthSuccess?: () => void
  onMetaAuthSuccess?: () => void  // New callback for Meta-first flow
  onOAuthPopupClosed?: (platform: 'google' | 'meta') => void  // Called when popup closes (triggers App-level loading)
  onOAuthStart?: () => void  // Called when OAuth popup opens (hides video immediately)
}

const FigmaLoginModal = ({ onAuthSuccess, onMetaAuthSuccess, onOAuthPopupClosed, onOAuthStart }: FigmaLoginModalProps) => {
  const { login, loginMeta, checkExistingAuth, refreshAccounts } = useSession()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [googleLoadingMessage, setGoogleLoadingMessage] = useState('')
  const [isMetaLoading, setIsMetaLoading] = useState(false)
  const [metaLoadingMessage, setMetaLoadingMessage] = useState('')

  const handleLoginClick = async (method: string) => {
    if (method === 'Google') {
      try {
        setIsGoogleLoading(true)
        setGoogleLoadingMessage('Opening Google sign-in...')
        onOAuthStart?.()  // Hide video immediately

        // Use new SessionContext login method with popup close callback
        const success = await login(() => onOAuthPopupClosed?.('google'))

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
    } else if (method === 'Meta') {
      // Meta-first flow - authenticate with Meta first
      try {
        setIsMetaLoading(true)
        setMetaLoadingMessage('Opening Meta sign-in...')
        onOAuthStart?.()  // Hide video immediately

        const success = await loginMeta(() => onOAuthPopupClosed?.('meta'))

        if (success) {
          setMetaLoadingMessage('Authentication successful!')

          // Trigger the Meta auth success callback (goes to Meta account selection)
          if (onMetaAuthSuccess) {
            onMetaAuthSuccess()
          } else if (onAuthSuccess) {
            // Fallback to regular auth success if Meta callback not provided
            onAuthSuccess()
          }
        } else {
          throw new Error('Meta authentication failed')
        }

      } catch (error) {
        console.error('[META-LOGIN] Error during OAuth:', error)
        if (error instanceof Error) {
          alert(`Meta authentication failed: ${error.message}`)
        } else {
          alert('Meta authentication failed. Please try again.')
        }
        setIsMetaLoading(false)
        setMetaLoadingMessage('')
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
        onOAuthStart?.()  // Hide video immediately

        const success = await login(() => onOAuthPopupClosed?.('google'))

        if (success) {
          setGoogleLoadingMessage('Authentication successful!')

          if (onAuthSuccess) {
            onAuthSuccess()
          }
        } else {
          throw new Error('Authentication failed')
        }

      } catch (error) {
        console.error('[LOGIN] Login failed:', error)
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
    <div
      className="fixed left-0 right-0 z-50"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        bottom: '-15px' // Push modal DOWN (away from text)
      }}
    >
      {/* White Modal - 4 buttons layout (Google, Meta, Email, Login) */}
      <div
        className="bg-primary rounded-t-[38px] px-6 py-5 shadow-2xl touch-manipulation"
        style={{
          touchAction: 'manipulation',
          height: '270px', // Adjusted for 4 buttons
          width: '100%'
        }}
      >
        {/* Continue with Google Button */}
        <button
          onClick={() => handleLoginClick('Google')}
          disabled={isGoogleLoading || isMetaLoading}
          className={`w-full border border-secondary rounded-2xl py-3 px-6 mb-2 flex items-center justify-center space-x-3 touch-manipulation min-h-[44px] ${
            isGoogleLoading || isMetaLoading
              ? 'bg-tertiary cursor-not-allowed'
              : 'bg-primary hover:bg-secondary active:bg-tertiary'
          }`}
        >
          {isGoogleLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-primary border-t-utility-brand-600 rounded-full animate-spin"></div>
              <span className="subheading-md text-tertiary">{googleLoadingMessage}</span>
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
              <span className="subheading-bg text-primary">Continue with Google</span>
            </>
          )}
        </button>

        {/* Continue with Meta Button */}
        <button
          onClick={() => handleLoginClick('Meta')}
          disabled={isGoogleLoading || isMetaLoading}
          className={`w-full border border-secondary rounded-2xl py-3 px-6 mb-2 flex items-center justify-center space-x-3 touch-manipulation min-h-[44px] ${
            isGoogleLoading || isMetaLoading
              ? 'bg-tertiary cursor-not-allowed'
              : 'bg-primary hover:bg-secondary active:bg-tertiary'
          }`}
        >
          {isMetaLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-primary border-t-utility-brand-600 rounded-full animate-spin"></div>
              <span className="subheading-md text-tertiary">{metaLoadingMessage}</span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#0866FF" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <span className="subheading-bg text-primary">Continue with Meta</span>
            </>
          )}
        </button>

        {/* Sign up with email Button */}
        <button
          onClick={() => handleLoginClick('Email')}
          disabled={isGoogleLoading || isMetaLoading}
          className={`w-full bg-primary border border-secondary rounded-2xl py-3 px-6 mb-2 flex items-center justify-center space-x-3 touch-manipulation min-h-[44px] ${
            isGoogleLoading || isMetaLoading
              ? 'bg-tertiary cursor-not-allowed'
              : 'hover:bg-secondary active:bg-tertiary'
          }`}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-tertiary fill-current">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
          <span className="subheading-bg text-primary">Sign up with email</span>
        </button>

        {/* Log in Button - Black */}
        <button
          onClick={() => handleLoginClick('Login')}
          disabled={isGoogleLoading || isMetaLoading}
          className={`w-full bg-brand-solid text-primary-onbrand rounded-2xl py-3 px-6 subheading-bg touch-manipulation min-h-[44px] ${
            isGoogleLoading || isMetaLoading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-brand-solid-hover'
          }`}
        >
          Log in
        </button>
      </div>
    </div>
  )
}

export default FigmaLoginModal
