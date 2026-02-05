import { useState, useEffect } from 'react'
import { apiFetch } from '../../../utils/api'
import { useSession } from '../../../contexts/session-context'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'
import type { MailchimpAccount } from '../types'

interface MailchimpAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const MailchimpAccountSelector = ({ isOpen, onClose, onSuccess }: MailchimpAccountSelectorProps) => {
  const { sessionId } = useSession()
  const [accounts, setAccounts] = useState<MailchimpAccount[]>([])

  const [state, actions] = useSelectorState<number>({
    onSuccess,
    onClose,
  })

  useEffect(() => {
    if (isOpen) {
      fetchMailchimpAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchMailchimpAccounts = async () => {
    actions.setIsLoading(true)
    actions.setError(null)

    try {
      const response = await apiFetch('/api/oauth/mailchimp/accounts', {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId || 'default',
        },
      })

      const data = await response.json()

      if (data.success && data.accounts) {
        setAccounts(data.accounts)

        const primaryAccount = data.accounts.find((acc: MailchimpAccount) => acc.is_primary)
        if (primaryAccount) {
          actions.setSelectedId(primaryAccount.id)
        } else if (data.accounts.length === 1) {
          actions.setSelectedId(data.accounts[0].id)
        }
      } else {
        actions.setError(data.error || 'Failed to fetch Mailchimp accounts')
      }
    } catch {
      actions.setError('Failed to load Mailchimp accounts. Please try again.')
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
      const response = await apiFetch(
        `/api/oauth/mailchimp/set-primary?mailchimp_id=${state.selectedId}`,
        {
          method: 'POST',
          headers: {
            'X-Session-ID': sessionId || 'default',
          },
        }
      )

      const data = await response.json()

      if (data.success) {
        actions.handleSuccess()
      } else {
        throw new Error(data.error || 'Failed to switch account')
      }
    })
  }

  const handleRemoveAccount = async (mailchimpId: number, accountName: string) => {
    if (!confirm(`Remove ${accountName} from this account?`)) {
      return
    }

    try {
      const response = await apiFetch(
        `/api/oauth/mailchimp/disconnect?mailchimp_id=${mailchimpId}`,
        {
          method: 'DELETE',
          headers: {
            'X-Session-ID': sessionId || 'default',
          },
        }
      )

      const data = await response.json()

      if (data.success) {
        await fetchMailchimpAccounts()
        onSuccess?.()
      } else {
        actions.setError(data.message || 'Failed to remove Mailchimp account')
      }
    } catch {
      actions.setError('Failed to remove account. Please try again.')
    }
  }

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="Mailchimp Accounts"
      subtitle="Select which Mailchimp account to use with this Google Ads account"
      icon={
        <svg className="w-6 h-6 text-warning" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.2 11.8c-.3-.3-.5-.7-.5-1.1 0-.4.2-.8.5-1.1.3-.3.5-.7.5-1.1 0-.8-.7-1.5-1.5-1.5h-1c-.4 0-.8-.2-1.1-.5-.3-.3-.5-.7-.5-1.1V4.5c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v.9c0 .4-.2.8-.5 1.1-.3.3-.7.5-1.1.5h-.9c-.8 0-1.5.7-1.5 1.5 0 .4.2.8.5 1.1.3.3.5.7.5 1.1 0 .4-.2.8-.5 1.1-.3.3-.5.7-.5 1.1v.9c0 .8.7 1.5 1.5 1.5h.9c.4 0 .8.2 1.1.5.3.3.5.7.5 1.1v.9c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5v-.9c0-.4.2-.8.5-1.1.3-.3.7-.5 1.1-.5h.9c.8 0 1.5-.7 1.5-1.5v-.9c0-.4.2-.8.5-1.1z" />
        </svg>
      }
      iconBgColor="bg-utility-warning-100"
      isLoading={state.isLoading}
      loadingMessage="Loading Mailchimp accounts..."
      error={state.error}
      success={state.success}
      successMessage="Account switched successfully!"
      isEmpty={accounts.length === 0}
      emptyMessage="No Mailchimp accounts connected yet."
      isSubmitting={state.isSubmitting}
      onSubmit={handleSwitchAccount}
      submitLabel="Switch Account"
      submitLoadingLabel="Switching..."
      submitDisabled={!state.selectedId}
      accentColor="blue"
    >
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {accounts.map((account) => (
          <SelectorItem
            key={account.id}
            isSelected={state.selectedId === account.id}
            onSelect={() => actions.setSelectedId(account.id)}
            title={account.mailchimp_account_name}
            subtitle={`ID: ${account.mailchimp_account_id}`}
            badge={account.is_primary ? 'Current' : undefined}
            badgeColor="blue"
            accentColor="blue"
            onRemove={() => handleRemoveAccount(account.id, account.mailchimp_account_name)}
          />
        ))}
      </div>
    </AccountSelectorModal>
  )
}

export default MailchimpAccountSelector
