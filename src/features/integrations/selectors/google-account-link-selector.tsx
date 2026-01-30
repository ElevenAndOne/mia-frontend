/**
 * GoogleAccountLinkSelector - For Meta-first users connecting Google during onboarding
 *
 * This is different from GoogleAccountSelector which SWITCHES accounts.
 * This component LINKS a Google Ads account to the existing selected Meta account.
 */

import { useState, useEffect } from 'react'
import { useSession } from '../../../contexts/session-context'
import { apiFetch } from '../../../utils/api'
import { ModalShell } from '../../../components/modal-shell'

interface GoogleAccount {
  customer_id: string
  descriptive_name: string
  manager: boolean
  login_customer_id?: string
}

interface GoogleAccountLinkSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (linkedAccountId: string) => void
}

const GoogleAccountLinkSelector = ({ isOpen, onClose, onSuccess }: GoogleAccountLinkSelectorProps) => {
  const { sessionId, selectedAccount, refreshAccounts, user } = useSession()
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([])
  const [selectedGoogleId, setSelectedGoogleId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch Google Ads accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchGoogleAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchGoogleAccounts is intentionally omitted to prevent re-fetching on every render
  }, [isOpen])

  const fetchGoogleAccounts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // First refresh accounts to trigger Google Ads discovery
      await refreshAccounts()

      // Get user_id from session - required for the ad-accounts endpoint
      // Wait for google_user_id to be available (state update timing issue after OAuth)
      let userId = user?.google_user_id
      if (!userId) {
        console.log('[GoogleAccountLinkSelector] Waiting for google_user_id to be available...')
        // Poll for up to 5 seconds (10 attempts at 500ms intervals)
        for (let i = 0; i < 10 && !userId; i++) {
          await new Promise(resolve => setTimeout(resolve, 500))
          // Re-check - note: this requires the component to re-render with new user state
          // So we'll try fetching from status endpoint directly instead
          try {
            const statusResponse = await apiFetch('/api/oauth/google/status', {
              headers: { 'X-Session-ID': sessionId || '' }
            })
            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              if (statusData.authenticated && (statusData.user_info?.id || statusData.user_id)) {
                userId = statusData.user_info?.id || statusData.user_id
                console.log('[GoogleAccountLinkSelector] Got user_id from status:', userId)
                break
              }
            }
          } catch {
            console.log('[GoogleAccountLinkSelector] Status check attempt', i + 1, 'failed')
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
        headers: { 'X-Session-ID': sessionId || '' }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.ad_accounts) {
          setGoogleAccounts(data.ad_accounts)
          // Auto-select if only one account
          if (data.ad_accounts.length === 1) {
            setSelectedGoogleId(data.ad_accounts[0].customer_id)
          }
        } else {
          setError('No Google Ads accounts found')
        }
      } else {
        setError('Failed to fetch Google Ads accounts')
      }
    } catch (err) {
      console.error('Error fetching Google accounts:', err)
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
      // Find the selected Google account to get login_customer_id if needed
      const selectedGoogle = googleAccounts.find(a => a.customer_id === selectedGoogleId)

      // Call backend to link Google Ads to the selected Meta account
      const response = await apiFetch('/api/accounts/link-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || ''
        },
        body: JSON.stringify({
          google_ads_customer_id: selectedGoogleId,
          login_customer_id: selectedGoogle?.login_customer_id,
          target_account_id: selectedAccount.id
        })
      })

      if (response.ok) {
        // Refresh accounts to get updated data
        await refreshAccounts()
        onSuccess(selectedGoogleId)
        onClose()
      } else {
        const data = await response.json()
        setError(data.detail || 'Failed to link Google Ads account')
      }
    } catch (err) {
      console.error('Error linking Google account:', err)
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
    <ModalShell isOpen={isOpen} onClose={handleClose} panelClassName="max-w-md p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Select Google Ads Account</h2>
                  <p className="text-sm text-gray-500">Link to your {selectedAccount?.name || 'account'}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isLinking}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Loading State */}
              {isLoading && (
                <div className="py-8 text-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading Google Ads accounts...</p>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Account Selection */}
              {!isLoading && googleAccounts.length > 0 && (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {googleAccounts.map((account) => {
                      const isSelected = selectedGoogleId === account.customer_id
                      return (
                        <div
                          key={account.customer_id}
                          onClick={() => setSelectedGoogleId(account.customer_id)}
                          className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {account.descriptive_name || `Account ${account.customer_id}`}
                              </p>
                              <p className="text-sm text-gray-500">
                                ID: {account.customer_id}
                                {account.manager && ' (Manager Account)'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      This Google Ads account will be linked to your Meta account for cross-platform insights.
                    </p>
                  </div>
                </>
              )}

              {/* No Accounts */}
              {!isLoading && googleAccounts.length === 0 && !error && (
                <div className="py-8 text-center">
                  <p className="text-gray-600">No Google Ads accounts found</p>
                  <p className="text-sm text-gray-500 mt-2">Make sure you have access to Google Ads</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isLoading && googleAccounts.length > 0 && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleClose}
                  disabled={isLinking}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkAccount}
                  disabled={!selectedGoogleId || isLinking}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLinking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Linking...
                    </>
                  ) : (
                    'Link Account'
                  )}
                </button>
              </div>
            )}
    </ModalShell>
  )
}

export default GoogleAccountLinkSelector
