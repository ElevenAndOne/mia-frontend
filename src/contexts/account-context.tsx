import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AccountMapping } from '../types'
import { apiFetch } from '../utils/api'
import { useAuth } from './auth-context'
import { useWorkspace } from './workspace-context'

interface AccountContextValue {
  // State
  selectedAccount: AccountMapping | null
  availableAccounts: AccountMapping[]
  isLoading: boolean

  // Actions
  selectAccount: (accountId: string) => Promise<boolean>
  refreshAccounts: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined)

export function AccountProvider({ children }: { children: ReactNode }) {
  const { sessionId, isAuthenticated } = useAuth()
  const { activeWorkspace } = useWorkspace()
  const [selectedAccount, setSelectedAccount] = useState<AccountMapping | null>(null)
  const [availableAccounts, setAvailableAccounts] = useState<AccountMapping[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch accounts when authenticated and workspace is selected
  useEffect(() => {
    if (isAuthenticated && sessionId && activeWorkspace) {
      refreshAccounts()
    }
  }, [isAuthenticated, sessionId, activeWorkspace])

  const refreshAccounts = async (): Promise<void> => {
    if (!sessionId || !activeWorkspace) return

    setIsLoading(true)
    try {
      const response = await apiFetch('/api/accounts/available', {
        headers: {
          'X-Session-ID': sessionId,
          'X-Tenant-ID': activeWorkspace.tenant_id
        }
      })

      if (response.ok) {
        const data = await response.json()
        const accounts: AccountMapping[] = data.accounts || []
        setAvailableAccounts(accounts)

        // Set selected account (first one, or previously selected)
        if (accounts.length > 0 && !selectedAccount) {
          setSelectedAccount(accounts[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectAccount = async (accountId: string): Promise<boolean> => {
    const account = availableAccounts.find(a => a.id === accountId)
    if (account) {
      setSelectedAccount(account)
      return true
    }
    return false
  }

  return (
    <AccountContext.Provider
      value={{
        selectedAccount,
        availableAccounts,
        isLoading,
        selectAccount,
        refreshAccounts
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) {
    throw new Error('useAccount must be used within AccountProvider')
  }
  return context
}
