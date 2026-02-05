import { useState, useEffect } from 'react'
import { apiFetch } from '../../../utils/api'
import { useSession } from '../../../contexts/session-context'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'
import type { BrevoAccount } from '../types'

interface BrevoAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const BrevoAccountSelector = ({ isOpen, onClose, onSuccess }: BrevoAccountSelectorProps) => {
  const { sessionId } = useSession()
  const [accounts, setAccounts] = useState<BrevoAccount[]>([])

  const [state, actions] = useSelectorState<number>({
    onSuccess,
    onClose,
  })

  useEffect(() => {
    if (isOpen) {
      fetchBrevoAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchBrevoAccounts = async () => {
    actions.setIsLoading(true)
    actions.setError(null)

    try {
      const response = await apiFetch('/api/oauth/brevo/accounts', {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId || 'default',
        },
      })

      const data = await response.json()

      if (data.success && data.accounts) {
        setAccounts(data.accounts)

        const primaryAccount = data.accounts.find((acc: BrevoAccount) => acc.is_primary)
        if (primaryAccount) {
          actions.setSelectedId(primaryAccount.id)
        } else if (data.accounts.length === 1) {
          actions.setSelectedId(data.accounts[0].id)
        }
      } else {
        actions.setError(data.error || 'Failed to fetch Brevo accounts')
      }
    } catch {
      actions.setError('Failed to load Brevo accounts. Please try again.')
    } finally {
      actions.setIsLoading(false)
    }
  }

  const handleSwitchAccount = async () => {
    if (!state.selectedId) {
      actions.setError('Please select an account')
      return
    }

    await actions.withSubmitting(async () => {
      const response = await apiFetch('/api/oauth/brevo/select-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default',
        },
        body: JSON.stringify({
          session_id: sessionId,
          brevo_id: state.selectedId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        actions.handleSuccess()
      } else {
        throw new Error(data.message || 'Failed to switch Brevo account')
      }
    })
  }

  const handleRemoveAccount = async (brevoId: number, accountName: string) => {
    if (!confirm(`Remove ${accountName} from this account?`)) {
      return
    }

    try {
      const response = await apiFetch(
        `/api/oauth/brevo/disconnect?brevo_id=${brevoId}`,
        {
          method: 'DELETE',
          headers: {
            'X-Session-ID': sessionId || 'default',
          },
        }
      )

      const data = await response.json()

      if (data.success) {
        await fetchBrevoAccounts()
      } else {
        actions.setError(data.message || 'Failed to remove Brevo account')
      }
    } catch {
      actions.setError('Failed to remove account. Please try again.')
    }
  }

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="Brevo Accounts"
      subtitle="Select which Brevo account to use for this account"
      icon={
        <svg className="w-6 h-6 text-utility-info-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      }
      iconBgColor="bg-utility-info-200"
      isLoading={state.isLoading}
      loadingMessage="Loading Brevo accounts..."
      error={state.error}
      success={state.success}
      successMessage="Successfully switched accounts!"
      isEmpty={accounts.length === 0}
      emptyMessage="No Brevo accounts connected yet."
      emptySubMessage="Add a Brevo API key to get started."
      isSubmitting={state.isSubmitting}
      onSubmit={handleSwitchAccount}
      submitLabel="Switch Account"
      submitLoadingLabel="Switching..."
      submitDisabled={!state.selectedId}
      accentColor="black"
    >
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {accounts.map((account) => (
          <SelectorItem
            key={account.id}
            isSelected={state.selectedId === account.id}
            onSelect={() => actions.setSelectedId(account.id)}
            title={account.account_name}
            subtitle={`Added ${new Date(account.created_at).toLocaleDateString()}`}
            badge={account.is_primary ? 'Primary' : undefined}
            badgeColor="green"
            accentColor="black"
            selectionStyle="radio"
            onRemove={() => handleRemoveAccount(account.id, account.account_name)}
          />
        ))}
      </div>
    </AccountSelectorModal>
  )
}

export default BrevoAccountSelector
