import { useMemo } from 'react'
import { AccountSelectorModal, SelectableItem } from '@/components/ui'
import { apiFetch } from '@/utils/api'
import { useSession } from '@/contexts/session-context-shim'

interface MetaAccount extends SelectableItem {
  currency: string
  status: string
}

interface AccountData {
  id: string
  name: string
  meta_ads_id?: string
}

interface MetaAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentGoogleAccountName?: string
  currentAccountData?: AccountData
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

  const config = useMemo(
    () => ({
      title: 'Link Meta Account',
      subtitle: currentGoogleAccountName ? `to ${currentGoogleAccountName}` : undefined,
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      iconBgColor: 'bg-blue-100',
      accentColor: 'blue' as const,
      loadingMessage: 'Loading your Meta accounts...',
      emptyMessage: 'No Meta ad accounts found',
      successMessage: 'Meta account linked successfully!',
      helperText: `💡 This Meta account will be linked to your ${currentGoogleAccountName || 'Google Ads'} account for unified reporting.`,

      fetchAccounts: async (): Promise<MetaAccount[]> => {
        const response = await apiFetch('/api/oauth/meta/accounts/available', {
          method: 'GET',
          headers: { 'X-Session-ID': sessionId || 'default' },
        })
        const data = await response.json()

        if (data.success && data.accounts) {
          type RawMetaAccount = { id: string; name: string; currency: string; status: string }
          return (data.accounts as RawMetaAccount[])
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((acc) => ({
              id: acc.id,
              label: acc.name,
              description: `ID: ${acc.id} • ${acc.currency}`,
              currency: acc.currency,
              status: acc.status,
            }))
        }
        throw new Error(data.error || 'Failed to fetch Meta accounts')
      },

      getPreSelectedIds: (accounts: MetaAccount[]) => {
        if (accountToUse?.meta_ads_id) {
          return [accountToUse.meta_ads_id]
        }
        return accounts.length === 1 ? [accounts[0].id] : []
      },

      onSubmit: async (selectedIds: (string | number)[]) => {
        const response = await apiFetch('/api/oauth/meta/accounts/link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId || 'default',
          },
          body: JSON.stringify({
            meta_account_id: selectedIds[0] || '',
          }),
        })

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.message || 'Failed to update Meta account')
        }
      },

      submitLabel: (count: number) => `Apply (${count})`,
    }),
    [sessionId, accountToUse, currentGoogleAccountName]
  )

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      config={config}
    />
  )
}

export default MetaAccountSelector
