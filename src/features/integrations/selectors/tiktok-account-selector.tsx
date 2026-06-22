import { useState, useEffect } from 'react'
import { apiFetch } from '../../../utils/api'
import { useSession } from '../../../contexts/session-context'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'

interface TikTokAdvertiser {
  id: string
  name: string
}

interface TikTokAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentAccountData?: {
    tiktok_advertiser_id?: string
  } | null
}

const TikTokAccountSelector = ({
  isOpen,
  onClose,
  onSuccess,
  currentAccountData,
}: TikTokAccountSelectorProps) => {
  const { sessionId } = useSession()
  const [advertisers, setAdvertisers] = useState<TikTokAdvertiser[]>([])

  const [state, actions] = useSelectorState<string>({
    onSuccess,
    onClose,
  })

  useEffect(() => {
    if (isOpen) {
      actions.resetState()
      fetchTikTokAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchTikTokAccounts = async () => {
    actions.setIsLoading(true)
    actions.setError(null)

    try {
      const response = await apiFetch('/api/oauth/tiktok/accounts', {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId || 'default',
        },
      })

      const data = await response.json()

      if (data.success) {
        setAdvertisers(data.advertisers || [])

        // Pre-select previously linked advertiser, or auto-select the only one
        if (currentAccountData?.tiktok_advertiser_id) {
          actions.setSelectedId(currentAccountData.tiktok_advertiser_id)
        } else if (data.advertisers?.length === 1) {
          actions.setSelectedId(data.advertisers[0].id)
        }
      } else {
        actions.setError(data.error || 'Failed to fetch TikTok accounts')
      }
    } catch {
      actions.setError('Failed to load TikTok accounts. Please try again.')
    } finally {
      actions.setIsLoading(false)
    }
  }

  const handleLinkAccount = async () => {
    if (!state.selectedId) {
      actions.setError('Please select an advertiser account')
      return
    }

    await actions.withSubmitting(async () => {
      const response = await apiFetch('/api/oauth/tiktok/link-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default',
        },
        body: JSON.stringify({
          advertiser_id: state.selectedId,
          advertiser_name: advertisers.find((a) => a.id === state.selectedId)?.name || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        actions.handleSuccess()
      } else {
        throw new Error(data.message || 'Failed to link TikTok account')
      }
    })
  }

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="TikTok Advertisers"
      subtitle="Select the TikTok Ads advertiser account to connect"
      icon={
        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      }
      iconBgColor="bg-gray-100"
      isLoading={state.isLoading}
      loadingMessage="Discovering TikTok advertisers..."
      error={state.error}
      success={state.success}
      successMessage="TikTok account linked!"
      isEmpty={advertisers.length === 0}
      emptyMessage="No TikTok advertisers found."
      emptySubMessage="Make sure your TikTok app has been granted advertiser access."
      isSubmitting={state.isSubmitting}
      onSubmit={handleLinkAccount}
      submitLabel="Link Account"
      submitLoadingLabel="Linking..."
      submitDisabled={!state.selectedId}
      accentColor="black"
    >
      <div className="space-y-4 max-h-72 overflow-y-auto">
        {advertisers.length > 0 && (
          <div>
            <h4 className="label-sm text-secondary mb-2">Advertiser Accounts</h4>
            <div className="space-y-2">
              {advertisers.map((advertiser) => (
                <SelectorItem
                  key={advertiser.id}
                  isSelected={state.selectedId === advertiser.id}
                  onSelect={() => actions.setSelectedId(advertiser.id)}
                  title={advertiser.name}
                  subtitle={`ID: ${advertiser.id}`}
                  accentColor="black"
                  selectionStyle="radio"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AccountSelectorModal>
  )
}

export default TikTokAccountSelector
