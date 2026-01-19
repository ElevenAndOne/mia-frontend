import { useMemo } from 'react'
import { AccountSelectorModal, SelectableItem } from '@/components/ui'
import { apiFetch } from '@/utils/api'
import { useSession } from '@/contexts/session-context-shim'

interface BrevoAccount extends SelectableItem {
  is_primary: boolean
  created_at: string
}

interface BrevoAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const BrevoAccountSelector = ({ isOpen, onClose, onSuccess }: BrevoAccountSelectorProps) => {
  const { sessionId } = useSession()

  const config = useMemo(
    () => ({
      title: 'Brevo Accounts',
      subtitle: 'Select which Brevo account to use for this account',
      icon: (
        <img src="/icons/brevo.svg" alt="Brevo" className="w-6 h-6" />
      ),
      iconBgColor: 'bg-blue-100',
      accentColor: 'black' as const,
      loadingMessage: 'Loading Brevo accounts...',
      emptyMessage: 'No Brevo accounts connected yet.',
      successMessage: 'Successfully switched accounts!',

      fetchAccounts: async (): Promise<BrevoAccount[]> => {
        const response = await apiFetch(`/api/oauth/brevo/accounts?session_id=${sessionId}`, {
          method: 'GET',
          headers: { 'X-Session-ID': sessionId || 'default' },
        })
        const data = await response.json()

        if (data.success && data.accounts) {
          return data.accounts.map((acc: { id: string; account_name: string; created_at: string; is_primary?: boolean }) => ({
            id: acc.id,
            label: acc.account_name,
            description: `Added ${new Date(acc.created_at).toLocaleDateString()}`,
            badge: acc.is_primary ? 'Primary' : undefined,
            is_primary: acc.is_primary,
            created_at: acc.created_at,
          }))
        }
        throw new Error(data.error || 'Failed to fetch Brevo accounts')
      },

      getPreSelectedIds: (accounts: BrevoAccount[]) => {
        const primary = accounts.find((acc) => acc.is_primary)
        if (primary) return [primary.id]
        return accounts.length === 1 ? [accounts[0].id] : []
      },

      onSubmit: async (selectedIds: (string | number)[]) => {
        if (!selectedIds.length) throw new Error('Please select an account')

        const response = await apiFetch('/api/oauth/brevo/select-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId || 'default',
          },
          body: JSON.stringify({
            session_id: sessionId,
            brevo_id: selectedIds[0],
          }),
        })

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.message || 'Failed to switch Brevo account')
        }
      },

      onRemove: async (item: BrevoAccount) => {
        const response = await apiFetch(
          `/api/oauth/brevo/disconnect?session_id=${sessionId}&brevo_id=${item.id}`,
          { method: 'DELETE' }
        )

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.message || 'Failed to remove Brevo account')
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

export default BrevoAccountSelector
