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
  nextAction: 'AUTH_REQUIRED' | 'ACCEPT_INVITE' | 'CREATE_WORKSPACE' | 'SELECT_ACCOUNT' | 'ONBOARDING' | 'HOME' | null
  requiresAccountSelection: boolean
  inviteContext: {
    pendingInvitesCount: number
    pendingInvites: Array<{
      inviteId: string
      tenantId: string
      tenantName: string
      role: string
      invitedBy?: string
      expiresAt: string
    }>
  } | null
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
  nextAction: null,
  requiresAccountSelection: false,
  inviteContext: null,
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

        // If we have a selectedAccount that's not in the list, add it
        if (updatedSelectedAccount && !mappedAccounts.find(acc => acc.id === updatedSelectedAccount.id)) {
          console.log('[SESSION] Adding selectedAccount to accounts list:', updatedSelectedAccount.id)
          mappedAccounts.push(updatedSelectedAccount)
        }

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

  const hydrateFromServer = useCallback(async (): Promise<boolean> => {
    const { session } = await mia.session.restore()

    if (!session) {
      setState(prev => ({
        ...prev,
        sessionId: mia.session.getSessionId(),
        isAuthenticated: false,
        isMetaAuthenticated: false,
        nextAction: 'AUTH_REQUIRED',
        requiresAccountSelection: false,
        inviteContext: null,
        selectedAccount: null,
        activeWorkspace: null,
        availableAccounts: [],
        availableWorkspaces: [],
        user: null,
        isLoading: false,
        connectingPlatform: null
      }))
      return false
    }

    const [accountsResult, workspaces, currentWorkspace] = await Promise.all([
      mia.accounts.list().catch((err) => {
        console.error('[SESSION] Failed to fetch accounts:', err)
        return { accounts: [], ga4Properties: [] }
      }),
      mia.workspaces.list().catch((err) => {
        console.error('[SESSION] Failed to fetch workspaces:', err)
        return []
      }),
      mia.workspaces.getCurrent().catch((err) => {
        console.error('[SESSION] Failed to get current workspace:', err)
        return null
      })
    ])

    const mappedAccounts = accountsResult.accounts.map(toAccountMapping)
    const localWorkspaces = workspaces.map(toLocalWorkspace)

    let selectedAccount: AccountMapping | null = null
    if (session.selectedAccount) {
      selectedAccount = mappedAccounts.find(acc => acc.id === session.selectedAccount?.id) || null
      if (!selectedAccount) {
        selectedAccount = {
          id: session.selectedAccount.id,
          name: session.selectedAccount.name,
          display_name: session.selectedAccount.name,
          google_ads_id: session.selectedAccount.googleAdsId || '',
          ga4_property_id: session.selectedAccount.ga4PropertyId || '',
          meta_ads_id: session.selectedAccount.metaAdsId || undefined,
          business_type: '',
          color: '',
        }
        mappedAccounts.push(selectedAccount)
      }
    }

    let activeWorkspace: Workspace | null = null
    if (currentWorkspace) {
      activeWorkspace = localWorkspaces.find(w => w.tenant_id === currentWorkspace.tenantId) || toLocalWorkspace(currentWorkspace)
    } else if (session.activeTenantId) {
      activeWorkspace = localWorkspaces.find(w => w.tenant_id === session.activeTenantId) || null
    }

    setState(prev => ({
      ...prev,
      sessionId: mia.session.getSessionId(),
      isAuthenticated: session.authenticatedPlatforms.google || false,
      isMetaAuthenticated: session.authenticatedPlatforms.meta || false,
      nextAction: session.nextAction || null,
      requiresAccountSelection: session.requiresAccountSelection || false,
      inviteContext: session.inviteContext || null,
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
      error: null,
      isLoading: false,
      connectingPlatform: null
    }))

    if (session.user?.id) {
      localStorage.setItem('mia_last_user_id', session.user.id)
    }

    return !!(session.authenticatedPlatforms.google || session.authenticatedPlatforms.meta)
  }, [mia])

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      setState(prev => ({ ...prev, isLoading: true }))

      try {
        // Handle mobile OAuth redirect
        const urlParams = new URLSearchParams(window.location.search)
        const oauthError = urlParams.get('oauth_error')
        const oauthProvider = urlParams.get('oauth_provider')
        const oauthComplete = urlParams.get('oauth_complete')

        if (oauthError) {
          const providerLabel = oauthProvider === 'meta' ? 'Meta' : 'Google'
          setState(prev => ({
            ...prev,
            error: `${providerLabel} login was not successful. Please try again.`,
            isLoading: false,
            connectingPlatform: null
          }))
          window.history.replaceState({}, '', window.location.pathname)
          localStorage.removeItem('mia_oauth_pending')
          localStorage.removeItem('mia_oauth_return_url')
          await hydrateFromServer()
          return
        }

        if (oauthComplete === 'google' || oauthComplete === 'meta') {
          setState(prev => ({ ...prev, connectingPlatform: oauthComplete as 'google' | 'meta' }))
          const authUserId = urlParams.get('user_id')

          if (oauthComplete === 'google') {
            await mia.auth.google.completeRedirect(authUserId ?? undefined)
          } else {
            await mia.auth.meta.completeRedirect()
          }

          window.history.replaceState({}, '', window.location.pathname)
          localStorage.removeItem('mia_oauth_pending')
          localStorage.removeItem('mia_oauth_return_url')
        }

        await hydrateFromServer()
      } catch (error) {
        console.error('[SESSION] Initialization error:', error)
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize session',
          sessionId: mia.session.getSessionId(),
          nextAction: 'AUTH_REQUIRED',
          isLoading: false,
          connectingPlatform: null
        }))
      }
    }

    initializeSession()
  }, [hydrateFromServer, mia])

  // Google Login
  const login = useCallback(async (onPopupClosed?: () => void): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, connectingPlatform: 'google' }))

    try {
      const lastUserId = typeof window !== 'undefined'
        ? localStorage.getItem('mia_last_user_id') || undefined
        : undefined

      const silentLogin = await mia.auth.google.loginWithStoredCredentials({
        lastUserId,
      })

      if (silentLogin.success) {
        const restored = await hydrateFromServer()
        if (restored) {
          return true
        }
      }

      await mia.auth.google.connect({
        onPopupClosed,
        returnTo: window.location.href
      })
      return false
    } catch (error) {
      console.error('[SESSION] Login error:', error)
      const errorMessage = isMiaSDKError(error)
        ? 'Login failed'
        : 'Login failed'
      setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: errorMessage }))
      return false
    }
  }, [mia])

  // Meta Login
  const loginMeta = useCallback(async (onPopupClosed?: () => void): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, connectingPlatform: 'meta' }))

    try {
      const lastUserId = typeof window !== 'undefined'
        ? localStorage.getItem('mia_last_user_id') || undefined
        : undefined

      const silentLogin = await mia.auth.meta.loginWithStoredCredentials({
        lastUserId,
      })

      if (silentLogin.success) {
        const restored = await hydrateFromServer()
        if (restored) {
          return true
        }
      }

      await mia.auth.meta.connect({
        onPopupClosed,
        returnTo: window.location.href
      })
      return false
    } catch (error) {
      console.error('[SESSION] Meta login error:', error)
      const errorMessage = isMiaSDKError(error)
        ? 'Meta login failed'
        : 'Meta login failed'
      setState(prev => ({ ...prev, isLoading: false, connectingPlatform: null, error: errorMessage }))
      return false
    }
  }, [hydrateFromServer, mia])

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await mia.auth.google.logout()
      mia.session.clear()
      localStorage.removeItem('mia_oauth_pending')
      localStorage.removeItem('mia_oauth_return_url')
      localStorage.removeItem('mia_post_oauth_integration')
      localStorage.removeItem('mia_pending_invite')

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
      await mia.accounts.select(accountId)
      await hydrateFromServer()
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
  }, [hydrateFromServer, mia])

  // Create Workspace
  const createWorkspaceFn = useCallback(async (name: string): Promise<Workspace | null> => {
    try {
      const created = await mia.workspaces.create(name)
      await hydrateFromServer()
      return {
        tenant_id: created.tenantId,
        name: created.name,
        slug: created.slug,
        role: 'owner',
        onboarding_completed: false,
        connected_platforms: [],
        member_count: 1
      }
    } catch (error) {
      console.error('[SESSION] Create workspace error:', error)
      return null
    }
  }, [hydrateFromServer, mia])

  // Switch Workspace
  const switchWorkspaceFn = useCallback(async (tenantId: string): Promise<boolean> => {
    try {
      await mia.workspaces.switch(tenantId)
      await hydrateFromServer()
      return true
    } catch (error) {
      console.error('[SESSION] Switch workspace error:', error)
      return false
    }
  }, [hydrateFromServer, mia])

  // Check Existing Auth
  const checkExistingAuth = useCallback(async (): Promise<boolean> => {
    try {
      return await hydrateFromServer()
    } catch (error) {
      console.error('[SESSION] Error checking existing auth:', error)
    }
    return false
  }, [hydrateFromServer])

  // Check Meta Auth
  const checkMetaAuth = useCallback(async (): Promise<boolean> => {
    try {
      const session = await mia.session.validate()
      if (!session?.authenticatedPlatforms.meta) {
        return false
      }

      await hydrateFromServer()
      return true
    } catch (error) {
      console.error('[SESSION] Error checking existing Meta auth:', error)
    }
    return false
  }, [hydrateFromServer, mia])

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
