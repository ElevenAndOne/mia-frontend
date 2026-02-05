import { useState, useEffect } from 'react'
import { apiFetch } from '../../../utils/api'
import { useSession } from '../../../contexts/session-context'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'
import type { HubSpotAccount } from '../types'

interface HubSpotAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const HubSpotAccountSelector = ({ isOpen, onClose, onSuccess }: HubSpotAccountSelectorProps) => {
  const { sessionId } = useSession()
  const [accounts, setAccounts] = useState<HubSpotAccount[]>([])

  const [state, actions] = useSelectorState<number>({
    onSuccess,
    onClose,
  })

  useEffect(() => {
    if (isOpen) {
      fetchHubSpotAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchHubSpotAccounts = async () => {
    actions.setIsLoading(true)
    actions.setError(null)

    try {
      const response = await apiFetch('/api/oauth/hubspot/accounts', {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId || 'default',
        },
      })

      const data = await response.json()

      if (data.success && data.accounts) {
        setAccounts(data.accounts)

        const primaryAccount = data.accounts.find((acc: HubSpotAccount) => acc.is_primary)
        if (primaryAccount) {
          actions.setSelectedId(primaryAccount.id)
        } else if (data.accounts.length === 1) {
          actions.setSelectedId(data.accounts[0].id)
        }
      } else {
        actions.setError(data.error || 'Failed to fetch HubSpot accounts')
      }
    } catch {
      actions.setError('Failed to load HubSpot accounts. Please try again.')
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
        `/api/oauth/hubspot/select-account?hubspot_id=${state.selectedId}`,
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
        throw new Error(data.message || 'Failed to switch HubSpot account')
      }
    })
  }

  const handleRemoveAccount = async (hubspotId: number, accountName: string) => {
    if (!confirm(`Remove ${accountName} from this account?`)) {
      return
    }

    try {
      const response = await apiFetch(
        `/api/oauth/hubspot/disconnect?hubspot_id=${hubspotId}`,
        {
          method: 'DELETE',
          headers: {
            'X-Session-ID': sessionId || 'default',
          },
        }
      )

      const data = await response.json()

      if (data.success) {
        await fetchHubSpotAccounts()
      } else {
        actions.setError(data.message || 'Failed to remove HubSpot account')
      }
    } catch {
      actions.setError('Failed to remove account. Please try again.')
    }
  }

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="HubSpot Portals"
      subtitle="Select which HubSpot portal to use for this account"
      icon={
        <svg className="w-6 h-6 text-brand-teriary" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.164 7.93V5.282c0-.18-.147-.327-.327-.327h-.72a2.12 2.12 0 0 0-2.118-2.118V.94a.327.327 0 0 0-.327-.327h-2.545a.327.327 0 0 0-.327.327v1.897a2.12 2.12 0 0 0-2.118 2.118h-.72a.327.327 0 0 0-.327.327v2.648c0 .18.147.327.327.327h.72a2.12 2.12 0 0 0 2.118 2.118v3.344a1.91 1.91 0 0 1-1.909 1.909 1.91 1.91 0 0 1-1.909-1.909V13.3a.327.327 0 0 0-.327-.327H5.11a.327.327 0 0 0-.327.327v.418a4.364 4.364 0 0 0 4.364 4.364c.18 0 .36-.011.536-.033l1.59 2.754a.327.327 0 0 0 .283.164h2.89a.327.327 0 0 0 .283-.491l-1.45-2.507a4.353 4.353 0 0 0 2.994-4.142v-.418a.327.327 0 0 0-.327-.327h-2.545a.327.327 0 0 0-.327.327v.418a1.91 1.91 0 0 1-1.909 1.909c-.152 0-.3-.018-.443-.052V11.37a2.12 2.12 0 0 0 2.118-2.118h.72a.327.327 0 0 0 .327-.327z" />
        </svg>
      }
      iconBgColor="bg-brand-secondary"
      isLoading={state.isLoading}
      loadingMessage="Loading HubSpot portals..."
      error={state.error}
      success={state.success}
      successMessage="Successfully switched portals!"
      isEmpty={accounts.length === 0}
      emptyMessage="No HubSpot portals connected yet."
      emptySubMessage="Connect a HubSpot portal to get started."
      isSubmitting={state.isSubmitting}
      onSubmit={handleSwitchAccount}
      submitLabel="Switch Portal"
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
            subtitle={`Portal ID: ${account.portal_id}`}
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

export default HubSpotAccountSelector
