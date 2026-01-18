import { useMemo } from 'react'
import { AccountSelectorModal, SelectableItem } from '@/components/ui'
import { useSession } from '@/contexts/session-context-shim'

interface GoogleAccount extends SelectableItem {
  google_ads_id: string
  isCurrent: boolean
}

interface GoogleAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const GoogleAccountSelector = ({ isOpen, onClose, onSuccess }: GoogleAccountSelectorProps) => {
  const { availableAccounts, selectedAccount, selectAccount } = useSession()

  const config = useMemo(
    () => ({
      title: 'Switch Google Ads Account',
      subtitle: 'Select an account to view its data',
      icon: (
        <img src="/icons/google-ads.svg" alt="Google Ads" className="w-6 h-6" />
      ),
      iconBgColor: 'bg-blue-100',
      accentColor: 'green' as const,
      emptyMessage: 'No Google Ads accounts found',
      successMessage: 'Account switched successfully!',
      helperText: '💡 Switching accounts will load that account\'s integrations and data.',

      fetchAccounts: async (): Promise<GoogleAccount[]> => {
        // Use local available accounts instead of API call
        return availableAccounts
          .filter((account) => account.google_ads_id)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((account) => ({
            id: account.id,
            label: account.name,
            description: `ID: ${account.google_ads_id}`,
            badge: account.id === selectedAccount?.id ? 'Current' : undefined,
            google_ads_id: account.google_ads_id!,
            isCurrent: account.id === selectedAccount?.id,
          }))
      },

      getPreSelectedIds: () => {
        return selectedAccount ? [selectedAccount.id] : []
      },

      onSubmit: async (selectedIds: (string | number)[]) => {
        if (!selectedIds.length) throw new Error('Please select a Google Ads account')

        const accountId = selectedIds[0] as string

        // If same account selected, just close
        if (accountId === selectedAccount?.id) return

        const success = await selectAccount(accountId)
        if (!success) {
          throw new Error('Failed to switch account')
        }
      },

      submitLabel: 'Switch Account',
    }),
    [availableAccounts, selectedAccount, selectAccount]
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

export default GoogleAccountSelector
