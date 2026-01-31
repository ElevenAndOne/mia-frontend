/**
 * GoogleAccountLinkSelector - For Meta-first users connecting Google during onboarding
 *
 * This is different from GoogleAccountSelector which SWITCHES accounts.
 * This component LINKS a Google Ads account to the existing selected Meta account.
 */

import { useState, useEffect } from 'react'
import { useSession } from '../../../contexts/session-context'
import { apiFetch } from '../../../utils/api'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import type { GoogleAccount } from '../types'

interface GoogleAccountLinkSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (linkedAccountId: string) => void
}

function GoogleIcon() {
  return (
    <svg className="w-6 h-6 text-utility-info-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  )
}

const GoogleAccountLinkSelector = ({
  isOpen,
  onClose,
  onSuccess,
}: GoogleAccountLinkSelectorProps) => {
  const { sessionId, selectedAccount, refreshAccounts, user } = useSession()
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([])
  const [selectedGoogleId, setSelectedGoogleId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchGoogleAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchGoogleAccounts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // First refresh accounts to trigger Google Ads discovery
      await refreshAccounts()

      // Get user_id from session - required for the ad-accounts endpoint
      let userId = user?.google_user_id
      if (!userId) {
        // Poll for up to 5 seconds (10 attempts at 500ms intervals)
        for (let i = 0; i < 10 && !userId; i++) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          try {
            const statusResponse = await apiFetch('/api/oauth/google/status', {
              headers: { 'X-Session-ID': sessionId || '' },
            })
            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              if (statusData.authenticated && (statusData.user_info?.id || statusData.user_id)) {
                userId = statusData.user_info?.id || statusData.user_id
                break
              }
            }
          } catch {
            // Continue polling
          }
        }

        if (!userId) {
          setError('User not authenticated with Google. Please try again.')
          setIsLoading(false)
          return
        }
      }

      // Fetch discovered Google Ads accounts from the ad-accounts endpoint
      const response = await apiFetch(`/api/oauth/google/ad-accounts?user_id=${userId}`, {
        headers: { 'X-Session-ID': sessionId || '' },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.ad_accounts) {
          setGoogleAccounts(data.ad_accounts)
          if (data.ad_accounts.length === 1) {
            setSelectedGoogleId(data.ad_accounts[0].customer_id)
          }
        } else {
          setError('No Google Ads accounts found')
        }
      } else {
        setError('Failed to fetch Google Ads accounts')
      }
    } catch {
      setError('Failed to load Google Ads accounts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkAccount = async () => {
    if (!selectedGoogleId || !selectedAccount) {
      setError('Please select a Google Ads account')
      return
    }

    setIsLinking(true)
    setError(null)

    try {
      const selectedGoogle = googleAccounts.find((a) => a.customer_id === selectedGoogleId)

      const response = await apiFetch('/api/accounts/link-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || '',
        },
        body: JSON.stringify({
          google_ads_customer_id: selectedGoogleId,
          login_customer_id: selectedGoogle?.login_customer_id,
          target_account_id: selectedAccount.id,
        }),
      })

      if (response.ok) {
        await refreshAccounts()
        onSuccess(selectedGoogleId)
        onClose()
      } else {
        const data = await response.json()
        setError(data.detail || 'Failed to link Google Ads account')
      }
    } catch {
      setError('Failed to link Google Ads account')
    } finally {
      setIsLinking(false)
    }
  }

  const handleClose = () => {
    if (!isLinking) {
      setSelectedGoogleId(null)
      setError(null)
      onClose()
    }
  }

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Select Google Ads Account"
      subtitle={`Link to your ${selectedAccount?.name || 'account'}`}
      icon={<GoogleIcon />}
      iconBgColor="bg-utility-info-200"
      isLoading={isLoading}
      loadingMessage="Loading Google Ads accounts..."
      error={error}
      success={false}
      isEmpty={googleAccounts.length === 0}
      emptyMessage="No Google Ads accounts found"
      emptySubMessage="Make sure you have access to Google Ads"
      isSubmitting={isLinking}
      onSubmit={handleLinkAccount}
      submitLabel="Link Account"
      submitLoadingLabel="Linking..."
      submitDisabled={!selectedGoogleId}
      accentColor="blue"
    >
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {googleAccounts.map((account) => (
          <SelectorItem
            key={account.customer_id}
            isSelected={selectedGoogleId === account.customer_id}
            onSelect={() => setSelectedGoogleId(account.customer_id)}
            title={account.descriptive_name || `Account ${account.customer_id}`}
            subtitle={`ID: ${account.customer_id}${account.manager ? ' (Manager Account)' : ''}`}
            accentColor="blue"
          />
        ))}
      </div>

      <div className="bg-utility-info-100 border border-utility-info-300 rounded-lg p-3 mt-4">
        <p className="paragraph-xs text-utility-info-700">
          This Google Ads account will be linked to your Meta account for cross-platform insights.
        </p>
      </div>
    </AccountSelectorModal>
  )
}

export default GoogleAccountLinkSelector
