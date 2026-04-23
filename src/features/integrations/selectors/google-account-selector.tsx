import { useState, useEffect, useRef } from 'react'
import { useSession } from '../../../contexts/session-context'
import { apiFetch } from '../../../utils/api'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'
import { logger } from '../../../utils/logger'

interface GoogleAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface AdAccount {
  customer_id: string
  descriptive_name: string
  manager: boolean
  parent_mcc_id?: string | null
}

const GoogleAccountSelector = ({ isOpen, onClose, onSuccess }: GoogleAccountSelectorProps) => {
  const { user, sessionId, refreshWorkspaces, activeWorkspace } = useSession()
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const hasLoadedRef = useRef(false)

  const [state, actions] = useSelectorState<string>({
    onSuccess,
    onClose,
  })

  // Fetch ALL Google Ads accounts directly from the discovery endpoint
  // Same endpoint the onboarding flow uses — returns MCC + sub-accounts
  useEffect(() => {
    if (!isOpen) {
      hasLoadedRef.current = false
      return
    }
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    actions.resetState()

    if (!user?.google_user_id) return

    setIsLoading(true)
    apiFetch(`/api/oauth/google/ad-accounts?user_id=${encodeURIComponent(user.google_user_id)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to fetch accounts')
        const data = await response.json()

        // ad_accounts has ALL accounts (MCC parents + sub-accounts + standalone)
        // Filter OUT MCC parent accounts — users should select sub-accounts
        const allAccounts: AdAccount[] = data.ad_accounts || []
        const nonMccAccounts = allAccounts.filter((a) => !a.manager)

        logger.log(
          `[GOOGLE-SELECTOR] Fetched ${allAccounts.length} total, ${nonMccAccounts.length} non-MCC accounts`
        )
        setAccounts(nonMccAccounts)

        // Pre-select the currently saved account.
        // Priority: workspace TAM field (from backend) → localStorage fallback → auto-select if only one
        const lsKey = activeWorkspace?.tenant_id ? `gads_${activeWorkspace.tenant_id}` : null
        const savedId =
          activeWorkspace?.google_ads_customer_id || (lsKey ? localStorage.getItem(lsKey) : null)
        if (savedId) {
          const match = nonMccAccounts.find((a) => a.customer_id === savedId)
          if (match) {
            setLocalSelectedId(`google_${match.customer_id}`)
          }
        } else if (nonMccAccounts.length === 1) {
          setLocalSelectedId(`google_${nonMccAccounts[0].customer_id}`)
        }
      })
      .catch((err) => {
        logger.error('[GOOGLE-SELECTOR] Fetch failed:', err)
        actions.setError('Failed to load Google Ads accounts')
      })
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleSelectAccount = async () => {
    if (!localSelectedId) {
      actions.setError('Please select a Google Ads account')
      return
    }

    await actions.withSubmitting(async () => {
      // Extract the customer_id from the selected ID (format: google_XXXXXXX)
      const customerId = localSelectedId.replace('google_', '')

      // Simple endpoint to set google_ads_customer_id on workspace's TenantAccountMapping
      const response = await apiFetch('/api/accounts/set-google-ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || '',
        },
        body: JSON.stringify({ customer_id: customerId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to link Google Ads account')
      }

      // Persist to localStorage so picker pre-selects correctly on next open
      if (activeWorkspace?.tenant_id) {
        localStorage.setItem(`gads_${activeWorkspace.tenant_id}`, customerId)
      }
      // Refresh workspaces so activeWorkspace.google_ads_customer_id also updates (once backend deployed)
      await refreshWorkspaces()
      actions.handleSuccess()
    })
  }

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="Select Google Ads Account"
      subtitle="Choose which account to use for this workspace"
      icon={<img src="/icons/google-ads.svg" alt="Google Ads" className="w-6 h-6" />}
      iconBgColor="bg-utility-info-200"
      isLoading={isLoading}
      error={state.error}
      success={state.success}
      successMessage="Account selected!"
      isEmpty={accounts.length === 0 && !isLoading}
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
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {accounts.map((account) => (
            <SelectorItem
              key={account.customer_id}
              isSelected={localSelectedId === `google_${account.customer_id}`}
              onSelect={() => setLocalSelectedId(`google_${account.customer_id}`)}
              title={account.descriptive_name || `Account ${account.customer_id}`}
              subtitle={`Ads: ${account.customer_id}`}
              accentColor="green"
            />
          ))}
        </div>
      </div>
    </AccountSelectorModal>
  )
}

export default GoogleAccountSelector
