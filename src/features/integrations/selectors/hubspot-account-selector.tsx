import { useState, useEffect } from 'react'
import { useMiaClient, type HubSpotAccount as SDKHubSpotAccount } from '../../../sdk'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'
import type { HubSpotAccount } from '../types'

// Map SDK HubSpotAccount to local format
const mapHubSpotAccount = (acc: SDKHubSpotAccount): HubSpotAccount => ({
  id: acc.id,
  portal_id: acc.portalId,
  account_name: acc.accountName,
  is_primary: acc.isPrimary,
})

interface HubSpotAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const HubSpotAccountSelector = ({ isOpen, onClose, onSuccess }: HubSpotAccountSelectorProps) => {
  const mia = useMiaClient()
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
      const sdkAccounts = await mia.platforms.hubspot.getAccounts()
      const mappedAccounts = sdkAccounts.map(mapHubSpotAccount)
      setAccounts(mappedAccounts)

      const primaryAccount = mappedAccounts.find((acc) => acc.is_primary)
      if (primaryAccount) {
        actions.setSelectedId(primaryAccount.id)
      } else if (mappedAccounts.length === 1) {
        actions.setSelectedId(mappedAccounts[0].id)
      }
    } catch {
      actions.setError('Failed to load HubSpot accounts. Please try again.')
    } finally {
      actions.setIsLoading(false)
    }
  }

  const handleSwitchAccount = async () => {
    const selectedId = state.selectedId
    if (!selectedId) {
      actions.setError('Please select an account')
      return
    }

    await actions.withSubmitting(async () => {
      await mia.platforms.hubspot.selectAccount(selectedId)
      actions.handleSuccess()
    })
  }

  const handleRemoveAccount = async (hubspotId: number, accountName: string) => {
    if (!confirm(`Remove ${accountName} from this account?`)) {
      return
    }

    try {
      await mia.platforms.hubspot.disconnect(hubspotId)
      await fetchHubSpotAccounts()
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
