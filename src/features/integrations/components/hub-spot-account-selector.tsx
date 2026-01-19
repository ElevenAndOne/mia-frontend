import { useMemo } from 'react'
import { AccountSelectorModal, SelectableItem } from '@/components/ui'
import { apiFetch } from '@/utils/api'
import { useSession } from '@/contexts/session-context-shim'

interface HubSpotAccount extends SelectableItem {
  portal_id: string
  is_primary: boolean
}

interface HubSpotAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const HubSpotAccountSelector = ({ isOpen, onClose, onSuccess }: HubSpotAccountSelectorProps) => {
  const { sessionId } = useSession()

  const config = useMemo(
    () => ({
      title: 'HubSpot Portals',
      subtitle: 'Select which HubSpot portal to use for this account',
      icon: (
        <img src="/icons/hubspot.svg" alt="HubSpot" className="w-6 h-6" />
      ),
      iconBgColor: 'bg-orange-100',
      accentColor: 'black' as const,
      loadingMessage: 'Loading HubSpot portals...',
      emptyMessage: 'No HubSpot portals connected yet.',
      successMessage: 'Successfully switched portals!',

      fetchAccounts: async (): Promise<HubSpotAccount[]> => {
        const response = await apiFetch(`/api/oauth/hubspot/accounts?session_id=${sessionId}`, {
          method: 'GET',
          headers: { 'X-Session-ID': sessionId || 'default' },
        })
        const data = await response.json()

        if (data.success && data.accounts) {
          return data.accounts.map((acc: { id: string; account_name: string; portal_id: string; is_primary?: boolean }) => ({
            id: acc.id,
            label: acc.account_name,
            description: `Portal ID: ${acc.portal_id}`,
            badge: acc.is_primary ? 'Primary' : undefined,
            portal_id: acc.portal_id,
            is_primary: acc.is_primary,
          }))
        }
        throw new Error(data.error || 'Failed to fetch HubSpot accounts')
      },

      getPreSelectedIds: (accounts: HubSpotAccount[]) => {
        const primary = accounts.find((acc) => acc.is_primary)
        if (primary) return [primary.id]
        return accounts.length === 1 ? [accounts[0].id] : []
      },

      onSubmit: async (selectedIds: (string | number)[]) => {
        if (!selectedIds.length) throw new Error('Please select an account')

        const response = await apiFetch(
          `/api/oauth/hubspot/select-account?hubspot_id=${selectedIds[0]}&session_id=${sessionId}`,
          {
            method: 'POST',
            headers: { 'X-Session-ID': sessionId || 'default' },
          }
        )

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.message || 'Failed to switch HubSpot account')
        }
      },

      onRemove: async (item: HubSpotAccount) => {
        const response = await apiFetch(
          `/api/oauth/hubspot/disconnect?session_id=${sessionId}&hubspot_id=${item.id}`,
          { method: 'DELETE' }
        )

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.message || 'Failed to remove HubSpot account')
        }
      },

      submitLabel: 'Switch Portal',
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

export default HubSpotAccountSelector
