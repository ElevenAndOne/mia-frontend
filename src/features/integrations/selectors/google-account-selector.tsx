import { useState, useEffect } from 'react'
import { useSession } from '../../../contexts/session-context'
import * as accountService from '../../accounts/services/account-service'
import {
  useGoogleAdsDiscovery,
  useGroupedDiscovery,
  setGoogleAdsBodyFor,
  type DiscoveredGoogleAccount,
} from '../../accounts/hooks/use-google-ads-discovery'
import { GroupedAdsAccountList } from '../../accounts/components/grouped-ads-account-list'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'

interface GoogleAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const GoogleAccountSelector = ({ isOpen, onClose, onSuccess }: GoogleAccountSelectorProps) => {
  const { user, sessionId, refreshWorkspaces, activeWorkspace, isAuthenticated } = useSession()
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [state, actions] = useSelectorState<string>({
    onSuccess,
    onClose,
  })

  // Discovery needs an actual GOOGLE login (isAuthenticated is the Google-specific flag —
  // user.google_user_id alone is unreliable: Meta-first logins store the Meta id there).
  // Without one, the modal shows the "authenticate with Google first" empty state instead
  // of fetching (or spinning) pointlessly.
  const canDiscover = isAuthenticated && !!user?.google_user_id
  const discovery = useGoogleAdsDiscovery(isOpen && canDiscover, user?.google_user_id)
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

    // Pre-select the currently saved account (workspace TAM field → localStorage). Only
    // auto-select a sole discovered account when NOTHING is saved — if a saved id exists
    // but is absent from discovery, select nothing rather than silently pre-selecting a
    // different account the user might then confirm by accident.
    const lsKey = activeWorkspace?.tenant_id ? `gads_${activeWorkspace.tenant_id}` : null
    const savedId =
      activeWorkspace?.google_ads_customer_id || (lsKey ? localStorage.getItem(lsKey) : null)
    if (savedId) {
      if (discovery.accounts.some((a) => a.customer_id === savedId)) {
        setLocalSelectedId(`google_${savedId}`)
      }
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
      if (!selected) {
        throw new Error('Selected account not found — please reopen and try again')
      }

      // For an MCC-managed sub-account this passes the managing MCC so the backend sets
      // login_customer_id — otherwise data pulls for that account fail.
      await accountService.setGoogleAdsAccount(sessionId || '', setGoogleAdsBodyFor(selected))

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

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="Select Google Ads Account"
      subtitle="Choose which account to use for this workspace"
      icon={<img src="/icons/google-ads.svg" alt="Google Ads" className="w-6 h-6" />}
      iconBgColor="bg-utility-info-200"
      isLoading={canDiscover && (discovery.status === 'idle' || discovery.status === 'loading')}
      error={
        state.error ||
        (discovery.status === 'error' ? 'Failed to load Google Ads accounts' : null)
      }
      success={state.success}
      successMessage="Account selected!"
      isEmpty={!canDiscover || (discovery.status === 'ready' && discovery.accounts.length === 0)}
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

        <GroupedAdsAccountList
          mccGroups={mccGroups}
          standalone={standalone}
          totalCount={discovery.accounts.length}
          search={search}
          onSearchChange={setSearch}
          mccName={discovery.mccName}
          searchInputClassName="w-full mb-3 px-3 py-2 rounded-lg border-2 border-secondary bg-primary text-primary paragraph-sm placeholder:text-placeholder-subtle focus:outline-none focus:border-utility-success-500"
          groupHeaderClassName="subheading-sm text-tertiary mb-2"
          listClassName="space-y-4 max-h-80 overflow-y-auto"
          renderItem={renderAccount}
        />
      </div>
    </AccountSelectorModal>
  )
}

export default GoogleAccountSelector
