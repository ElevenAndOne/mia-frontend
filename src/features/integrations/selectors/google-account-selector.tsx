import { useState, useEffect, useMemo } from 'react'
import { useSession } from '../../../contexts/session-context'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'

interface GoogleAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const GoogleAccountSelector = ({ isOpen, onClose, onSuccess }: GoogleAccountSelectorProps) => {
  const { availableAccounts, selectedAccount, selectAccount } = useSession()
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null)

  const [state, actions] = useSelectorState<string>({
    onSuccess,
    onClose,
  })

  // Filter and sort Google Ads accounts
  const googleAdsAccounts = useMemo(() => {
    return availableAccounts
      .filter((account) => account.google_ads_id)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [availableAccounts])

  // Pre-select current account when modal opens
  useEffect(() => {
    if (isOpen && selectedAccount) {
      setLocalSelectedId(selectedAccount.id)
      actions.setIsLoading(false)
    }
  }, [isOpen, selectedAccount, actions])

  const handleSwitchAccount = async () => {
    if (!localSelectedId) {
      actions.setError('Please select a Google Ads account')
      return
    }

    // If same account selected, just close
    if (localSelectedId === selectedAccount?.id) {
      actions.handleClose()
      return
    }

    await actions.withSubmitting(async () => {
      const success = await selectAccount(localSelectedId)

      if (success) {
        actions.handleSuccess()
      } else {
        throw new Error('Failed to switch account')
      }
    })
  }

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="Switch Google Ads Account"
      subtitle="Select an account to view its data"
      icon={<img src="/icons/google-ads.svg" alt="Google Ads" className="w-6 h-6" />}
      iconBgColor="bg-utility-info-200"
      isLoading={false}
      error={state.error}
      success={state.success}
      successMessage="Account switched successfully!"
      isEmpty={googleAdsAccounts.length === 0}
      emptyMessage="No Google Ads accounts found"
      emptySubMessage="Please authenticate with Google first"
      isSubmitting={state.isSubmitting}
      onSubmit={handleSwitchAccount}
      submitLabel="Switch Account"
      submitLoadingLabel="Switching..."
      submitDisabled={!localSelectedId}
      accentColor="green"
    >
      <div>
        <label className="block subheading-md text-secondary mb-2">
          Select Google Ads Account
        </label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {googleAdsAccounts.map((account) => (
            <SelectorItem
              key={account.id}
              isSelected={localSelectedId === account.id}
              onSelect={() => setLocalSelectedId(account.id)}
              title={account.name}
              subtitle={`ID: ${account.google_ads_id}`}
              badge={account.id === selectedAccount?.id ? 'Current' : undefined}
              badgeColor="green"
              accentColor="green"
            />
          ))}
        </div>
      </div>

      <div className="bg-success-primary border border-utility-success-300 rounded-lg p-3 mt-4">
        <p className="paragraph-xs text-success">
          Switching accounts will load that account's integrations and data.
        </p>
      </div>
    </AccountSelectorModal>
  )
}

export default GoogleAccountSelector
