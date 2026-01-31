import { useState, useEffect } from 'react'
import { apiFetch } from '../../../utils/api'
import { useSession } from '../../../contexts/session-context'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'
import type { FacebookPage } from '../types'

interface FacebookPageSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentAccountName?: string
  currentAccountData?: { id?: string | number; name?: string; facebook_page_id?: string } | null
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
  const [pages, setPages] = useState<FacebookPage[]>([])

  const [state, actions] = useSelectorState<string>({
    onSuccess,
    onClose,
    successDelay: 1500,
  })

  useEffect(() => {
    if (isOpen) {
      fetchFacebookPages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchFacebookPages = async (forceRefresh: boolean = false) => {
    actions.setIsLoading(true)
    actions.setError(null)

    try {
      const url = forceRefresh
        ? '/api/oauth/meta/organic/facebook-pages?refresh=true'
        : '/api/oauth/meta/organic/facebook-pages'

      const response = await apiFetch(url, {
        headers: {
          'X-Session-ID': sessionId || 'default',
        },
      })

      const data = await response.json()

      if (data.success && data.facebook_pages) {
        const sortedPages = data.facebook_pages.sort((a: FacebookPage, b: FacebookPage) =>
          a.name.localeCompare(b.name)
        )
        setPages(sortedPages)

        if (accountToUse?.facebook_page_id) {
          actions.setSelectedId(accountToUse.facebook_page_id)
        }
      } else {
        actions.setError('Failed to fetch Facebook Pages')
      }
    } catch {
      actions.setError('Failed to load Facebook Pages. Please try again.')
    } finally {
      actions.setIsLoading(false)
    }
  }

  const handleLinkPage = async () => {
    if (!accountToUse) {
      actions.setError('No account selected')
      return
    }

    await actions.withSubmitting(async () => {
      const selectedPage = state.selectedId ? pages.find((p) => p.id === state.selectedId) : null

      const response = await apiFetch('/api/oauth/meta/organic/link-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default',
        },
        body: JSON.stringify({
          page_id: state.selectedId || '',
          page_name: selectedPage?.name || '',
          page_access_token: selectedPage?.access_token || '',
          account_id: accountToUse.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to link Facebook Page')
      }

      const data = await response.json()

      if (data.success) {
        actions.handleSuccess()
      } else {
        throw new Error(data.message || 'Failed to link Facebook Page')
      }
    })
  }

  const formatFollowers = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toLocaleString()
  }

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="Link Facebook Page"
      subtitle={currentAccountName ? `to ${currentAccountName}` : undefined}
      icon={<img src="/icons/facebook.png" alt="Facebook" className="w-6 h-6" />}
      iconBgColor="bg-blue-100"
      isLoading={state.isLoading}
      loadingMessage="Loading your Facebook Pages..."
      error={state.error}
      success={state.success}
      successMessage="Facebook Page linked successfully!"
      isEmpty={pages.length === 0}
      emptyMessage="No Facebook Pages found"
      emptySubMessage="Make sure you have access to at least one Facebook Page"
      isSubmitting={state.isSubmitting}
      onSubmit={handleLinkPage}
      submitLabel={`Apply (${state.selectedId ? '1' : '0'})`}
      submitLoadingLabel="Applying..."
      accentColor="blue"
      headerExtra={
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Select a Facebook Page</label>
          <button
            onClick={() => fetchFacebookPages(true)}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            Refresh list
          </button>
        </div>
      }
    >
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {pages.map((page) => (
          <SelectorItem
            key={page.id}
            isSelected={state.selectedId === page.id}
            onSelect={() =>
              actions.setSelectedId(state.selectedId === page.id ? null : page.id)
            }
            title={page.name}
            subtitle={
              page.fan_count > 0
                ? `${page.category} • ${formatFollowers(page.fan_count)} followers`
                : page.category
            }
            accentColor="blue"
          />
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
        <p className="text-xs text-blue-800">
          Select a Facebook Page to enable organic social insights for your{' '}
          {currentAccountName || 'account'}.
        </p>
      </div>
    </AccountSelectorModal>
  )
}

export default FacebookPageSelector
