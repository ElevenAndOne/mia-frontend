import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'

// Import types from feature modules
import type { AccountMapping } from '../features/accounts/types'
import type { UserProfile, MetaAuthState } from '../features/auth/types'
import type { Workspace, WorkspaceRole } from '../features/workspace/types'

// Import services
import * as googleAuthService from '../features/auth/services/google-auth-service'
import * as metaAuthService from '../features/auth/services/meta-auth-service'
import * as sessionService from '../features/auth/services/session-service'
import * as workspaceService from '../features/workspace/services/workspace-service'
import * as accountService from '../features/accounts/services/account-service'
import {
  generateSessionId,
  isMobile,
  clearSessionStorage,
  storeSessionId,
  getStoredSessionId
} from '../utils/session'

// Re-export types for backward compatibility
export type { AccountMapping } from '../features/accounts/types'
export type { UserProfile, MetaAuthState } from '../features/auth/types'
export type { Workspace, WorkspaceRole } from '../features/workspace/types'

export interface SessionState extends MetaAuthState {
  isAuthenticated: boolean
  isLoading: boolean
  hasSeenIntro: boolean
  user: UserProfile | null
  sessionId: string | null
  selectedAccount: AccountMapping | null
  availableAccounts: AccountMapping[]
  activeWorkspace: Workspace | null
  availableWorkspaces: Workspace[]
  error: string | null
  // Track which platform is actively being connected (for correct loading messages)
  connectingPlatform: 'google' | 'meta' | null
}

export interface SessionActions {
  login: (onPopupClosed?: () => void) => Promise<boolean>
  loginMeta: (onPopupClosed?: () => void) => Promise<boolean>
  logout: () => Promise<void>
  logoutMeta: () => Promise<void>
  selectAccount: (accountId: string) => Promise<boolean>
  refreshAccounts: () => Promise<void>
  createWorkspace: (name: string) => Promise<Workspace | null>
  switchWorkspace: (tenantId: string) => Promise<boolean>
  deleteWorkspace: (tenantId: string) => Promise<boolean>
  refreshWorkspaces: () => Promise<void>
  clearError: () => void
  generateSessionId: () => string
  checkExistingAuth: () => Promise<boolean>
  checkMetaAuth: () => Promise<boolean>
  markOnboardingComplete: () => void
}

type SessionContextType = SessionState & SessionActions

const SessionContext = createContext<SessionContextType | undefined>(undefined)

// Lazy initializer - called fresh on each mount to detect OAuth redirect synchronously
const getInitialState = (): SessionState => {
  // Detect OAuth redirect synchronously to prevent video flash
  let connectingPlatform: 'google' | 'meta' | null = null
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const oauthComplete = urlParams.get('oauth_complete')
    if (oauthComplete === 'google' || oauthComplete === 'meta') {
      console.log(`[SESSION] OAuth redirect detected in initial state: ${oauthComplete}`)
      connectingPlatform = oauthComplete
    }
  }

  return {
    isAuthenticated: false,
    isLoading: true,
    hasSeenIntro: false,
    user: null,
    sessionId: null,
    selectedAccount: null,
    availableAccounts: [],
    activeWorkspace: null,
    availableWorkspaces: [],
    error: null,
    isMetaAuthenticated: false,
    metaUser: null,
    connectingPlatform
  }
}

// eslint-disable-next-line react-refresh/only-export-components -- useSession hook must be co-located with SessionContext
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
  const [state, setState] = useState<SessionState>(getInitialState)

  // Refs for OAuth timer cleanup on unmount
  const oauthPollTimerRef = useRef<number | null>(null)
  const oauthTimeoutRef = useRef<number | null>(null)

  // Cleanup OAuth timers on unmount
  useEffect(() => {
    return () => {
      if (oauthPollTimerRef.current) {
        window.clearInterval(oauthPollTimerRef.current)
        oauthPollTimerRef.current = null
      }
      if (oauthTimeoutRef.current) {
        window.clearTimeout(oauthTimeoutRef.current)
        oauthTimeoutRef.current = null
      }
    }
  }, [])

  // Refresh accounts helper
  const refreshAccounts = useCallback(async (): Promise<void> => {
    if (!state.sessionId) return

    try {
      const accounts = await accountService.fetchAccounts(state.sessionId)
      setState(prev => {
        const updatedSelectedAccount = prev.selectedAccount
          ? accounts.find(acc => acc.id === prev.selectedAccount?.id) || prev.selectedAccount
          : null
        return {
          ...prev,
          availableAccounts: accounts,
          selectedAccount: updatedSelectedAccount
        }
      })
    } catch (error) {
      console.error('[SESSION] Failed to refresh accounts:', error)
    }
  }, [state.sessionId])

  // Refresh workspaces helper
  const refreshWorkspaces = useCallback(async (): Promise<void> => {
    if (!state.sessionId) return

    try {
      const workspaces = await workspaceService.fetchWorkspaces(state.sessionId)
      setState(prev => {
        // If active workspace exists, try to find updated version; otherwise auto-select first workspace
        const updatedActiveWorkspace = prev.activeWorkspace
          ? workspaces.find(w => w.tenant_id === prev.activeWorkspace?.tenant_id) || prev.activeWorkspace
          : workspaces[0] || null
        return {
          ...prev,
          availableWorkspaces: workspaces,
          activeWorkspace: updatedActiveWorkspace
        }
      })
    } catch (error) {
      console.error('[SESSION] Failed to refresh workspaces:', error)
    }
  }, [state.sessionId])

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      setState(prev => ({ ...prev, isLoading: true }))

      try {
        // Check for mobile OAuth redirect
        const urlParams = new URLSearchParams(window.location.search)
        const oauthComplete = urlParams.get('oauth_complete')

        let sessionId = getStoredSessionId()
        if (!sessionId) {
          sessionId = generateSessionId()
          storeSessionId(sessionId)
        }

        // Handle mobile OAuth redirect - set connectingPlatform IMMEDIATELY to hide video
        if (oauthComplete === 'google' || oauthComplete === 'meta') {
          console.log(`[SESSION] Mobile OAuth redirect detected: ${oauthComplete}`)
          setState(prev => ({ ...prev, connectingPlatform: oauthComplete as 'google' | 'meta' }))
          const authUserId = urlParams.get('user_id')
          window.history.replaceState({}, '', window.location.pathname)
          localStorage.removeItem('mia_oauth_pending')
          localStorage.removeItem('mia_oauth_return_url')
          if (oauthComplete === 'google') {
            await sessionService.handleMobileOAuthRedirect(sessionId, authUserId)
          } else if (oauthComplete === 'meta') {
            // Complete Meta OAuth flow for mobile
            await metaAuthService.completeMetaAuth(sessionId)
          }
        }

        // Validate existing session
        const storedSessionId = getStoredSessionId()
        if (storedSessionId) {
          try {
            const [sessionData, accounts, workspaces, currentWorkspace] = await Promise.all([
              sessionService.validateSession(storedSessionId).catch(() => ({ valid: false, user: null })),
              accountService.fetchAccounts(storedSessionId).catch(() => []),
              workspaceService.fetchWorkspaces(storedSessionId).catch(() => []),
              workspaceService.fetchCurrentWorkspace(storedSessionId).catch(() => ({ tenant: null, active_tenant: null }))
            ])

            const sessionUser = sessionData.user
            if (sessionData.valid && sessionUser) {
              let fullSelectedAccount: AccountMapping | null = null
              if (sessionData.selected_account) {
                fullSelectedAccount = accounts.find(acc => acc.id === sessionData.selected_account?.id) || null
              }

              let activeWorkspace: Workspace | null = null
              // Handle both old (active_tenant) and new (tenant) response formats
              const activeTenant = currentWorkspace.tenant || currentWorkspace.active_tenant
              const tenantId = activeTenant?.id || activeTenant?.tenant_id
              if (tenantId) {
                const foundWorkspace = workspaces.find(w => w.tenant_id === tenantId)
                activeWorkspace = foundWorkspace || {
                  tenant_id: tenantId,
                  name: activeTenant?.name || 'Workspace',
                  slug: activeTenant?.slug || '',
                  role: (activeTenant?.role || 'member') as WorkspaceRole,
                  onboarding_completed: activeTenant?.onboarding_completed || false,
                  connected_platforms: activeTenant?.connected_platforms || [],
                  member_count: activeTenant?.member_count || 1
                }
              }

              setState(prev => ({
                ...prev,
                sessionId: storedSessionId,
                isAuthenticated: sessionData.user_authenticated?.google || sessionData.platforms?.google || false,
                isMetaAuthenticated: sessionData.user_authenticated?.meta || sessionData.platforms?.meta || false,
                hasSeenIntro: sessionUser.has_seen_intro || false,
                user: {
                  name: sessionUser.name,
                  email: sessionUser.email,
                  picture_url: sessionUser.picture_url || '',
                  google_user_id: sessionUser.user_id,
                  onboarding_completed: sessionUser.onboarding_completed || false
                },
                selectedAccount: fullSelectedAccount,
                availableAccounts: accounts,
                availableWorkspaces: workspaces,
                activeWorkspace,
                isLoading: false
              }))

              if (sessionUser.user_id) {
                localStorage.setItem('mia_last_user_id', sessionUser.user_id)
              }
              return
            }
          } catch {
            console.log('[SESSION] Session validation failed, creating new session')
          }

          localStorage.removeItem('mia_session_id')
        }

        // Create new session
        const newSessionId = generateSessionId()
        storeSessionId(newSessionId)
        setState(prev => ({ ...prev, sessionId: newSessionId, isLoading: false }))
      } catch (error) {
        console.error('[SESSION] Initialization error:', error)
        const errorSessionId = generateSessionId()
        storeSessionId(errorSessionId)
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

  // Google Login
  const login = useCallback(async (onPopupClosed?: () => void): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, connectingPlatform: 'google' }))

    try {
      // Get OAuth URL - backend uses UA detection to determine popup vs redirect flow
      const authData = await googleAuthService.getGoogleAuthUrl()

      // Mobile redirect flow
      if (isMobile()) {
        localStorage.setItem('mia_oauth_pending', 'google')
        localStorage.setItem('mia_oauth_return_url', window.location.href)
        window.location.href = authData.auth_url
        return true
      }

      // Desktop popup flow
      let authUserId: string | null = null
      const { popup, cleanup: cleanupMessageListener } = googleAuthService.openGoogleOAuthPopup(authData.auth_url, (userId) => {
        authUserId = userId
      })

      if (!popup) {
        cleanupMessageListener()
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      return new Promise((resolve) => {
        // Helper to clear both timers and message listener
        const clearTimers = () => {
          if (oauthPollTimerRef.current) {
            window.clearInterval(oauthPollTimerRef.current)
            oauthPollTimerRef.current = null
          }
          if (oauthTimeoutRef.current) {
            window.clearTimeout(oauthTimeoutRef.current)
            oauthTimeoutRef.current = null
          }
          cleanupMessageListener()
        }

        oauthPollTimerRef.current = window.setInterval(async () => {
          try {
            if (popup.closed) {
              clearTimers()
              onPopupClosed?.()

              await googleAuthService.completeGoogleAuth(state.sessionId || '', authUserId)
              const statusData = await googleAuthService.getGoogleAuthStatus(state.sessionId || '')

              if (statusData.authenticated) {
                await refreshAccounts()
                await refreshWorkspaces()
                setState(prev => ({
                  ...prev,
                  isAuthenticated: true,
                  isLoading: false,
                  connectingPlatform: null,
                  // Always set hasSeenIntro to true after successful OAuth
                  hasSeenIntro: true,
                  user: {
                    name: statusData.user_info?.name || statusData.name || 'User',
                    email: statusData.user_info?.email || statusData.email || '',
                    picture_url: statusData.user_info?.picture || statusData.picture_url || statusData.picture || '',
                    google_user_id: statusData.user_info?.id || statusData.user_id || ''
                  }
                }))
                resolve(true)
              } else {
                setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: 'Authentication failed' }))
                resolve(false)
              }
            }
          } catch (error) {
            clearTimers()
            console.error('[SESSION] Auth polling error:', error)
            setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: 'Authentication failed' }))
            resolve(false)
          }
        }, 3000)

        oauthTimeoutRef.current = window.setTimeout(() => {
          clearTimers()
          if (!popup.closed) popup.close()
          setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: 'Authentication timed out' }))
          resolve(false)
        }, 300000)
      })
    } catch (error) {
      console.error('[SESSION] Login error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        connectingPlatform: null,
        error: error instanceof Error ? error.message : 'Login failed'
      }))
      return false
    }
  }, [state.sessionId, refreshAccounts, refreshWorkspaces])

  // Meta Login
  const loginMeta = useCallback(async (onPopupClosed?: () => void): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, connectingPlatform: 'meta' }))

    try {
      const authData = await metaAuthService.getMetaAuthUrl(state.sessionId || '')

      // Mobile redirect flow (same pattern as Google)
      if (isMobile()) {
        localStorage.setItem('mia_oauth_pending', 'meta')
        localStorage.setItem('mia_oauth_return_url', window.location.href)
        window.location.href = authData.auth_url
        return true
      }

      // Desktop popup flow
      const popup = metaAuthService.openMetaOAuthPopup(authData.auth_url)

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      return new Promise((resolve) => {
        // Helper to clear both timers
        const clearTimers = () => {
          if (oauthPollTimerRef.current) {
            window.clearInterval(oauthPollTimerRef.current)
            oauthPollTimerRef.current = null
          }
          if (oauthTimeoutRef.current) {
            window.clearTimeout(oauthTimeoutRef.current)
            oauthTimeoutRef.current = null
          }
        }

        oauthPollTimerRef.current = window.setInterval(async () => {
          try {
            if (popup.closed) {
              clearTimers()
              onPopupClosed?.()

              const statusData = await metaAuthService.getMetaAuthStatus(state.sessionId || '')

              if (statusData.authenticated) {
                const completeData = await metaAuthService.completeMetaAuth(state.sessionId || '')

                setState(prev => ({
                  ...prev,
                  isLoading: false,
                  connectingPlatform: null,
                  isMetaAuthenticated: true,
                  // Preserve existing Google auth status - don't reset to false when adding Meta as second platform
                  // isAuthenticated is unchanged (kept from prev)
                  // Always set hasSeenIntro to true after successful OAuth
                  hasSeenIntro: true,
                  // Only update user if not already authenticated (Meta-first flow)
                  user: !prev.isAuthenticated && completeData.user ? {
                    google_user_id: completeData.user.id,
                    name: completeData.user.name || 'Meta User',
                    email: completeData.user.email || '',
                    picture_url: ''
                  } : prev.user,
                  metaUser: {
                    id: completeData.user?.id || statusData.user_info?.id || '',
                    name: completeData.user?.name || statusData.user_info?.name || 'Meta User',
                    email: completeData.user?.email || statusData.user_info?.email
                  }
                }))

                await refreshAccounts()
                await refreshWorkspaces()
                resolve(true)
              } else {
                setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: 'Meta authentication failed' }))
                resolve(false)
              }
            }
          } catch (error) {
            clearTimers()
            console.error('[SESSION] Meta auth polling error:', error)
            setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: 'Meta authentication failed' }))
            resolve(false)
          }
        }, 3000)

        oauthTimeoutRef.current = window.setTimeout(() => {
          clearTimers()
          if (!popup.closed) popup.close()
          setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: 'Meta authentication timed out' }))
          resolve(false)
        }, 300000)
      })
    } catch (error) {
      console.error('[SESSION] Meta login error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        connectingPlatform: null,
        error: error instanceof Error ? error.message : 'Meta login failed'
      }))
      return false
    }
  }, [state.sessionId, refreshAccounts, refreshWorkspaces])

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await googleAuthService.logoutGoogle(state.sessionId || '')
      clearSessionStorage()

      const newSessionId = generateSessionId()
      storeSessionId(newSessionId)

      setState(prev => ({
        ...getInitialState(),
        hasSeenIntro: prev.hasSeenIntro,
        sessionId: newSessionId,
        isLoading: false
      }))
    } catch (error) {
      console.error('[SESSION] Logout error:', error)
      setState(prev => ({ ...prev, isLoading: false, error: 'Logout failed' }))
    }
  }, [state.sessionId])

  // Meta Logout
  const logoutMetaFn = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await metaAuthService.logoutMeta(state.sessionId || '')
      setState(prev => ({
        ...prev,
        isLoading: false,
        isMetaAuthenticated: false,
        metaUser: null
      }))
    } catch (error) {
      console.error('[SESSION] Meta logout error:', error)
      setState(prev => ({ ...prev, isLoading: false, error: 'Meta logout failed' }))
    }
  }, [state.sessionId])

  // Select Account
  const selectAccountFn = useCallback(async (accountId: string, industry?: string): Promise<boolean> => {
    // Capture sessionId at function start to avoid stale closure
    const currentSessionId = state.sessionId
    if (!currentSessionId) {
      setState(prev => ({ ...prev, error: 'No session ID available' }))
      return false
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await accountService.selectAccount(currentSessionId, accountId, industry)
      const account = state.availableAccounts.find(acc => acc.id === accountId)

      // Handle auto-created workspace from backend
      let newWorkspace: Workspace | null = null
      if (response.workspace) {
        console.log('[SESSION] Workspace auto-created:', response.workspace)
        newWorkspace = {
          tenant_id: response.workspace.tenant_id,
          name: response.workspace.name,
          slug: response.workspace.name.toLowerCase().replace(/\s+/g, '-'),
          role: 'owner',
          onboarding_completed: false,
          connected_platforms: [],
          member_count: 1
        }
      }

      setState(prev => ({
        ...prev,
        selectedAccount: account || null,
        isLoading: false,
        // Set workspace if auto-created
        ...(newWorkspace ? {
          activeWorkspace: newWorkspace,
          availableWorkspaces: [...prev.availableWorkspaces, newWorkspace]
        } : {})
      }))

      // Refresh workspaces to ensure all existing workspaces are loaded
      const workspaces = await workspaceService.fetchWorkspaces(currentSessionId)
      if (workspaces.length > 0) {
        setState(prev => ({
          ...prev,
          availableWorkspaces: workspaces,
          activeWorkspace: prev.activeWorkspace || workspaces[0]
        }))
      }

      return true
    } catch (error) {
      console.error('[SESSION] Account selection error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Account selection failed'
      }))
      return false
    }
  }, [state.sessionId, state.availableAccounts])

  // Create Workspace
  const createWorkspaceFn = useCallback(async (name: string): Promise<Workspace | null> => {
    if (!state.sessionId) return null

    try {
      const data = await workspaceService.createWorkspace(state.sessionId, name)
      const workspace: Workspace = {
        tenant_id: data.tenant_id,
        name: data.name,
        slug: data.slug,
        role: 'owner',
        onboarding_completed: false,
        connected_platforms: [],
        member_count: 1
      }

      setState(prev => ({
        ...prev,
        availableWorkspaces: [...prev.availableWorkspaces, workspace],
        activeWorkspace: workspace
      }))

      return workspace
    } catch (error) {
      console.error('[SESSION] Create workspace error:', error)
      return null
    }
  }, [state.sessionId])

  // Switch Workspace
  const switchWorkspaceFn = useCallback(async (tenantId: string): Promise<boolean> => {
    if (!state.sessionId) return false

    try {
      const data = await workspaceService.switchWorkspace(state.sessionId, tenantId)
      const workspace = state.availableWorkspaces.find(w => w.tenant_id === tenantId)

      setState(prev => ({
        ...prev,
        activeWorkspace: workspace || {
          tenant_id: tenantId,
          name: data.tenant_name || data.name || 'Workspace',
          slug: data.slug || '',
          role: (data.role || 'member') as WorkspaceRole,
          onboarding_completed: data.onboarding_completed || false,
          connected_platforms: data.connected_platforms || [],
          member_count: 1
        }
      }))

      return true
    } catch (error) {
      console.error('[SESSION] Switch workspace error:', error)
      return false
    }
  }, [state.sessionId, state.availableWorkspaces])

  // Delete Workspace
  const deleteWorkspaceFn = useCallback(async (tenantId: string): Promise<boolean> => {
    if (!state.sessionId) return false

    try {
      await workspaceService.deleteWorkspace(state.sessionId, tenantId)

      // Remove from available workspaces and clear active if it was deleted
      setState(prev => {
        const updatedWorkspaces = prev.availableWorkspaces.filter(w => w.tenant_id !== tenantId)
        const wasActive = prev.activeWorkspace?.tenant_id === tenantId

        return {
          ...prev,
          availableWorkspaces: updatedWorkspaces,
          activeWorkspace: wasActive ? (updatedWorkspaces[0] || null) : prev.activeWorkspace
        }
      })

      return true
    } catch (error) {
      console.error('[SESSION] Delete workspace error:', error)
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete workspace'
      }))
      return false
    }
  }, [state.sessionId])

  // Check Existing Auth
  const checkExistingAuth = useCallback(async (): Promise<boolean> => {
    try {
      const authData = await googleAuthService.getGoogleAuthStatus(state.sessionId || '')

      if (authData.authenticated) {
        if (authData.needs_session_creation && authData.user_info?.id) {
          await googleAuthService.completeGoogleAuth(state.sessionId || '', authData.user_info.id)
        }

        await refreshAccounts()

        let selectedAccount: AccountMapping | null = null
        if (authData.selected_account) {
          selectedAccount = {
            id: authData.selected_account.id,
            name: authData.selected_account.name,
            google_ads_id: authData.selected_account.google_ads_id || '',
            ga4_property_id: authData.selected_account.ga4_property_id || '',
            meta_ads_id: authData.selected_account.meta_ads_id,
            business_type: authData.selected_account.business_type || '',
            color: '',
            display_name: authData.selected_account.name,
            selected_mcc_id: authData.selected_account.selected_mcc_id
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
            picture_url: authData.user_info?.picture || authData.picture_url || authData.picture || '',
            google_user_id: userId
          },
          selectedAccount
        }))

        if (userId) {
          localStorage.setItem('mia_last_user_id', userId)
        }

        return true
      }
    } catch (error) {
      console.error('[SESSION] Error checking existing auth:', error)
    }
    return false
  }, [state.sessionId, refreshAccounts])

  // Check Meta Auth
  const checkMetaAuth = useCallback(async (): Promise<boolean> => {
    try {
      const authData = await metaAuthService.getMetaAuthStatus(state.sessionId || '')

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
    } catch (error) {
      console.error('[SESSION] Error checking existing Meta auth:', error)
    }
    return false
  }, [state.sessionId])

  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Mark onboarding as complete in user state (prevents redirect back to onboarding)
  const markOnboardingComplete = useCallback((): void => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, onboarding_completed: true } : prev.user
    }))
  }, [])

  const contextValue: SessionContextType = {
    ...state,
    login,
    loginMeta,
    logout,
    logoutMeta: logoutMetaFn,
    selectAccount: selectAccountFn,
    refreshAccounts,
    createWorkspace: createWorkspaceFn,
    switchWorkspace: switchWorkspaceFn,
    deleteWorkspace: deleteWorkspaceFn,
    refreshWorkspaces,
    clearError,
    generateSessionId,
    checkExistingAuth,
    checkMetaAuth,
    markOnboardingComplete
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  )
}
