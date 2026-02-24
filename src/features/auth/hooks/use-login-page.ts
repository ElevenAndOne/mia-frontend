import { useCallback, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'

export type LoginMethod = 'google' | 'meta' | 'login'

interface UseLoginPageOptions {
  onAuthSuccess?: () => void
  onMetaAuthSuccess?: () => void
  onOAuthPopupClosed?: (platform: 'google' | 'meta' | null) => void
  onOAuthStart?: () => void
}

export interface UseLoginPageResult {
  isBusy: boolean
  isGoogleLoading: boolean
  googleLoadingMessage: string
  isMetaLoading: boolean
  metaLoadingMessage: string
  handleLogin: (method: LoginMethod) => Promise<void>
}

export const useLoginPage = ({
  onAuthSuccess,
  onMetaAuthSuccess,
  onOAuthPopupClosed,
  onOAuthStart,
}: UseLoginPageOptions): UseLoginPageResult => {
  const { login, loginMeta, checkExistingAuth, refreshAccounts } = useSession()
  const { showToast } = useToast()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [googleLoadingMessage, setGoogleLoadingMessage] = useState('')
  const [isMetaLoading, setIsMetaLoading] = useState(false)
  const [metaLoadingMessage, setMetaLoadingMessage] = useState('')

  const showAuthError = useCallback((fallback: string, error: unknown) => {
    const detail = error instanceof Error ? error.message : ''
    showToast('error', detail ? `${fallback}: ${detail}` : fallback)
  }, [showToast])

  const handleLogin = useCallback(async (method: LoginMethod) => {
    if (method === 'google') {
      try {
        setIsGoogleLoading(true)
        setGoogleLoadingMessage('Opening Google sign-in...')
        onOAuthStart?.()
        const success = await login(() => onOAuthPopupClosed?.('google'))
        if (!success) throw new Error('Authentication failed')
        setGoogleLoadingMessage('Authentication successful!')
        onAuthSuccess?.()
      } catch (error) {
        console.error('OAuth error:', error)
        showAuthError('Authentication failed', error)
        setIsGoogleLoading(false)
        setGoogleLoadingMessage('')
        onOAuthPopupClosed?.(null) // Clear app-level loading screen
      }
      return
    }

    if (method === 'meta') {
      try {
        setIsMetaLoading(true)
        setMetaLoadingMessage('Opening Meta sign-in...')
        onOAuthStart?.()
        const success = await loginMeta(() => onOAuthPopupClosed?.('meta'))
        if (!success) throw new Error('Meta authentication failed')
        setMetaLoadingMessage('Authentication successful!')
        if (onMetaAuthSuccess) {
          onMetaAuthSuccess()
        } else {
          onAuthSuccess?.()
        }
      } catch (error) {
        console.error('[META-LOGIN] Error during OAuth:', error)
        showAuthError('Meta authentication failed', error)
        setIsMetaLoading(false)
        setMetaLoadingMessage('')
        onOAuthPopupClosed?.(null) // Clear app-level loading screen
      }
      return
    }

    try {
      setIsGoogleLoading(true)
      setGoogleLoadingMessage('Checking session...')
      const authCheck = await checkExistingAuth()
      if (authCheck) {
        setGoogleLoadingMessage('Session found! Redirecting...')
        await refreshAccounts()
        setTimeout(() => {
          onAuthSuccess?.()
          setIsGoogleLoading(false)
        }, 200)
        return
      }
      setGoogleLoadingMessage('Redirecting to sign in...')
      onOAuthStart?.()
      const success = await login(() => onOAuthPopupClosed?.('google'))
      if (!success) throw new Error('Authentication failed')
      setGoogleLoadingMessage('Authentication successful!')
      onAuthSuccess?.()
    } catch (error) {
      console.error('[LOGIN] Login failed:', error)
      showAuthError('Login failed', error)
      setIsGoogleLoading(false)
      setGoogleLoadingMessage('')
      onOAuthPopupClosed?.(null) // Clear app-level loading screen
    }
  }, [
    checkExistingAuth,
    login,
    loginMeta,
    onAuthSuccess,
    onMetaAuthSuccess,
    onOAuthPopupClosed,
    onOAuthStart,
    refreshAccounts,
    showAuthError,
  ])

  return {
    isBusy: isGoogleLoading || isMetaLoading,
    isGoogleLoading,
    googleLoadingMessage,
    isMetaLoading,
    metaLoadingMessage,
    handleLogin,
  }
}
