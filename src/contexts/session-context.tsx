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
import { StorageKey } from '../constants/storage-keys'
import { logger } from '../utils/logger'

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
      logger.log(`[SESSION] OAuth redirect detected in initial state: ${oauthComplete}`)
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
      logger.error('[SESSION] Failed to refresh accounts:', error)
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
      logger.error('[SESSION] Failed to refresh workspaces:', error)
    }
  }, [state.sessionId])

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      setState(prev => ({ ...prev, isLoading: true }))

      try {
        // Check for mobile OAuth redirect - use localStorage flag, NOT query params
        // Backend redirects to frontend_origin without query params
        const oauthPending = localStorage.getItem(StorageKey.OAUTH_PENDING)
        const returnUrl = localStorage.getItem(StorageKey.OAUTH_RETURN_URL)

        let sessionId = getStoredSessionId()
        if (!sessionId) {
          sessionId = generateSessionId()
          storeSessionId(sessionId)
        }

        // Handle mobile OAuth redirect - set connectingPlatform IMMEDIATELY to hide video
        if (oauthPending === 'google' || oauthPending === 'meta') {
          logger.log(`[SESSION] Mobile OAuth redirect detected: ${oauthPending}, return URL: ${returnUrl}`)
          setState(prev => ({ ...prev, connectingPlatform: oauthPending as 'google' | 'meta' }))

          // Clear the pending flags immediately
          localStorage.removeItem(StorageKey.OAUTH_PENDING)
          localStorage.removeItem(StorageKey.OAUTH_RETURN_URL)

          // Store return URL BEFORE any async calls so it's ready for auth-redirects
          // But ONLY if we're not already on the right page (backend now redirects to full URL)
          const currentPath = window.location.pathname
          if (returnUrl) {
            try {
              const returnPath = new URL(returnUrl).pathname
              if (returnPath === currentPath) {
                logger.log('[SESSION] Already on return page:', currentPath, '- skipping mia_oauth_pending_return')
              } else {
                logger.log('[SESSION] Setting mia_oauth_pending_return to:', returnUrl)
                localStorage.setItem(StorageKey.OAUTH_PENDING_RETURN, returnUrl)
              }
            } catch {
              logger.log('[SESSION] Setting mia_oauth_pending_return to:', returnUrl)
              localStorage.setItem(StorageKey.OAUTH_PENDING_RETURN, returnUrl)
            }
          } else {
            logger.log('[SESSION] No return URL found - mia_oauth_return_url was not set')
          }

          // Complete OAuth flow
          // IMPORTANT: Extract user_id BEFORE cleaning URL, but clean AFTER /complete succeeds
          const urlParams = new URLSearchParams(window.location.search)
          const authUserId = urlParams.get('user_id')

          if (oauthPending === 'google') {
            if (!authUserId) {
              logger.error('[SESSION] No user_id in OAuth redirect URL - cannot complete auth')
              setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: 'Authentication failed - missing user ID' }))
              window.history.replaceState({}, '', window.location.pathname)
              return
            }
            const success = await sessionService.handleMobileOAuthRedirect(sessionId, authUserId)
            if (!success) {
              logger.error('[SESSION] OAuth /complete failed')
              setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: 'Authentication failed' }))
            }
          } else if (oauthPending === 'meta') {
            await metaAuthService.completeMetaAuth(sessionId)
          }

          // Clean URL only AFTER OAuth completion succeeds
          window.history.replaceState({}, '', window.location.pathname)
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
                isLoading: false,
                connectingPlatform: null
              }))

              if (sessionUser.user_id) {
                localStorage.setItem(StorageKey.LAST_USER_ID, sessionUser.user_id)
              }
              return
            }
          } catch {
            logger.log('[SESSION] Session validation failed, creating new session')
          }

          localStorage.removeItem(StorageKey.SESSION_ID)
        }

        // Create new session
        const newSessionId = generateSessionId()
        storeSessionId(newSessionId)
        setState(prev => ({ ...prev, sessionId: newSessionId, isLoading: false }))
      } catch (error) {
        logger.error('[SESSION] Initialization error:', error)
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

  // Google Login (FEB 2026: Simplified to redirect flow only, popup flow removed)
  const login = useCallback(async (_onPopupClosed?: () => void): Promise<boolean> => {
    // Capture return URL IMMEDIATELY before any state changes or async operations
    // This prevents race conditions where React navigation changes the URL before we read it
    const returnUrl = window.location.origin + window.location.pathname
    logger.log('[SESSION] login() - captured return URL:', returnUrl)

    setState(prev => ({ ...prev, isLoading: true, error: null, connectingPlatform: 'google' }))

    try {
      // Pass return URL to backend so it redirects back to the right page after OAuth
      const authData = await googleAuthService.getGoogleAuthUrl(returnUrl)

      // FEB 2026: Simplified to always use redirect flow (removed popup flow)
      // Redirect flow is more reliable for both mobile and desktop
      localStorage.setItem(StorageKey.OAUTH_PENDING, 'google')
      localStorage.setItem(StorageKey.OAUTH_RETURN_URL, returnUrl)
      window.location.href = authData.auth_url
      // Return promise that never resolves - page will redirect before this matters
      return new Promise<boolean>(() => {})
    } catch (error) {
      logger.error('[SESSION] Login error:', error)
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
      // Pass full URL (with path) for mobile redirect flow so user returns to the right page
      const frontendOrigin = isMobile() ? (window.location.origin + window.location.pathname) : undefined
      const tenantId = state.activeWorkspace?.tenant_id
      const authData = await metaAuthService.getMetaAuthUrl(state.sessionId || '', frontendOrigin, tenantId)

      // Mobile redirect flow (same pattern as Google)
      if (isMobile()) {
        localStorage.setItem(StorageKey.OAUTH_PENDING, 'meta')
        localStorage.setItem(StorageKey.OAUTH_RETURN_URL, window.location.origin + window.location.pathname)
        // If on onboarding page, flag that we need to show Meta selector on return
        if (window.location.pathname === '/onboarding') {
          localStorage.setItem(StorageKey.PENDING_META_LINK, 'true')
        }
        window.location.href = authData.auth_url
        // Return promise that never resolves - page will redirect before this matters
        // This prevents the caller from acting on a "success" before OAuth completes
        return new Promise<boolean>(() => {})
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

              // CRITICAL: Get sessionId from localStorage, NOT from closure (state.sessionId)
              // The closure captures stale value if loginMeta was called before state was updated
              const currentSessionId = getStoredSessionId() || state.sessionId || ''
              if (!currentSessionId) {
                logger.error('[SESSION] No session ID available for Meta OAuth complete')
                setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: 'Session error - please refresh' }))
                resolve(false)
                return
              }

              const statusData = await metaAuthService.getMetaAuthStatus(currentSessionId)

              if (statusData.authenticated) {
                const completeData = await metaAuthService.completeMetaAuth(currentSessionId)

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
            logger.error('[SESSION] Meta auth polling error:', error)
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
      logger.error('[SESSION] Meta login error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        connectingPlatform: null,
        error: error instanceof Error ? error.message : 'Meta login failed'
      }))
      return false
    }
  }, [state.sessionId, state.activeWorkspace?.tenant_id, refreshAccounts, refreshWorkspaces])

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
      logger.error('[SESSION] Logout error:', error)
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
      logger.error('[SESSION] Meta logout error:', error)
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
        logger.log('[SESSION] Workspace auto-created:', response.workspace)
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
        // Only update workspace when backend confirms it was just auto-created.
        // For normal account switches workspace_info is null, so we leave the
        // existing activeWorkspace untouched (preserves onboarding_completed,
        // connected_platforms etc. and avoids tripping the auth-redirect logic).
        ...(newWorkspace ? {
          activeWorkspace: newWorkspace,
          availableWorkspaces: [...prev.availableWorkspaces, newWorkspace]
        } : {})
      }))

      // onSuccess in integrations-page already calls refreshWorkspaces() + refreshAccounts()
      // after the modal closes — no need to duplicate that fetch here.

      return true
    } catch (error) {
      logger.error('[SESSION] Account selection error:', error)
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
      logger.error('[SESSION] Create workspace error:', error)
      return null
    }
  }, [state.sessionId])

  // Switch Workspace
  // FEB 17 FIX: Call backend to switch active_tenant_id, then full page reload.
  // This lets initializeSession pick up the complete new workspace state (accounts,
  // credentials, selected account) in a single clean pass — no stale React state,
  // no burst of parallel API calls that exhaust the DB connection pool.
  const switchWorkspaceFn = useCallback(async (tenantId: string): Promise<boolean> => {
    if (!state.sessionId) return false

    try {
      await workspaceService.switchWorkspace(state.sessionId, tenantId)
      // Full page reload — initializeSession will query backend for new workspace context
      window.location.href = '/home'
      return true
    } catch (error) {
      logger.error('[SESSION] Switch workspace error:', error)
      return false
    }
  }, [state.sessionId])

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
      logger.error('[SESSION] Delete workspace error:', error)
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
          localStorage.setItem(StorageKey.LAST_USER_ID, userId)
        }

        return true
      }
    } catch (error) {
      logger.error('[SESSION] Error checking existing auth:', error)
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
      logger.error('[SESSION] Error checking existing Meta auth:', error)
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
