/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { getGlobalSDK } from '../sdk'
import { MarketingAccount } from '../sdk/types'

export interface AccountMapping {
  id: string
  name: string
  google_ads_id: string
  ga4_property_id: string
  business_type: string
  is_active: boolean
  sort_order: number
}

export interface SessionState {
  sessionId: string | null
  isAuthenticated: boolean
  isMetaAuthenticated: boolean
  hasSeenIntro: boolean
  isLoading: boolean
  error: string | null
  user: {
    email: string
    name: string
    picture_url: string
    google_user_id: string
  } | null
  selectedAccount: MarketingAccount | null
}

interface SessionContextType {
  state: SessionState
  login: () => Promise<boolean>
  logout: () => Promise<void>
  loginMeta: () => Promise<boolean>
  logoutMeta: () => Promise<void>
  setHasSeenIntro: (seen: boolean) => void
  selectAccount: (accountId: string, businessType?: string, industry?: string) => Promise<boolean>
  refreshAccounts: () => Promise<void>
  checkExistingAuth: () => Promise<boolean>
  checkMetaAuth: () => Promise<boolean>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

interface SessionProviderProps {
  children: ReactNode
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  // Get SDK instance
  const sdk = getGlobalSDK()

  const [state, setState] = useState<SessionState>({
    sessionId: null,
    isAuthenticated: false,
    isMetaAuthenticated: false,
    hasSeenIntro: false,
    isLoading: true,
    error: null,
    user: null,
    selectedAccount: null
  })

  // Define refreshAccounts before useEffect that uses it
  const refreshAccounts = useCallback(async (): Promise<void> => {
    try {
      const response = await sdk.session.getAvailableAccounts()
      
      if (response.success && response.data) {
        // Handle accounts data - you can update state as needed
        console.log('[SESSION] ✅ Accounts refreshed:', response.data)
      } else {
        console.warn('[SESSION] ⚠️ Failed to refresh accounts:', response.error)
      }
    } catch (error) {
      console.error('[SESSION] ❌ Error refreshing accounts:', error)
    }
  }, [sdk])

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Initialize or get existing session ID
        const sessionId = sdk.session.initializeSession()
        
        setState(prev => ({ ...prev, sessionId, isLoading: false }))

        // Check for stored session and validate
        const storedSessionId = localStorage.getItem('mia_session_id')
        if (storedSessionId && storedSessionId !== sessionId) {
          console.log('[SESSION] Found stored session, validating...', storedSessionId)

          const response = await sdk.session.validateSession(storedSessionId)

          if (response.success && response.data?.valid) {
            const data = response.data
            
            // Update session ID to stored one if valid
            sdk.client.setSessionId(storedSessionId)
            
            setState(prev => ({
              ...prev,
              sessionId: storedSessionId,
              isAuthenticated: data.authenticated || false,
              isMetaAuthenticated: data.meta_authenticated || false,
              user: data.user_info ? {
                email: data.user_info.email,
                name: data.user_info.name || '',
                picture_url: data.user_info.picture || '',
                google_user_id: data.user_info.google_user_id
              } : null,
              selectedAccount: data.selected_account,
              hasSeenIntro: localStorage.getItem('mia_has_seen_intro') === 'true'
            }))

            // Refresh accounts if authenticated
            if (data.authenticated) {
              await refreshAccounts()
            }
          } else {
            console.log('[SESSION] Stored session invalid, clearing...')
            localStorage.removeItem('mia_session_id')
          }
        }

        // Check intro status
        const hasSeenIntro = localStorage.getItem('mia_has_seen_intro') === 'true'
        setState(prev => ({ ...prev, hasSeenIntro }))
        
        // Auto-refresh accounts every 60 seconds if authenticated
        const interval = setInterval(async () => {
          if (state.isAuthenticated) {
            await refreshAccounts()
          }
        }, 60000)

        return () => clearInterval(interval)
      } catch (error) {
        console.error('[SESSION] Initialization error:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to initialize session'
        }))
      }
    }

    initializeSession()
  }, [sdk, refreshAccounts, state.isAuthenticated])

  const login = async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await sdk.session.loginGoogleWithPopup()
      
      if (result.success && result.data) {
        const { user_info } = result.data
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: true,
          user: {
            email: user_info.email,
            name: user_info.name || '',
            picture_url: user_info.picture || '',
            google_user_id: user_info.google_user_id || ''
          },
          selectedAccount: result.data.selected_account
        }))

        // Store last authenticated user ID for "Log in" button
        if (user_info.google_user_id) {
          localStorage.setItem('mia_last_user_id', user_info.google_user_id)
          console.log('[SESSION] 💾 Saved last user ID:', user_info.google_user_id)
        }

        return true
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Login failed'
        }))
        return false
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }))
      return false
    }
  }

  const logout = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await sdk.session.logoutGoogle()

      // Clear stored session
      localStorage.removeItem('mia_session_id')
      localStorage.removeItem('mia_selected_account')
      localStorage.removeItem('mia_last_user_id')

      // Clear SDK session
      sdk.session.clearSession()

      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        selectedAccount: null,
        error: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      }))
    }
  }

  const selectAccount = async (accountId: string, businessType?: string, industry?: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const response = await sdk.session.selectAccount(accountId, businessType, industry)

      if (response.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          selectedAccount: response.data,
          error: null
        }))
        
        // Store selected account
        localStorage.setItem('mia_selected_account', JSON.stringify(response.data))
        
        return true
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Account selection failed'
        }))
        return false
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Account selection failed'
      }))
      return false
    }
  }

  const checkExistingAuth = async (): Promise<boolean> => {
    try {
      const response = await sdk.session.checkGoogleAuthStatus()
      
      if (response.success && response.data?.authenticated && response.data.user_info) {
        const { user_info } = response.data
        const userId = user_info.email // or some other unique identifier

        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: {
            email: user_info.email,
            name: user_info.name || '',
            picture_url: user_info.picture || '',
            google_user_id: userId
          }
        }))

        // Store last authenticated user ID
        if (userId) {
          localStorage.setItem('mia_last_user_id', userId)
          console.log('[SESSION] 💾 Saved last user ID:', userId)
        }

        return true
      }
    } catch (error) {
      console.error('[SESSION] Error checking existing auth:', error)
    }
    return false
  }

  const loginMeta = async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await sdk.session.loginMetaWithPopup()
      
      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isMetaAuthenticated: true,
          error: null
        }))
        return true
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Meta login failed'
        }))
        return false
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Meta login failed'
      }))
      return false
    }
  }

  const logoutMeta = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await sdk.session.logoutMeta()
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isMetaAuthenticated: false,
        error: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Meta logout failed'
      }))
    }
  }

  const checkMetaAuth = async (): Promise<boolean> => {
    try {
      const response = await sdk.session.checkMetaAuthStatus()
      
      if (response.success && response.data?.authenticated) {
        setState(prev => ({
          ...prev,
          isMetaAuthenticated: true
        }))
        return true
      }
    } catch (error) {
      console.error('[SESSION] Error checking Meta auth:', error)
    }
    return false
  }

  const setHasSeenIntro = useCallback((seen: boolean) => {
    setState(prev => ({ ...prev, hasSeenIntro: seen }))
    localStorage.setItem('mia_has_seen_intro', seen.toString())
  }, [])

  const contextValue: SessionContextType = {
    state,
    login,
    logout,
    loginMeta,
    logoutMeta,
    setHasSeenIntro,
    selectAccount,
    refreshAccounts,
    checkExistingAuth,
    checkMetaAuth
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  )
}
