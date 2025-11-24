import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { getGlobalSDK } from '../sdk'

export interface AccountMapping {
  id: string
  name: string
  google_ads_id: string
  ga4_property_id: string
  meta_ads_id?: string
  facebook_page_id?: string
  facebook_page_name?: string
  brevo_api_key?: string
  brevo_account_name?: string
  business_type: string
  color: string
  display_name: string
}

export interface UserProfile {
  name: string
  email: string
  picture_url: string
  google_user_id: string
  meta_user_id?: string
}

export interface MetaAuthState {
  isMetaAuthenticated: boolean
  metaUser: {
    id: string
    name: string
    email?: string
  } | null
}

export interface SessionState extends MetaAuthState {
  // Authentication state
  isAuthenticated: boolean
  isLoading: boolean
  hasSeenIntro: boolean  // Track if user has seen intro video

  // User information
  user: UserProfile | null

  // Session information
  sessionId: string | null

  // Account selection
  selectedAccount: AccountMapping | null
  availableAccounts: AccountMapping[]

  // Error state
  error: string | null
}

export interface SessionActions {
  // Authentication actions
  login: () => Promise<boolean>
  loginMeta: () => Promise<boolean>
  logout: () => Promise<void>
  logoutMeta: () => Promise<void>

  // Account selection actions
  selectAccount: (accountId: string) => Promise<boolean>
  refreshAccounts: () => Promise<void>

  // Utility actions
  clearError: () => void
  generateSessionId: () => string
  checkExistingAuth: () => Promise<boolean>
  checkMetaAuth: () => Promise<boolean>
}

type SessionContextType = SessionState & SessionActions

const SessionContext = createContext<SessionContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useSession = () => {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

interface SessionProviderProps {
  children: ReactNode
}

export const SessionProvider = ({ children }: SessionProviderProps) => {
  const [state, setState] = useState<SessionState>({
    // Auth state
    isAuthenticated: false,
    isLoading: false,
    hasSeenIntro: localStorage.getItem('mia_has_seen_intro') === 'true',

    // User info
    user: null,

    // Session
    sessionId: null,

    // Account selection
    selectedAccount: null,
    availableAccounts: [],

    // Meta auth
    isMetaAuthenticated: false,
    metaUser: null,

    // Error
    error: null
  })

  const sdk = getGlobalSDK()

  // Generate a unique session ID
  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Define refreshAccounts before useEffect that uses it
  const refreshAccounts = useCallback(async (): Promise<void> => {
    try {
      const result = await sdk.session.getAvailableAccounts()

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          availableAccounts: result.data!.combined || [],
          error: null
        }))
      } else {
        setState(prev => ({ ...prev, error: result.error || 'Failed to fetch accounts' }))
      }
    } catch (error) {
      console.error('[SESSION] Error refreshing accounts:', error)
      setState(prev => ({ ...prev, error: 'Failed to refresh accounts' }))
    }
  }, [])

  // Initialize session on mount - check for existing session first
  useEffect(() => {
    const initializeSession = async () => {
      setState(prev => ({ ...prev, isLoading: true }))

      try {
        // Check localStorage for existing session
        const storedSessionId = localStorage.getItem('mia_session_id')

        if (storedSessionId) {
          console.log('[SESSION] Found stored session, validating...', storedSessionId)

          // Validate session with backend
          const result = await sdk.session.validateSession(storedSessionId)

          if (result.success && result.data && result.data.valid) {
            const data = result.data

            console.log('[SESSION] Session valid, restoring state')

            // Restore auth state from validated session
            setState(prev => ({
              ...prev,
              sessionId: storedSessionId,
              isAuthenticated: data.authenticated || false,
              isMetaAuthenticated: data.meta_authenticated || false,
              user: data.user_info ? {
                name: data.user_info.name || '',
                email: data.user_info.email,
                picture_url: data.user_info.picture || '',
                google_user_id: data.user_info.google_user_id
              } : null,
              selectedAccount: data.selected_account || null,
              isLoading: false,
              error: null
            }))

            // If we have a valid session, refresh available accounts
            if (data.authenticated) {
              await refreshAccounts()
            }

            return
          } else {
            console.log('[SESSION] Session invalid, clearing...')
            localStorage.removeItem('mia_session_id')
          }
        }

        // No valid session found
        console.log('[SESSION] No valid session, starting fresh')
        setState(prev => ({
          ...prev,
          sessionId: generateSessionId(),
          isLoading: false
        }))

      } catch (error) {
        console.error('[SESSION] Error during session initialization:', error)
        setState(prev => ({
          ...prev,
          sessionId: generateSessionId(),
          isLoading: false,
          error: 'Failed to initialize session'
        }))
      }
    }

    initializeSession()
  }, [refreshAccounts])

  // Login with Google OAuth popup
  const login = async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await sdk.session.loginGoogleWithPopup()

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          sessionId: result.data!.session_id || prev.sessionId,
          user: result.data!.user_info ? {
            name: result.data!.user_info.name || '',
            email: result.data!.user_info.email,
            picture_url: result.data!.user_info.picture || '',
            google_user_id: result.data!.user_info.google_user_id
          } : null,
          isLoading: false,
          error: null
        }))

        // Store session ID
        if (result.data.session_id) {
          localStorage.setItem('mia_session_id', result.data.session_id)
        }

        await refreshAccounts()
        return true
      } else {
        setState(prev => ({ ...prev, isLoading: false, error: result.error || 'Login failed' }))
        return false
      }
    } catch (error) {
      console.error('[SESSION] Login error:', error)
      setState(prev => ({ ...prev, isLoading: false, error: 'Login failed' }))
      return false
    }
  }

  // Login with Meta OAuth popup
  const loginMeta = async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await sdk.session.loginMetaWithPopup()

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          isMetaAuthenticated: true,
          metaUser: result.data!.user_info ? {
            id: result.data!.user_info.meta_user_id || '',
            name: result.data!.user_info.name || '',
            email: result.data!.user_info.email
          } : null,
          isLoading: false,
          error: null
        }))

        return true
      } else {
        setState(prev => ({ ...prev, isLoading: false, error: result.error || 'Meta login failed' }))
        return false
      }
    } catch (error) {
      console.error('[SESSION] Meta login error:', error)
      setState(prev => ({ ...prev, isLoading: false, error: 'Meta login failed' }))
      return false
    }
  }

  // Logout from Google
  const logout = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await sdk.session.logoutGoogle()

      // Clear stored session
      localStorage.removeItem('mia_session_id')
      localStorage.removeItem('mia_last_user_id')

      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        sessionId: generateSessionId(),
        selectedAccount: null,
        availableAccounts: [],
        isLoading: false,
        error: null
      }))

    } catch (error) {
      console.error('[SESSION] Logout error:', error)
      setState(prev => ({ ...prev, isLoading: false, error: 'Logout failed' }))
    }
  }

  // Logout from Meta
  const logoutMeta = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await sdk.session.logoutMeta()

      setState(prev => ({
        ...prev,
        isMetaAuthenticated: false,
        metaUser: null,
        isLoading: false,
        error: null
      }))

    } catch (error) {
      console.error('[SESSION] Meta logout error:', error)
      setState(prev => ({ ...prev, isLoading: false, error: 'Meta logout failed' }))
    }
  }

  // Select an account
  const selectAccount = async (accountId: string, businessType?: string, industry?: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await sdk.session.selectAccount(accountId, businessType, industry)

      if (result.success) {
        // Find the selected account in available accounts
        const account = state.availableAccounts.find(acc => acc.id === accountId)
        
        if (account) {
          setState(prev => ({
            ...prev,
            selectedAccount: account,
            isLoading: false,
            error: null
          }))
        }

        return true
      } else {
        setState(prev => ({ ...prev, isLoading: false, error: result.error || 'Account selection failed' }))
        return false
      }
    } catch (error) {
      console.error('[SESSION] Account selection error:', error)
      setState(prev => ({ ...prev, isLoading: false, error: 'Account selection failed' }))
      return false
    }
  }

  // Check existing Google auth
  const checkExistingAuth = async (): Promise<boolean> => {
    try {
      const result = await sdk.session.getGoogleAuthStatus()

      if (result.success && result.data && result.data.authenticated) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: result.data!.user_info ? {
            name: result.data!.user_info.name || '',
            email: result.data!.user_info.email,
            picture_url: result.data!.user_info.picture || '',
            google_user_id: result.data!.user_info.google_user_id
          } : null
        }))

        return true
      }

      return false
    } catch (error) {
      console.error('[SESSION] Check auth error:', error)
      return false
    }
  }

  // Check existing Meta auth
  const checkMetaAuth = async (): Promise<boolean> => {
    try {
      const result = await sdk.session.getMetaAuthStatus()

      if (result.success && result.data && result.data.authenticated) {
        setState(prev => ({
          ...prev,
          isMetaAuthenticated: true,
          metaUser: result.data!.user_info ? {
            id: result.data!.user_info.meta_user_id || '',
            name: result.data!.user_info.name || '',
            email: result.data!.user_info.email
          } : null
        }))

        return true
      }

      return false
    } catch (error) {
      console.error('[SESSION] Check Meta auth error:', error)
      return false
    }
  }

  // Clear error
  const clearError = () => {
    setState(prev => ({ ...prev, error: null }))
  }

  const contextValue: SessionContextType = {
    // State
    ...state,

    // Actions
    login,
    loginMeta,
    logout,
    logoutMeta,
    selectAccount,
    refreshAccounts,
    clearError,
    generateSessionId,
    checkExistingAuth,
    checkMetaAuth
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  )
}

export default SessionProvider
