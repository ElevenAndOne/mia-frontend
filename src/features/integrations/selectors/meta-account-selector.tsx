import { useState, useEffect } from 'react'
import { apiFetch } from '../../../utils/api'
import { useSession } from '../../../contexts/session-context'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'
import type { MetaAccount } from '../types'

interface MetaAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentGoogleAccountName?: string
  currentAccountData?: { meta_ads_id?: string } | null
}

function MetaIcon() {
  return (
    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

const MetaAccountSelector = ({
  isOpen,
  onClose,
  onSuccess,
  currentGoogleAccountName,
  currentAccountData,
}: MetaAccountSelectorProps) => {
  const { sessionId, selectedAccount } = useSession()
  const accountToUse = currentAccountData || selectedAccount
  const [accounts, setAccounts] = useState<MetaAccount[]>([])

  const [state, actions] = useSelectorState<string>({
    onSuccess,
    onClose,
  })

  useEffect(() => {
    if (isOpen) {
      fetchMetaAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchMetaAccounts = async () => {
    actions.setIsLoading(true)
    actions.setError(null)

    try {
      const response = await apiFetch('/api/oauth/meta/accounts/available', {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId || 'default',
        },
      })

      const data = await response.json()

      if (data.success && data.accounts) {
        const sortedAccounts = data.accounts.sort((a: MetaAccount, b: MetaAccount) =>
          a.name.localeCompare(b.name)
        )
        setAccounts(sortedAccounts)

        if (accountToUse?.meta_ads_id) {
          actions.setSelectedId(accountToUse.meta_ads_id)
        } else if (sortedAccounts.length === 1) {
          actions.setSelectedId(sortedAccounts[0].id)
        }
      } else {
        actions.setError(data.error || 'Failed to fetch Meta accounts')
      }
    } catch {
      actions.setError('Failed to load Meta accounts. Please try again.')
    } finally {
      actions.setIsLoading(false)
    }
  }

  const handleLinkAccount = async () => {
    await actions.withSubmitting(async () => {
      const response = await apiFetch('/api/oauth/meta/accounts/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default',
        },
        body: JSON.stringify({
          meta_account_id: state.selectedId || '',
        }),
      })

      const data = await response.json()

      if (data.success) {
        actions.handleSuccess()
      } else {
        throw new Error(data.message || 'Failed to update Meta account')
      }
    })
  }

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="Link Meta Account"
      subtitle={currentGoogleAccountName ? `to ${currentGoogleAccountName}` : undefined}
      icon={<MetaIcon />}
      iconBgColor="bg-blue-100"
      isLoading={state.isLoading}
      loadingMessage="Loading your Meta accounts..."
      error={state.error}
      success={state.success}
      successMessage="Meta account linked successfully!"
      isEmpty={accounts.length === 0}
      emptyMessage="No Meta ad accounts found"
      emptySubMessage="Make sure you have access to at least one Meta Ads account"
      isSubmitting={state.isSubmitting}
      onSubmit={handleLinkAccount}
      submitLabel={`Apply (${state.selectedId ? '1' : '0'})`}
      submitLoadingLabel="Applying..."
      accentColor="blue"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Meta Ad Account
        </label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {accounts.map((account) => (
            <SelectorItem
              key={account.id}
              isSelected={state.selectedId === account.id}
              onSelect={() =>
                actions.setSelectedId(state.selectedId === account.id ? null : account.id)
              }
              title={account.name}
              subtitle={`ID: ${account.id} • ${account.currency}`}
              accentColor="blue"
            />
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
        <p className="text-xs text-blue-800">
          This Meta account will be linked to your {currentGoogleAccountName || 'Google Ads'}{' '}
          account for unified reporting.
        </p>
      </div>
    </AccountSelectorModal>
  )
}

export default MetaAccountSelector
