import { useState, useEffect } from 'react'
import { useSession } from '../../../contexts/session-context'
import * as accountService from '../../accounts/services/account-service'
import {
  useGoogleAdsDiscovery,
  useGroupedDiscovery,
  type DiscoveredGoogleAccount,
} from '../../accounts/hooks/use-google-ads-discovery'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'

interface GoogleAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const GoogleAccountSelector = ({ isOpen, onClose, onSuccess }: GoogleAccountSelectorProps) => {
  const { user, sessionId, refreshWorkspaces, activeWorkspace } = useSession()
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [state, actions] = useSelectorState<string>({
    onSuccess,
    onClose,
  })

  // Shared user-level discovery (all accounts across all MCCs, incl. via_mcc).
  const discovery = useGoogleAdsDiscovery(isOpen, user?.google_user_id)
  const { mccGroups, standalone } = useGroupedDiscovery(discovery.accounts, search)

  // Reset transient state on close; pre-select the saved account when the list is ready.
  useEffect(() => {
    if (!isOpen) {
      setLocalSelectedId(null)
      setSearch('')
      return
    }
    actions.resetState()
    if (discovery.status !== 'ready') return

    // Priority: workspace TAM field (backend) → localStorage fallback → auto-select if one
    const lsKey = activeWorkspace?.tenant_id ? `gads_${activeWorkspace.tenant_id}` : null
    const savedId =
      activeWorkspace?.google_ads_customer_id || (lsKey ? localStorage.getItem(lsKey) : null)
    if (savedId && discovery.accounts.some((a) => a.customer_id === savedId)) {
      setLocalSelectedId(`google_${savedId}`)
    } else if (discovery.accounts.length === 1) {
      setLocalSelectedId(`google_${discovery.accounts[0].customer_id}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, discovery.status])

  const handleSelectAccount = async () => {
    if (!localSelectedId) {
      actions.setError('Please select a Google Ads account')
      return
    }

    await actions.withSubmitting(async () => {
      const customerId = localSelectedId.replace('google_', '')
      const selected = discovery.accounts.find((a) => a.customer_id === customerId)

      // For an MCC-managed sub-account, pass the managing MCC so the backend sets
      // login_customer_id — otherwise data pulls for that account fail.
      await accountService.setGoogleAdsAccount(sessionId || '', {
        customer_id: customerId,
        google_ads_account_type: selected?.parent_mcc_id ? 'mcc_subaccount' : 'standalone',
        ...(selected?.parent_mcc_id ? { google_ads_mcc_id: selected.parent_mcc_id } : {}),
      })

      // Persist to localStorage so picker pre-selects correctly on next open
      if (activeWorkspace?.tenant_id) {
        localStorage.setItem(`gads_${activeWorkspace.tenant_id}`, customerId)
      }
      await refreshWorkspaces()
      actions.handleSuccess()
    })
  }

  const renderAccount = (account: DiscoveredGoogleAccount) => (
    <SelectorItem
      key={account.customer_id}
      isSelected={localSelectedId === `google_${account.customer_id}`}
      onSelect={() => setLocalSelectedId(`google_${account.customer_id}`)}
      title={account.descriptive_name || `Account ${account.customer_id}`}
      subtitle={`Ads: ${account.customer_id}`}
      badge={account.via_mcc ? 'Via MCC' : undefined}
      badgeColor="gray"
      accentColor="green"
    />
  )

  const noMatches =
    discovery.accounts.length > 0 && mccGroups.length === 0 && standalone.length === 0

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="Select Google Ads Account"
      subtitle="Choose which account to use for this workspace"
      icon={<img src="/icons/google-ads.svg" alt="Google Ads" className="w-6 h-6" />}
      iconBgColor="bg-utility-info-200"
      isLoading={discovery.status === 'idle' || discovery.status === 'loading'}
      error={
        state.error ||
        (discovery.status === 'error' ? 'Failed to load Google Ads accounts' : null)
      }
      success={state.success}
      successMessage="Account selected!"
      isEmpty={discovery.status === 'ready' && discovery.accounts.length === 0}
      emptyMessage="No Google Ads accounts found"
      emptySubMessage="Please authenticate with Google first"
      isSubmitting={state.isSubmitting}
      onSubmit={handleSelectAccount}
      submitLabel="Select Account"
      submitLoadingLabel="Selecting..."
      submitDisabled={!localSelectedId}
      accentColor="green"
    >
      <div>
        <label className="block subheading-md text-secondary mb-2">Select Google Ads Account</label>

        {discovery.status === 'error' && (
          <button
            type="button"
            onClick={discovery.retry}
            className="paragraph-sm text-utility-brand-600 underline mb-3"
          >
            Try again
          </button>
        )}

        {/* Search — agencies can have hundreds of accounts across MCCs */}
        {discovery.accounts.length > 5 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full mb-3 px-3 py-2 rounded-lg border-2 border-secondary bg-primary text-primary paragraph-sm placeholder:text-placeholder-subtle focus:outline-none focus:border-utility-success-500"
          />
        )}

        <div className="space-y-4 max-h-80 overflow-y-auto">
          {/* Accounts grouped by their managing MCC */}
          {mccGroups.map(([mccId, accts]) => (
            <div key={mccId}>
              <p className="subheading-sm text-tertiary mb-2">
                {discovery.mccName(mccId)}{' '}
                <span className="text-quaternary">({accts.length})</span>
              </p>
              <div className="space-y-2">{accts.map(renderAccount)}</div>
            </div>
          ))}

          {/* Standalone accounts (not under an MCC) */}
          {standalone.length > 0 && (
            <div>
              {mccGroups.length > 0 && (
                <p className="subheading-sm text-tertiary mb-2">Standalone Accounts</p>
              )}
              <div className="space-y-2">{standalone.map(renderAccount)}</div>
            </div>
          )}

          {noMatches && (
            <p className="paragraph-sm text-quaternary text-center py-4">
              No accounts match “{search}”.
            </p>
          )}
        </div>
      </div>
    </AccountSelectorModal>
  )
}

export default GoogleAccountSelector
