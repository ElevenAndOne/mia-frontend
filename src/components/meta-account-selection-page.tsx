import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useSession } from '../contexts/session-context'
import type { AccountMapping } from '../contexts/session-context'

interface MetaAccountSelectionPageProps {
  onAccountSelected: () => void
  onBack?: () => void
}

const MetaAccountSelectionPage = ({ onAccountSelected, onBack }: MetaAccountSelectionPageProps) => {
  const {
    availableAccounts,
    selectAccount,
    isLoading,
    error,
    clearError,
    metaUser,
    refreshAccounts
  } = useSession()

  const [isSelecting, setIsSelecting] = useState(false)
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Ref to prevent duplicate fetches (React StrictMode calls useEffect twice)
  const hasFetchedRef = useRef(false)

  // Filter to show only Meta accounts (meta_ prefix or has meta_ads_id but no google_ads_id)
  const metaAccounts = availableAccounts.filter(account =>
    account.id.startsWith('meta_') ||
    (account.meta_ads_id && !account.google_ads_id)
  )

  // Fetch accounts on mount (only once)
  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // NOTE: Auto-select removed for Meta-first flow
  // Users should always see the account selection page to confirm their choice
  // This is different from Google flow which auto-selects single accounts

  // When accounts change, stop showing loading
  useEffect(() => {
    if (availableAccounts.length > 0 && isFetchingAccounts) {
      console.log('[META-ACCOUNT-SELECTION] Accounts loaded:', availableAccounts.length, 'total,', metaAccounts.length, 'Meta accounts')
      setIsFetchingAccounts(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableAccounts])

  const fetchAccounts = async () => {
    try {
      setIsFetchingAccounts(true)
      setFetchError(null)

      console.log('[META-ACCOUNT-SELECTION] Refreshing accounts...')
      // Refresh available accounts from SessionContext (uses /api/accounts/available)
      await refreshAccounts()
      // Note: availableAccounts won't be updated yet due to React async state
      // The useEffect above will handle updating isFetchingAccounts when accounts load
    } catch (err) {
      console.error('[META-ACCOUNT-SELECTION] Error fetching accounts:', err)
      setFetchError('Failed to load accounts. Please try again.')
      setIsFetchingAccounts(false)
    }
  }

  const handleAccountSelect = async (account: AccountMapping) => {
    if (isSelecting) return

    setIsSelecting(true)
    clearError()

    try {
      console.log('[META-ACCOUNT-SELECTION] Selecting Meta account:', account.id, account.name)

      // Use existing selectAccount from SessionContext (calls /api/accounts/select)
      const success = await selectAccount(account.id)

      if (success) {
        console.log('[META-ACCOUNT-SELECTION] Account selected successfully')
        // Proceed to onboarding
        onAccountSelected()
      } else {
        throw new Error('Failed to select account')
      }

    } catch (err) {
      console.error('[META-ACCOUNT-SELECTION] Error selecting account:', err)
      setFetchError(err instanceof Error ? err.message : 'Failed to select account')
    } finally {
      setIsSelecting(false)
    }
  }

  if (isFetchingAccounts || (isLoading && metaAccounts.length === 0)) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center" style={{ maxWidth: '393px', margin: '0 auto' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Meta Ad accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white overflow-y-auto" style={{ maxWidth: '393px', margin: '0 auto' }}>
      {/* Header */}
      <div className="px-6 pt-4 pb-4 text-center">
        {onBack && (
          <div className="flex justify-start mb-2">
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* Meta logo/icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="w-12 h-12 rounded-full mx-auto mb-2 bg-blue-100 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7">
              <path fill="#0866FF" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </motion.div>

          <h1 className="text-xl font-semibold text-black mb-1">
            Welcome{metaUser?.name ? `, ${metaUser.name}` : ''}!
          </h1>

          <p className="text-gray-600 text-sm">
            Select your Meta Ad account to analyze
          </p>
        </motion.div>
      </div>

      {/* Error Display */}
      {(error || fetchError) && (
        <div className="mx-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <p className="text-red-600 text-sm">{error || fetchError}</p>
          </motion.div>
        </div>
      )}

      {/* Account Selection */}
      <div className="px-6 pb-8">
        {metaAccounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Meta Ad Accounts Found</h3>
            <p className="text-gray-600 text-sm">
              Make sure you have access to at least one Meta Ads account.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {metaAccounts.map((account, index) => (
              <motion.button
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
                onClick={() => handleAccountSelect(account)}
                disabled={isSelecting}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  isSelecting
                    ? 'opacity-60 cursor-not-allowed'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-medium text-white bg-blue-500"
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {account.name}
                      </h3>
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>

                    <p className="text-sm text-gray-600 mb-1">
                      Meta Ads Account
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {account.meta_ads_id && (
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
                          </svg>
                          ID: {account.meta_ads_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isSelecting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 flex items-center justify-center"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600">Connecting...</span>
                    </div>
                  </motion.div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default MetaAccountSelectionPage
