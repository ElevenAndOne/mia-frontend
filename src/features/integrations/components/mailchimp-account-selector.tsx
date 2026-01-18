import { useMemo } from 'react'
import { AccountSelectorModal, SelectableItem } from '@/components/ui'
import { apiFetch } from '@/utils/api'
import { useSession } from '@/contexts/session-context-shim'

interface MailchimpAccount extends SelectableItem {
  mailchimp_account_id: string
  is_primary: boolean
}

interface MailchimpAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const MailchimpAccountSelector = ({ isOpen, onClose, onSuccess }: MailchimpAccountSelectorProps) => {
  const { sessionId } = useSession()

  const config = useMemo(
    () => ({
      title: 'Mailchimp Accounts',
      subtitle: 'Select which Mailchimp account to use with this Google Ads account',
      icon: (
        <img src="/icons/mailchimp.svg" alt="Mailchimp" className="w-6 h-6" />
      ),
      iconBgColor: 'bg-yellow-100',
      accentColor: 'blue' as const,
      loadingMessage: 'Loading Mailchimp accounts...',
      emptyMessage: 'No Mailchimp accounts connected yet.',
      successMessage: 'Account switched successfully!',

      fetchAccounts: async (): Promise<MailchimpAccount[]> => {
        const response = await apiFetch(`/api/oauth/mailchimp/accounts?session_id=${sessionId}`, {
          method: 'GET',
          headers: { 'X-Session-ID': sessionId || 'default' },
        })
        const data = await response.json()

        if (data.success && data.accounts) {
          return data.accounts.map((acc: any) => ({
            id: acc.id,
            label: acc.mailchimp_account_name,
            description: `ID: ${acc.mailchimp_account_id}`,
            badge: acc.is_primary ? 'Current' : undefined,
            mailchimp_account_id: acc.mailchimp_account_id,
            is_primary: acc.is_primary,
          }))
        }
        throw new Error(data.error || 'Failed to fetch Mailchimp accounts')
      },

      getPreSelectedIds: (accounts: MailchimpAccount[]) => {
        const primary = accounts.find((acc) => acc.is_primary)
        if (primary) return [primary.id]
        return accounts.length === 1 ? [accounts[0].id] : []
      },

      onSubmit: async (selectedIds: (string | number)[]) => {
        if (!selectedIds.length) throw new Error('Please select an account')

        const response = await apiFetch(
          `/api/oauth/mailchimp/set-primary?mailchimp_id=${selectedIds[0]}&session_id=${sessionId}`,
          {
            method: 'POST',
            headers: { 'X-Session-ID': sessionId || 'default' },
          }
        )

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to switch account')
        }
      },

      onRemove: async (item: MailchimpAccount) => {
        const response = await apiFetch(
          `/api/oauth/mailchimp/disconnect?session_id=${sessionId}&mailchimp_id=${item.id}`,
          {
            method: 'DELETE',
            headers: { 'X-Session-ID': sessionId || 'default' },
          }
        )

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.message || 'Failed to remove Mailchimp account')
        }
      },

      submitLabel: 'Switch Account',
    }),
    [sessionId]
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

export default MailchimpAccountSelector
