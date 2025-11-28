import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiFetch } from '../utils/api'

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
  hubspot_portal_id?: string
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

export const useSession = () => {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

interface SessionProviderProps {
  children: ReactNode
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [state, setState] = useState<SessionState>({
    isAuthenticated: false,
    isLoading: false,
    hasSeenIntro: false,
    user: null,
    sessionId: null,
    selectedAccount: null,
    availableAccounts: [],
    error: null,
    isMetaAuthenticated: false,
    metaUser: null
  })

  // Generate a unique session ID
  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Initialize session on mount - check for existing session first
  useEffect(() => {
    const initializeSession = async () => {
      setState(prev => ({ ...prev, isLoading: true }))

      try {
        // Check if this is a mobile OAuth redirect callback
        const urlParams = new URLSearchParams(window.location.search)
        const oauthComplete = urlParams.get('oauth_complete')

        // Get or create session ID early - needed for OAuth completion
        let sessionId = localStorage.getItem('mia_session_id')
        if (!sessionId) {
          sessionId = generateSessionId()
          localStorage.setItem('mia_session_id', sessionId)
        }

        if (oauthComplete === 'google') {
          console.log('[SESSION] Mobile OAuth redirect detected, completing flow...')
          // Clear the URL parameter
          window.history.replaceState({}, '', window.location.pathname)
          // Clear the pending OAuth flag
          localStorage.removeItem('mia_oauth_pending')
          localStorage.removeItem('mia_oauth_return_url')

          // Complete OAuth by creating database session
          try {
            const completeResponse = await apiFetch('/api/oauth/google/complete', {
              method: 'POST',
              headers: {
                'X-Session-ID': sessionId
              }
            })

            if (completeResponse.ok) {
              console.log('[SESSION] Mobile OAuth complete success')
              // Continue to check auth status below - the session validation will pick up the new auth
            } else {
              console.error('[SESSION] Mobile OAuth complete failed:', completeResponse.status)
            }
          } catch (error) {
            console.error('[SESSION] Mobile OAuth complete error:', error)
          }
        }

        // Check localStorage for existing session
        const storedSessionId = localStorage.getItem('mia_session_id')

        if (storedSessionId) {
          console.log('[SESSION] Found stored session, validating...', storedSessionId)

          // Validate session with backend
          const response = await apiFetch(`/api/session/validate?session_id=${storedSessionId}`)

          if (response.ok) {
            const data = await response.json()

            if (data.valid) {
              console.log('[SESSION] Session valid, restoring state')

              // Restore auth state from validated session
              // First fetch full accounts data to get complete account info
              const accountsResponse = await apiFetch('/api/accounts/available', {
                headers: {
                  'X-Session-ID': storedSessionId
                }
              })

              let fullSelectedAccount = null
              let availableAccounts: AccountMapping[] = []

              if (accountsResponse.ok) {
                const accountsData = await accountsResponse.json()
                availableAccounts = accountsData.accounts || []
                // Find full account data for selected account
                if (data.selected_account) {
                  fullSelectedAccount = availableAccounts.find(
                    (acc: AccountMapping) => acc.id === data.selected_account.id
                  ) || null
                }
              }

              setState(prev => ({
                ...prev,
                sessionId: storedSessionId,
                isAuthenticated: data.platforms?.google || false,
                isMetaAuthenticated: data.platforms?.meta || false,  // ✅ Restore Meta auth state!
                hasSeenIntro: data.user?.has_seen_intro || false,  // ✅ CRITICAL: Restore has_seen_intro!
                user: {
                  name: data.user.name,
                  email: data.user.email,
                  picture_url: data.user.picture_url,
                  google_user_id: data.user.user_id
                },
                selectedAccount: fullSelectedAccount,
                availableAccounts: availableAccounts,
                isLoading: false
              }))

              // ✅ FIX: Store last user ID on session restore
              if (data.user.user_id) {
                localStorage.setItem('mia_last_user_id', data.user.user_id)
              }

              console.log('[SESSION] Restored auth state: Google=' + (data.platforms?.google || false) + ', Meta=' + (data.platforms?.meta || false))
              return
            } else {
              console.log('[SESSION] Session invalid or expired, creating new session')
              localStorage.removeItem('mia_session_id')
            }
          }
        }

        // No stored session or validation failed - create new session
        const newSessionId = generateSessionId()
        localStorage.setItem('mia_session_id', newSessionId)

        setState(prev => ({
          ...prev,
          sessionId: newSessionId,
          isLoading: false
        }))

      } catch (error) {
        console.error('[SESSION] Initialization error:', error)
        const errorSessionId = generateSessionId()
        localStorage.setItem('mia_session_id', errorSessionId)

        setState(prev => ({
          ...prev,
          error: 'Failed to initialize session',
          sessionId: errorSessionId,
          isLoading: false
        }))
      }
    }

    initializeSession()
  }, [])

  // Detect if running on mobile (iOS Safari is particularly strict about popups)
  const isMobile = (): boolean => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  }

  const login = async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Get auth URL
      const authUrlResponse = await apiFetch('/api/oauth/google/auth-url')

      if (!authUrlResponse.ok) {
        throw new Error('Failed to get auth URL')
      }

      const authData = await authUrlResponse.json()

      // On mobile, use redirect flow instead of popup (iOS Safari blocks delayed popups)
      if (isMobile()) {
        console.log('[SESSION] Mobile detected, using redirect flow')
        // Store session ID and return URL for after OAuth redirect
        localStorage.setItem('mia_oauth_pending', 'google')
        localStorage.setItem('mia_oauth_return_url', window.location.href)
        // Redirect to OAuth (will come back to /oauth/callback)
        window.location.href = authData.auth_url
        return true // Will complete after redirect
      }

      // Desktop: use popup flow
      const popup = window.open(
        authData.auth_url,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Poll for completion
      return new Promise((resolve) => {
        const pollTimer = setInterval(async () => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer)

              // Complete OAuth by creating database session
              try {
                const completeResponse = await apiFetch('/api/oauth/google/complete', {
                  method: 'POST',
                  headers: {
                    'X-Session-ID': state.sessionId
                  }
                })

                if (!completeResponse.ok) {
                  throw new Error(`OAuth complete failed: ${completeResponse.status}`)
                }

                const completeData = await completeResponse.json()
              } catch (error) {
                console.error('[SESSION] OAuth complete error:', error)
                setState(prev => ({
                  ...prev,
                  isLoading: false,
                  error: 'Failed to complete authentication session'
                }))
                resolve(false)
                return
              }

              // Check auth status
              const statusResponse = await apiFetch('/api/oauth/google/status', {
                headers: {
                  'X-Session-ID': state.sessionId
                }
              })
              if (statusResponse.ok) {
                const statusData = await statusResponse.json()

                if (statusData.authenticated) {
                  // Fetch accounts
                  await refreshAccounts()

                  setState(prev => ({
                    ...prev,
                    isAuthenticated: true,
                    isLoading: false,
                    user: {
                      name: statusData.user_info?.name || statusData.name || 'User',
                      email: statusData.user_info?.email || statusData.email || '',
                      picture_url: statusData.user_info?.picture || statusData.picture || '',
                      google_user_id: statusData.user_info?.id || statusData.user_id || ''
                    }
                  }))

                  resolve(true)
                } else {
                  setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Authentication failed'
                  }))
                  resolve(false)
                }
              } else {
                setState(prev => ({
                  ...prev,
                  isLoading: false,
                  error: 'Failed to verify authentication'
                }))
                resolve(false)
              }
            }
          } catch (error) {
            clearInterval(pollTimer)
            console.error('[SESSION] Auth polling error:', error)
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Authentication failed'
            }))
            resolve(false)
          }
        }, 1000)

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollTimer)
          if (!popup.closed) {
            popup.close()
          }
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Authentication timed out'
          }))
          resolve(false)
        }, 300000)
      })
    } catch (error) {
      console.error('[SESSION] Login error:', error)
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
      await apiFetch('/api/oauth/google/logout', { method: 'POST' })

      // Clear stored session
      localStorage.removeItem('mia_session_id')

      // Generate new session and store it
      const newSessionId = generateSessionId()
      localStorage.setItem('mia_session_id', newSessionId)

      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        sessionId: newSessionId,
        selectedAccount: null,
        availableAccounts: [],
        error: null,
        isMetaAuthenticated: false,
        metaUser: null
      })
    } catch (error) {
      console.error('[SESSION] Logout error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Logout failed'
      }))
    }
  }

  const refreshAccounts = async (): Promise<void> => {
    try {
      const response = await apiFetch('/api/accounts/available', {
        headers: {
          'X-Session-ID': state.sessionId || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        const accounts = data.accounts || []
        setState(prev => {
          // Also update selectedAccount if it exists in the new accounts list
          const updatedSelectedAccount = prev.selectedAccount
            ? accounts.find((acc: AccountMapping) => acc.id === prev.selectedAccount?.id) || prev.selectedAccount
            : null
          return {
            ...prev,
            availableAccounts: accounts,
            selectedAccount: updatedSelectedAccount
          }
        })
      } else {
        console.error('[SESSION] Accounts API failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('[SESSION] Failed to refresh accounts:', error)
    }
  }

  const selectAccount = async (accountId: string, industry?: string): Promise<boolean> => {
    if (!state.sessionId) {
      setState(prev => ({ ...prev, error: 'No session ID available' }))
      return false
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {

      const requestBody: any = {
        account_id: accountId,
        session_id: state.sessionId
      }

      // Include industry if provided
      if (industry) {
        requestBody.industry = industry
      }

      const response = await apiFetch('/api/accounts/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': state.sessionId
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const data = await response.json()

        // Find the full account details
        const account = state.availableAccounts.find(acc => acc.id === accountId)

        setState(prev => ({
          ...prev,
          selectedAccount: account || null,
          isLoading: false
        }))

        return true
      } else {
        console.error('[SESSION] Account selection API failed:', response.status, response.statusText)
        throw new Error('Failed to select account')
      }
    } catch (error) {
      console.error('[SESSION] Account selection error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Account selection failed'
      }))
      return false
    }
  }

  const clearError = (): void => {
    setState(prev => ({ ...prev, error: null }))
  }

  const checkExistingAuth = async (): Promise<boolean> => {
    try {
      const authResponse = await apiFetch('/api/oauth/google/status', {
        headers: {
          'X-Session-ID': state.sessionId || ''
        }
      })
      if (authResponse.ok) {
        const authData = await authResponse.json()
        if (authData.authenticated) {
          // Fetch available accounts
          await refreshAccounts()

          // Build selected account from response if available
          let selectedAccount = null
          if (authData.selected_account) {
            selectedAccount = {
              id: authData.selected_account.id,
              name: authData.selected_account.name,
              google_ads_id: authData.selected_account.google_ads_id,
              ga4_property_id: authData.selected_account.ga4_property_id,
              meta_ads_id: authData.selected_account.meta_ads_id,
              business_type: authData.selected_account.business_type,
              color: '',
              display_name: authData.selected_account.name
            }
          }

          const userId = authData.user_info?.id || authData.user_id || ''

          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            hasSeenIntro: authData.user_info?.has_seen_intro || false,
            user: {
              name: authData.user_info?.name || authData.name || 'User',
              email: authData.user_info?.email || authData.email || '',
              picture_url: authData.user_info?.picture || authData.picture || '',
              google_user_id: userId
            },
            selectedAccount: selectedAccount
          }))

          // ✅ FIX: Store last authenticated user ID for "Log in" button
          if (userId) {
            localStorage.setItem('mia_last_user_id', userId)
            console.log('[SESSION] 💾 Saved last user ID:', userId)
          }

          return true
        }
      }
    } catch (error) {
      console.error('[SESSION] Error checking existing auth:', error)
    }
    return false
  }

  const loginMeta = async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Get Meta auth URL
      const authUrlResponse = await apiFetch('/api/oauth/meta/auth-url', {
        headers: {
          'X-Session-ID': state.sessionId || ''
        }
      })

      if (!authUrlResponse.ok) {
        throw new Error('Failed to get Meta auth URL')
      }

      const authData = await authUrlResponse.json()

      // Open popup for OAuth
      const popup = window.open(
        authData.auth_url,
        'meta-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Poll for completion
      return new Promise((resolve) => {
        const pollTimer = setInterval(async () => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer)

              // Check Meta auth status
              const statusResponse = await apiFetch('/api/oauth/meta/status', {
                headers: {
                  'X-Session-ID': state.sessionId || ''
                }
              })

              if (statusResponse.ok) {
                const statusData = await statusResponse.json()

                if (statusData.authenticated) {
                  // Complete Meta OAuth flow - create database session
                  const completeResponse = await apiFetch('/api/oauth/meta/complete', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Session-ID': state.sessionId || ''
                    }
                  })

                  if (completeResponse.ok) {
                    setState(prev => ({
                      ...prev,
                      isLoading: false,
                      isMetaAuthenticated: true,
                      metaUser: {
                        id: statusData.user_info?.id || '',
                        name: statusData.user_info?.name || 'Meta User',
                        email: statusData.user_info?.email
                      }
                    }))

                    // Refresh accounts to include Meta accounts
                    await refreshAccounts()
                    resolve(true)
                  } else {
                    console.error('[SESSION] Failed to complete Meta OAuth')
                    setState(prev => ({
                      ...prev,
                      isLoading: false,
                      error: 'Failed to complete Meta authentication'
                    }))
                    resolve(false)
                  }
                } else {
                  setState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Meta authentication failed'
                  }))
                  resolve(false)
                }
              } else {
                setState(prev => ({
                  ...prev,
                  isLoading: false,
                  error: 'Failed to verify Meta authentication'
                }))
                resolve(false)
              }
            }
          } catch (error) {
            clearInterval(pollTimer)
            console.error('[SESSION] Meta auth polling error:', error)
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Meta authentication failed'
            }))
            resolve(false)
          }
        }, 1000)

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollTimer)
          if (!popup.closed) {
            popup.close()
          }
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Meta authentication timed out'
          }))
          resolve(false)
        }, 300000)
      })
    } catch (error) {
      console.error('[SESSION] Meta login error:', error)
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
      await apiFetch('/api/oauth/meta/logout', {
        method: 'POST',
        headers: {
          'X-Session-ID': state.sessionId || ''
        }
      })

      setState(prev => ({
        ...prev,
        isLoading: false,
        isMetaAuthenticated: false,
        metaUser: null
      }))
    } catch (error) {
      console.error('[SESSION] Meta logout error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Meta logout failed'
      }))
    }
  }

  const checkMetaAuth = async (): Promise<boolean> => {
    try {
      const authResponse = await apiFetch('/api/oauth/meta/status', {
        headers: {
          'X-Session-ID': state.sessionId || ''
        }
      })

      if (authResponse.ok) {
        const authData = await authResponse.json()
        if (authData.authenticated) {
          setState(prev => ({
            ...prev,
            isMetaAuthenticated: true,
            hasSeenIntro: authData.user_info?.has_seen_intro || false,
            metaUser: {
              id: authData.user_info?.id || '',
              name: authData.user_info?.name || 'Meta User',
              email: authData.user_info?.email
            }
          }))
          return true
        }
      }
    } catch (error) {
      console.error('[SESSION] Error checking existing Meta auth:', error)
    }
    return false
  }

  const contextValue: SessionContextType = {
    ...state,
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