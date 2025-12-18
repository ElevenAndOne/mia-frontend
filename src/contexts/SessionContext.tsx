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
  google_ads_account_type?: string  // "mcc", "standalone", or "mcc_subaccount"
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
          // Get user_id from URL if present (passed by backend callback)
          const authUserId = urlParams.get('user_id')
          console.log('[SESSION] Mobile OAuth user_id from URL:', authUserId)

          // Clear the URL parameter
          window.history.replaceState({}, '', window.location.pathname)
          // Clear the pending OAuth flag
          localStorage.removeItem('mia_oauth_pending')
          localStorage.removeItem('mia_oauth_return_url')

          // Complete OAuth by creating database session - pass user_id if available
          try {
            const completeUrl = authUserId
              ? `/api/oauth/google/complete?user_id=${authUserId}`
              : '/api/oauth/google/complete'

            const completeResponse = await apiFetch(completeUrl, {
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

          // PERF FIX (Dec 1): Fetch session validation AND accounts in parallel
          // This saves ~500-1000ms by not waiting for validation before fetching accounts
          const [sessionResponse, accountsResponse] = await Promise.all([
            apiFetch(`/api/session/validate?session_id=${storedSessionId}`),
            apiFetch('/api/accounts/available', {
              headers: { 'X-Session-ID': storedSessionId }
            })
          ])

          if (sessionResponse.ok) {
            const data = await sessionResponse.json()

            if (data.valid) {
              console.log('[SESSION] Session valid, restoring state')

              let fullSelectedAccount = null
              let availableAccounts: AccountMapping[] = []

              // Use already-fetched accounts data (no extra wait)
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

  const login = async (onPopupClosed?: () => void): Promise<boolean> => {
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

      // Desktop: use popup flow with message listener for user_id
      const popup = window.open(
        authData.auth_url,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Listen for postMessage from OAuth callback with user_id
      return new Promise((resolve) => {
        let authUserId: string | null = null

        const messageHandler = (event: MessageEvent) => {
          // Handle the OAuth completion message from the popup
          if (event.data && event.data.type === 'oauth_complete' && event.data.provider === 'google') {
            authUserId = event.data.user_id
            console.log('[SESSION] Received OAuth complete message with user_id:', authUserId)
          }
        }

        window.addEventListener('message', messageHandler)

        const pollTimer = setInterval(async () => {
          try {
            if (popup.closed) {
              clearInterval(pollTimer)
              window.removeEventListener('message', messageHandler)

              // Notify caller that popup has closed (for loading screen)
              onPopupClosed?.()

              // Complete OAuth by creating database session - pass user_id if we received it
              try {
                const completeUrl = authUserId
                  ? `/api/oauth/google/complete?user_id=${authUserId}`
                  : '/api/oauth/google/complete'

                console.log('[SESSION] Completing OAuth with URL:', completeUrl)

                const completeResponse = await apiFetch(completeUrl, {
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
                    hasSeenIntro: statusData.user_info?.has_seen_intro || prev.hasSeenIntro,  // Update from backend
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
            window.removeEventListener('message', messageHandler)
            console.error('[SESSION] Auth polling error:', error)
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: 'Authentication failed'
            }))
            resolve(false)
          }
        }, 3000)  // Poll every 3 seconds (reduced from 1s to decrease server load)

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollTimer)
          window.removeEventListener('message', messageHandler)
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
      // SECURITY FIX (Nov 30, 2025): Include session ID so backend can invalidate correct session
      await apiFetch('/api/oauth/google/logout', {
        method: 'POST',
        headers: {
          'X-Session-ID': state.sessionId || ''
        }
      })

      // Clear stored session and user data
      localStorage.removeItem('mia_session_id')
      localStorage.removeItem('mia_last_user_id')
      localStorage.removeItem('mia_app_state')  // Reset to main page on next login

      // Generate new session and store it
      const newSessionId = generateSessionId()
      localStorage.setItem('mia_session_id', newSessionId)

      setState(prev => ({
        isAuthenticated: false,
        isLoading: false,
        hasSeenIntro: prev.hasSeenIntro,  // Preserve - once you've seen intro, you've seen it
        user: null,
        sessionId: newSessionId,
        selectedAccount: null,
        availableAccounts: [],
        error: null,
        isMetaAuthenticated: false,
        metaUser: null
      }))
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
          // FIX (Nov 30, 2025): If needs_session_creation is true, we need to create a session first
          // This happens when credentials exist but session was logged out
          if (authData.needs_session_creation) {
            console.log('[SESSION] Credentials exist but need new session, calling /complete')
            const userId = authData.user_info?.id || ''
            if (userId) {
              const completeResponse = await apiFetch(`/api/oauth/google/complete?user_id=${userId}`, {
                method: 'POST',
                headers: {
                  'X-Session-ID': state.sessionId || ''
                }
              })
              if (!completeResponse.ok) {
                console.error('[SESSION] Failed to create session via /complete')
                return false
              }
              console.log('[SESSION] New session created successfully')
            }
          }

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

  const loginMeta = async (onPopupClosed?: () => void): Promise<boolean> => {
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

              // Notify caller that popup has closed (for loading screen)
              onPopupClosed?.()

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
                    const completeData = await completeResponse.json()
                    console.log('[SESSION] Meta OAuth complete response:', completeData)

                    // CRITICAL: Set the user object so /api/accounts/available works
                    // The user.id from complete response is the google_user_id stored in the session
                    setState(prev => ({
                      ...prev,
                      isLoading: false,
                      isMetaAuthenticated: true,
                      isAuthenticated: false,  // Not Google authenticated, but Meta is
                      user: completeData.user ? {
                        google_user_id: completeData.user.id,
                        name: completeData.user.name || 'Meta User',
                        email: completeData.user.email || '',
                        picture_url: ''  // Meta doesn't provide picture in our flow
                      } : prev.user,
                      metaUser: {
                        id: completeData.user?.id || statusData.user_info?.id || '',
                        name: completeData.user?.name || statusData.user_info?.name || 'Meta User',
                        email: completeData.user?.email || statusData.user_info?.email
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
        }, 3000)  // Poll every 3 seconds (reduced from 1s to decrease server load)

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