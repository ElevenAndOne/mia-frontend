import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useMiaClient, isMiaSDKError } from '../sdk'
import type { Account, Workspace as SDKWorkspace } from '../sdk'

// Import types from feature modules for backward compatibility
import type { AccountMapping } from '../features/accounts/types'
import type { UserProfile, MetaAuthState } from '../features/auth/types'
import type { Workspace } from '../features/workspace/types'

// Re-export types for backward compatibility
export type { AccountMapping } from '../features/accounts/types'
export type { UserProfile, MetaAuthState } from '../features/auth/types'
export type { Workspace } from '../features/workspace/types'

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
  refreshWorkspaces: () => Promise<void>
  clearError: () => void
  generateSessionId: () => string
  checkExistingAuth: () => Promise<boolean>
  checkMetaAuth: () => Promise<boolean>
}

type SessionContextType = SessionState & SessionActions

const SessionContext = createContext<SessionContextType | undefined>(undefined)

const INITIAL_STATE: SessionState = {
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
  connectingPlatform: null
}

// Detect OAuth redirect synchronously to prevent video flash
const getInitialState = (): SessionState => {
  let connectingPlatform: 'google' | 'meta' | null = null
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const oauthComplete = urlParams.get('oauth_complete')
    if (oauthComplete === 'google' || oauthComplete === 'meta') {
      connectingPlatform = oauthComplete
    }
  }
  return { ...INITIAL_STATE, connectingPlatform }
}

// Convert SDK Account to local AccountMapping
const toAccountMapping = (acc: Account): AccountMapping => ({
  id: acc.id,
  name: acc.name,
  display_name: acc.displayName,
  google_ads_id: acc.googleAdsId,
  ga4_property_id: acc.ga4PropertyId,
  meta_ads_id: acc.metaAdsId,
  facebook_page_id: acc.facebookPageId,
  facebook_page_name: acc.facebookPageName,
  brevo_api_key: acc.brevoApiKey,
  brevo_account_name: acc.brevoAccountName,
  hubspot_portal_id: acc.hubspotPortalId,
  mailchimp_account_id: acc.mailchimpAccountId,
  business_type: acc.businessType,
  google_ads_account_type: acc.googleAdsAccountType,
  color: acc.color
})

// Convert SDK Workspace to local Workspace
const toLocalWorkspace = (ws: SDKWorkspace): Workspace => ({
  tenant_id: ws.tenantId,
  name: ws.name,
  slug: ws.slug,
  role: ws.role,
  onboarding_completed: ws.onboardingCompleted,
  connected_platforms: ws.connectedPlatforms,
  member_count: ws.memberCount
})

// eslint-disable-next-line react-refresh/only-export-components
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
  const mia = useMiaClient()
  const [state, setState] = useState<SessionState>(getInitialState)

  // Refresh accounts
  const refreshAccounts = useCallback(async (): Promise<void> => {
    try {
      const { accounts } = await mia.accounts.list()
      const mappedAccounts = accounts.map(toAccountMapping)
      setState(prev => {
        const updatedSelectedAccount = prev.selectedAccount
        ? mappedAccounts.find(acc => acc.id === prev.selectedAccount?.id) || prev.selectedAccount
        : null
        return { ...prev, availableAccounts: mappedAccounts, selectedAccount: updatedSelectedAccount }
      })
    } catch (error) {
      console.error('[SESSION] Failed to refresh accounts:', error)
    }
  }, [mia])

  // Refresh workspaces
  const refreshWorkspaces = useCallback(async (): Promise<void> => {
    try {
      const workspaces = await mia.workspaces.list()
      const localWorkspaces = workspaces.map(toLocalWorkspace)
      setState(prev => {
        const updatedActiveWorkspace = prev.activeWorkspace
          ? localWorkspaces.find(w => w.tenant_id === prev.activeWorkspace?.tenant_id) || prev.activeWorkspace
          : null
        return { ...prev, availableWorkspaces: localWorkspaces, activeWorkspace: updatedActiveWorkspace }
      })
    } catch (error) {
      console.error('[SESSION] Failed to refresh workspaces:', error)
    }
  }, [mia])

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      setState(prev => ({ ...prev, isLoading: true }))

      try {
        // Handle mobile OAuth redirect
        const urlParams = new URLSearchParams(window.location.search)
        const oauthComplete = urlParams.get('oauth_complete')

        if (oauthComplete === 'google' || oauthComplete === 'meta') {
          setState(prev => ({ ...prev, connectingPlatform: oauthComplete as 'google' | 'meta' }))
          const authUserId = urlParams.get('user_id')
          window.history.replaceState({}, '', window.location.pathname)
          localStorage.removeItem('mia_oauth_pending')
          localStorage.removeItem('mia_oauth_return_url')

          if (oauthComplete === 'google') {
            await mia.auth.google.completeRedirect(authUserId ?? undefined)
          }
        }

        // Restore session using SDK
        const { session } = await mia.session.restore()

        if (session) {
          // Fetch accounts and workspaces in parallel
          const [accountsResult, workspaces, currentWorkspace] = await Promise.all([
            mia.accounts.list().catch(() => ({ accounts: [], ga4Properties: [] })),
            mia.workspaces.list().catch(() => []),
            mia.workspaces.getCurrent().catch(() => null)
          ])

          const mappedAccounts = accountsResult.accounts.map(toAccountMapping)
          const localWorkspaces = workspaces.map(toLocalWorkspace)

          let selectedAccount: AccountMapping | null = null
          if (session.selectedAccount) {
            selectedAccount = mappedAccounts.find(acc => acc.id === session.selectedAccount?.id) || null
          }

          let activeWorkspace: Workspace | null = null
          if (currentWorkspace) {
            const found = localWorkspaces.find(w => w.tenant_id === currentWorkspace.tenantId)
            activeWorkspace = found || toLocalWorkspace(currentWorkspace)
          }

          setState(prev => ({
            ...prev,
            sessionId: mia.session.getSessionId(),
            isAuthenticated: session.authenticatedPlatforms.google || false,
            isMetaAuthenticated: session.authenticatedPlatforms.meta || false,
            hasSeenIntro: session.user?.hasSeenIntro || false,
            user: session.user ? {
              name: session.user.name,
              email: session.user.email || '',
              picture_url: session.user.pictureUrl || '',
              google_user_id: session.user.id,
              onboarding_completed: session.user.onboardingCompleted
            } : null,
            selectedAccount,
            availableAccounts: mappedAccounts,
            availableWorkspaces: localWorkspaces,
            activeWorkspace,
            isLoading: false,
            connectingPlatform: null
          }))

          if (session.user?.id) {
            localStorage.setItem('mia_last_user_id', session.user.id)
          }
          return
        }

        // No valid session
        setState(prev => ({
          ...prev,
          sessionId: mia.session.getSessionId(),
          isLoading: false,
          connectingPlatform: null
        }))
      } catch (error) {
        console.error('[SESSION] Initialization error:', error)
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize session',
          sessionId: mia.session.getSessionId(),
          isLoading: false,
          connectingPlatform: null
        }))
      }
    }

    initializeSession()
  }, [mia])

  // Google Login
  const login = useCallback(async (onPopupClosed?: () => void): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, connectingPlatform: 'google' }))

    try {
      const result = await mia.auth.google.connect({ onPopupClosed })

      if (result.success && result.user) {
        await refreshAccounts()
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          isLoading: false,
          connectingPlatform: null,
          hasSeenIntro: true,
          user: {
            name: result.user?.name || 'User',
            email: result.user?.email || '',
            picture_url: result.user?.pictureUrl || '',
            google_user_id: result.user?.id || ''
          }
        }))
        return true
      }

      setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null }))
      return false
    } catch (error) {
      console.error('[SESSION] Login error:', error)
      const errorMessage = isMiaSDKError(error)
        ? (error.code === 'OAUTH_POPUP_BLOCKED' ? 'Popup blocked. Please allow popups for this site.' : 'Login failed')
        : 'Login failed'
      setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: errorMessage }))
      return false
    }
  }, [mia, refreshAccounts])

  // Meta Login
  const loginMeta = useCallback(async (onPopupClosed?: () => void): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, connectingPlatform: 'meta' }))

    try {
      const result = await mia.auth.meta.connect({ onPopupClosed })

      if (result.success) {
        await refreshAccounts()
        setState(prev => ({
          ...prev,
          isLoading: false,
          connectingPlatform: null,
          isMetaAuthenticated: true,
          hasSeenIntro: true,
          user: !prev.isAuthenticated && result.user ? {
            google_user_id: result.user.id || '',
            name: result.user.name || 'Meta User',
            email: result.user.email || '',
            picture_url: ''
          } : prev.user,
          metaUser: result.user ? {
            id: result.user.id || '',
            name: result.user.name || 'Meta User',
            email: result.user.email
          } : null
        }))
        return true
      }

      setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null }))
      return false
    } catch (error) {
      console.error('[SESSION] Meta login error:', error)
      const errorMessage = isMiaSDKError(error)
        ? (error.code === 'OAUTH_POPUP_BLOCKED' ? 'Popup blocked. Please allow popups for this site.' : 'Meta login failed')
        : 'Meta login failed'
      setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: errorMessage }))
      return false
    }
  }, [mia, refreshAccounts])

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await mia.auth.google.logout()
      mia.session.clear()

      setState(prev => ({
        ...INITIAL_STATE,
        hasSeenIntro: prev.hasSeenIntro,
        sessionId: mia.session.getSessionId(),
        isLoading: false
      }))
    } catch (error) {
      console.error('[SESSION] Logout error:', error)
      setState(prev => ({ ...prev, isLoading: false, error: 'Logout failed' }))
    }
  }, [mia])

  // Meta Logout
  const logoutMetaFn = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await mia.auth.meta.logout()
      setState(prev => ({ ...prev, isLoading: false, isMetaAuthenticated: false, metaUser: null }))
    } catch (error) {
      console.error('[SESSION] Meta logout error:', error)
      setState(prev => ({ ...prev, isLoading: false, error: 'Meta logout failed' }))
    }
  }, [mia])

  // Select Account
  const selectAccountFn = useCallback(async (accountId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await mia.accounts.select(accountId)
      const account = state.availableAccounts.find(acc => acc.id === accountId)

      let newWorkspace: Workspace | null = null
      if (result.autoCreatedWorkspace) {
        newWorkspace = {
          tenant_id: result.autoCreatedWorkspace.tenantId,
          name: result.autoCreatedWorkspace.name,
          slug: result.autoCreatedWorkspace.name.toLowerCase().replace(/\s+/g, '-'),
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
        ...(newWorkspace ? {
          activeWorkspace: newWorkspace,
          availableWorkspaces: [...prev.availableWorkspaces, newWorkspace]
        } : {})
      }))
      return true
    } catch (error) {
      console.error('[SESSION] Account selection error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: isMiaSDKError(error) ? error.message : 'Account selection failed'
      }))
      return false
    }
  }, [mia, state.availableAccounts])

  // Create Workspace
  const createWorkspaceFn = useCallback(async (name: string): Promise<Workspace | null> => {
    try {
      const created = await mia.workspaces.create(name)
      const workspace: Workspace = {
        tenant_id: created.tenantId,
        name: created.name,
        slug: created.slug,
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
  }, [mia])

  // Switch Workspace
  const switchWorkspaceFn = useCallback(async (tenantId: string): Promise<boolean> => {
    try {
      const result = await mia.workspaces.switch(tenantId)
      const workspace = state.availableWorkspaces.find(w => w.tenant_id === tenantId)

      setState(prev => ({
        ...prev,
        activeWorkspace: workspace || {
          tenant_id: tenantId,
          name: result.name || 'Workspace',
          slug: result.slug || '',
          role: (result.role || 'viewer') as Workspace['role'],
          onboarding_completed: result.onboardingCompleted || false,
          connected_platforms: result.connectedPlatforms || [],
          member_count: 1
        }
      }))
      return true
    } catch (error) {
      console.error('[SESSION] Switch workspace error:', error)
      return false
    }
  }, [mia, state.availableWorkspaces])

  // Check Existing Auth
  const checkExistingAuth = useCallback(async (): Promise<boolean> => {
    try {
      const status = await mia.auth.google.getStatus()

      if (status.authenticated) {
        await refreshAccounts()

        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          hasSeenIntro: status.user_info?.has_seen_intro || false,
          user: {
            name: status.user_info?.name || 'User',
            email: status.user_info?.email || '',
            picture_url: status.user_info?.picture || '',
            google_user_id: status.user_info?.id || ''
          }
        }))

        if (status.user_info?.id) {
          localStorage.setItem('mia_last_user_id', status.user_info.id)
        }
        return true
      }
    } catch (error) {
      console.error('[SESSION] Error checking existing auth:', error)
    }
    return false
  }, [mia, refreshAccounts])

  // Check Meta Auth
  const checkMetaAuth = useCallback(async (): Promise<boolean> => {
    try {
      const status = await mia.auth.meta.getStatus()

      if (status.authenticated) {
        setState(prev => ({
          ...prev,
          isMetaAuthenticated: true,
          hasSeenIntro: status.user_info?.has_seen_intro || false,
          metaUser: {
            id: status.user_info?.id || '',
            name: status.user_info?.name || 'Meta User',
            email: status.user_info?.email
          }
        }))
        return true
      }
    } catch (error) {
      console.error('[SESSION] Error checking existing Meta auth:', error)
    }
    return false
  }, [mia])

  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const generateSessionIdFn = useCallback((): string => {
    return mia.session.getSessionId() || ''
  }, [mia])

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
    refreshWorkspaces,
    clearError,
    generateSessionId: generateSessionIdFn,
    checkExistingAuth,
    checkMetaAuth
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  )
}
