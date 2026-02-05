import { useState, useEffect } from 'react'
import { useMiaClient, type FacebookPage as SDKFacebookPage } from '../../../sdk'
import { useSession } from '../../../contexts/session-context'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'
import type { FacebookPage } from '../types'

// Map SDK FacebookPage to local format
const mapFacebookPage = (p: SDKFacebookPage): FacebookPage => ({
  id: p.id,
  name: p.name,
  category: p.category,
  fan_count: p.fanCount,
  link: p.link || '',
  access_token: p.accessToken || '',
})

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
  const mia = useMiaClient()
  const { selectedAccount } = useSession()
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
      const sdkPages = await mia.auth.meta.getFacebookPages(forceRefresh)
      const mappedPages = sdkPages.map(mapFacebookPage)
      const sortedPages = mappedPages.sort((a, b) => a.name.localeCompare(b.name))
      setPages(sortedPages)

      if (accountToUse?.facebook_page_id) {
        actions.setSelectedId(accountToUse.facebook_page_id)
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

      await mia.auth.meta.linkFacebookPage(state.selectedId || '', {
        pageName: selectedPage?.name,
        pageAccessToken: selectedPage?.access_token,
        accountId: accountToUse.id,
      })

      actions.handleSuccess()
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
      iconBgColor="bg-utility-info-200"
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
          <label className="block subheading-md text-secondary">Select a Facebook Page</label>
          <button
            onClick={() => fetchFacebookPages(true)}
            className="paragraph-xs text-utility-info-600 hover:text-utility-info-700 hover:underline"
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

      <div className="bg-utility-info-100 border border-utility-info-300 rounded-lg p-3 mt-4">
        <p className="paragraph-xs text-utility-info-700">
          Select a Facebook Page to enable organic social insights for your{' '}
          {currentAccountName || 'account'}.
        </p>
      </div>
    </AccountSelectorModal>
  )
}

export default FacebookPageSelector
