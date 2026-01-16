import { ReactNode } from 'react'
import { AuthProvider, useAuth } from './auth-context'
import { WorkspaceProvider, useWorkspace } from './workspace-context'
import { AccountProvider, useAccount } from './account-context'

/**
 * @deprecated This is a compatibility shim for gradual migration.
 * New code should use useAuth(), useWorkspace(), and useAccount() directly.
 *
 * This shim provides the old SessionContext API by combining the new contexts.
 */
export function useSession() {
  const auth = useAuth()
  const workspace = useWorkspace()
  const account = useAccount()

  return {
    // Auth state
    isAuthenticated: auth.isAuthenticated,
    isMetaAuthenticated: auth.isMetaAuthenticated,
    user: auth.user,
    sessionId: auth.sessionId,
    isLoading: auth.isLoading || workspace.isLoading || account.isLoading,
    hasSeenIntro: auth.hasSeenIntro,

    // Auth actions
    login: auth.login,
    loginMeta: auth.loginMeta,
    logout: auth.logout,
    checkExistingAuth: auth.checkExistingAuth,
    setHasSeenIntro: auth.setHasSeenIntro,

    // Workspace state
    activeWorkspace: workspace.activeWorkspace,
    availableWorkspaces: workspace.availableWorkspaces,

    // Workspace actions
    createWorkspace: workspace.createWorkspace,
    switchWorkspace: workspace.switchWorkspace,
    refreshWorkspaces: workspace.refreshWorkspaces,

    // Account state
    selectedAccount: account.selectedAccount,
    availableAccounts: account.availableAccounts,

    // Account actions
    selectAccount: account.selectAccount,
    refreshAccounts: account.refreshAccounts
  }
}

/**
 * @deprecated Use AuthProvider, WorkspaceProvider, and AccountProvider directly.
 *
 * This provider wraps all three new contexts to provide the old SessionContext API.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <AccountProvider>
          {children}
        </AccountProvider>
      </WorkspaceProvider>
    </AuthProvider>
  )
}
