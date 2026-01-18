import { useMemo, useRef } from 'react'
import { AccountSelectorModal, SelectableItem } from '@/components/ui'
import { apiFetch } from '@/utils/api'
import { useSession } from '@/contexts/session-context-shim'

interface FacebookPage extends SelectableItem {
  access_token: string
  fan_count: number
  category: string
}

interface AccountData {
  id: string
  name: string
  facebook_page_id?: string
}

interface FacebookPageSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentAccountName?: string
  currentAccountData?: AccountData
}

const FacebookPageSelector = ({
  isOpen,
  onClose,
  onSuccess,
  currentAccountName,
  currentAccountData,
}: FacebookPageSelectorProps) => {
  const { sessionId, selectedAccount } = useSession()
  const accountToUse = currentAccountData || selectedAccount
  const pagesRef = useRef<FacebookPage[]>([])

  const config = useMemo(
    () => ({
      title: 'Link Facebook Page',
      subtitle: currentAccountName ? `to ${currentAccountName}` : undefined,
      icon: (
        <img src="/icons/facebook.png" alt="Facebook" className="w-6 h-6" />
      ),
      iconBgColor: 'bg-blue-100',
      accentColor: 'blue' as const,
      loadingMessage: 'Loading your Facebook Pages...',
      emptyMessage: 'No Facebook Pages found',
      successMessage: 'Facebook Page linked successfully!',
      helperText: `💡 Select a Facebook Page to enable organic social insights for your ${currentAccountName || 'account'}.`,

      fetchAccounts: async (): Promise<FacebookPage[]> => {
        const response = await apiFetch('/api/oauth/meta/organic/facebook-pages', {
          headers: { 'X-Session-ID': sessionId || 'default' },
        })
        const data = await response.json()

        if (data.success && data.facebook_pages) {
          const pages = data.facebook_pages
            .sort((a: any, b: any) => a.name.localeCompare(b.name))
            .map((page: any) => ({
              id: page.id,
              label: page.name,
              description: `${page.category}${page.fan_count > 0 ? ` • ${page.fan_count.toLocaleString()} followers` : ''}`,
              access_token: page.access_token,
              fan_count: page.fan_count,
              category: page.category,
            }))
          pagesRef.current = pages
          return pages
        }
        throw new Error('Failed to fetch Facebook Pages')
      },

      onRefresh: async (): Promise<FacebookPage[]> => {
        const response = await apiFetch('/api/oauth/meta/organic/facebook-pages?refresh=true', {
          headers: { 'X-Session-ID': sessionId || 'default' },
        })
        const data = await response.json()

        if (data.success && data.facebook_pages) {
          const pages = data.facebook_pages
            .sort((a: any, b: any) => a.name.localeCompare(b.name))
            .map((page: any) => ({
              id: page.id,
              label: page.name,
              description: `${page.category}${page.fan_count > 0 ? ` • ${page.fan_count.toLocaleString()} followers` : ''}`,
              access_token: page.access_token,
              fan_count: page.fan_count,
              category: page.category,
            }))
          pagesRef.current = pages
          return pages
        }
        throw new Error('Failed to refresh Facebook Pages')
      },

      getPreSelectedIds: () => {
        return accountToUse?.facebook_page_id ? [accountToUse.facebook_page_id] : []
      },

      onSubmit: async (selectedIds: (string | number)[]) => {
        if (!accountToUse) throw new Error('No account selected')

        const pageId = selectedIds[0] as string
        const selectedPage = pagesRef.current.find((p) => p.id === pageId)

        const response = await apiFetch('/api/oauth/meta/organic/link-page', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId || 'default',
          },
          body: JSON.stringify({
            page_id: pageId || '',
            page_name: selectedPage?.label || '',
            page_access_token: selectedPage?.access_token || '',
            account_id: accountToUse.id,
          }),
        })

        if (!response.ok) throw new Error('Failed to link Facebook Page')

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.message || 'Failed to link Facebook Page')
        }
      },

      submitLabel: (count: number) => `Apply (${count})`,
    }),
    [sessionId, accountToUse, currentAccountName]
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

export default FacebookPageSelector
