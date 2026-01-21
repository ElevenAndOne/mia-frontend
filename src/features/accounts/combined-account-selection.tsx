import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession, AccountMapping } from '../../shared/contexts/SessionContext'
import { apiFetch } from '../../shared/utils/api'
import LoadingScreen from '../../shared/components/loading-screen'

interface CombinedAccountSelectionProps {
  onAccountSelected: () => void
  onBack?: () => void
}

interface MCCAccount {
  customer_id: string
  descriptive_name: string
  account_count: number
  manager: boolean
  sub_account_ids?: string[]  // List of sub-account customer IDs for this MCC
}

/**
 * Combined MCC + Account Selection page
 * - Step 1: MCC profiles (only for users with 2+ MCCs)
 * - Step 2: Slides up after MCC selection
 * - For non-MCC users, shows accounts directly
 */
const CombinedAccountSelection = ({ onAccountSelected, onBack }: CombinedAccountSelectionProps) => {
  const {
    availableAccounts,
    selectAccount,
    isLoading,
    error,
    clearError,
    user,
    refreshAccounts,
    sessionId
  } = useSession()

  const [selectingAccountId, setSelectingAccountId] = useState<string | null>(null)
  const [mccAccounts, setMccAccounts] = useState<MCCAccount[]>([])
  const [selectedMCC, setSelectedMCC] = useState<string | null>(null)
  const [isFetchingMCCs, setIsFetchingMCCs] = useState(true)
  const [step2Visible, setStep2Visible] = useState(false)

  // Ref to prevent duplicate fetches
  const hasFetchedRef = useRef(false)

  // Fetch MCC accounts on mount
  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchMCCAccounts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-select MCC if there's only one
  useEffect(() => {
    if (mccAccounts.length === 1 && !selectedMCC) {
      handleMCCSelect(mccAccounts[0].customer_id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mccAccounts])

  // Auto-select and proceed if there's only one user-based account (no Google Ads)
  useEffect(() => {
    if (!isFetchingMCCs && mccAccounts.length === 0 && availableAccounts.length === 1) {
      const account = availableAccounts[0]
      if (account.id.startsWith('user_')) {
        console.log('[ACCOUNT-SELECTION] Auto-selecting user-based account:', account.name)
        selectAccount(account.id).then((success) => {
          if (success) onAccountSelected()
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetchingMCCs, mccAccounts, availableAccounts])

  // Load available accounts after MCC is selected
  useEffect(() => {
    if (selectedMCC && availableAccounts.length === 0) {
      refreshAccounts()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMCC])

  // Show Step 2 with small delay for smooth animation
  useEffect(() => {
    if (selectedMCC || mccAccounts.length <= 1) {
      const timer = setTimeout(() => setStep2Visible(true), 100)
      return () => clearTimeout(timer)
    } else {
      setStep2Visible(false)
    }
  }, [selectedMCC, mccAccounts.length])

  const fetchMCCAccounts = async () => {
    try {
      setIsFetchingMCCs(true)
      const userId = user?.google_user_id
      if (!userId) {
        console.error('[ACCOUNT-SELECTION] Cannot fetch accounts: no user_id')
        return
      }

      const url = `/api/oauth/google/ad-accounts?user_id=${encodeURIComponent(userId)}`
      const response = await apiFetch(url, { method: 'GET' })

      if (!response.ok) throw new Error('Failed to fetch accounts')

      const data = await response.json()
      if (data.success) {
        setMccAccounts(data.mcc_accounts || [])
        console.log('[ACCOUNT-SELECTION] Fetched MCCs:', data.mcc_accounts)
      }
    } catch (err) {
      console.error('[ACCOUNT-SELECTION] Error fetching MCCs:', err)
    } finally {
      setIsFetchingMCCs(false)
    }
  }

  const handleMCCSelect = async (mccId: string) => {
    try {
      setSelectedMCC(mccId)

      if (sessionId) {
        const response = await apiFetch('/api/session/select-mcc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, mcc_id: mccId }),
        })

        if (!response.ok) {
          console.error('[ACCOUNT-SELECTION] Failed to store MCC selection')
        } else {
          console.log('[ACCOUNT-SELECTION] Stored MCC selection:', mccId)
        }
      }
    } catch (err) {
      console.error('[ACCOUNT-SELECTION] Error selecting MCC:', err)
    }
  }

  const handleMCCDeselect = () => {
    setStep2Visible(false)
    // Small delay before actually deselecting for smooth animation
    setTimeout(() => setSelectedMCC(null), 300)
  }

  const handleAccountSelect = async (account: AccountMapping) => {
    if (selectingAccountId) return
    setSelectingAccountId(account.id)
    clearError()

    try {
      const success = await selectAccount(account.id)
      if (success) onAccountSelected()
    } catch (err) {
      console.error('[ACCOUNT-SELECTION] Error selecting account:', err)
    } finally {
      setSelectingAccountId(null)
    }
  }

  const getAccountIcon = (businessType: string) => {
    switch (businessType?.toLowerCase()) {
      case 'food': return '🍎'
      case 'engineering': return '⚙️'
      case 'retail': return '🏪'
      default: return '🏢'
    }
  }

  // Whether to show MCC selection (Step 1)
  const showMCCStep = mccAccounts.length > 1

  // Loading state - show while fetching MCCs or accounts
  if (isFetchingMCCs || (isLoading && availableAccounts.length === 0)) {
    return <LoadingScreen platform="google" />
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
          {user?.picture_url && (
            <motion.img
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              src={user.picture_url}
              alt={user.name}
              className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-gray-200"
            />
          )}

          <h1 className="text-xl font-semibold text-black mb-1">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>
        </motion.div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <p className="text-red-600 text-sm">{error}</p>
          </motion.div>
        </div>
      )}

      {/* STEP 1: MCC Selection (only show if user has 2+ MCCs) */}
      {showMCCStep && (
        <div className="px-6 pb-4">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900">Step 1: Select Manager Account</h2>
            <p className="text-sm text-gray-500">Choose which Manager Account to use</p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {mccAccounts.map((mcc, index) => {
              const isSelected = selectedMCC === mcc.customer_id

              return (
                <motion.div
                  key={mcc.customer_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  onClick={() => !isSelected && handleMCCSelect(mcc.customer_id)}
                  className={`
                    w-full p-4 rounded-xl border-2 transition-all text-left cursor-pointer
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                        🏢
                      </div>

                      <div>
                        <h3 className="font-medium text-gray-900">
                          {mcc.descriptive_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {(() => {
                            // Show count of accounts we actually have set up, not MCC's total
                            const availableCount = mcc.sub_account_ids?.filter(id =>
                              availableAccounts.some(a => a.google_ads_id === id)
                            ).length ?? mcc.account_count
                            return `${availableCount} Account${availableCount !== 1 ? 's' : ''}`
                          })()}
                        </p>
                      </div>
                    </div>

                    {/* Right side: Checkmark + Gear when selected, Chevron when not */}
                    {isSelected ? (
                      <div className="flex items-center gap-2">
                        {/* Checkmark */}
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        {/* Gear icon */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMCCDeselect()
                          }}
                          className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                        >
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      )}

      {/* Divider (only when Step 2 visible and there was MCC step) */}
      <AnimatePresence>
        {step2Visible && showMCCStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 mx-6 my-4"
          />
        )}
      </AnimatePresence>

      {/* STEP 2: Account Selection (slides up after MCC selected) */}
      <AnimatePresence>
        {step2Visible && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="px-6 pb-8"
          >
            {showMCCStep && (
              <div className="mb-3">
                <h2 className="text-base font-semibold text-gray-900">Step 2: Select Marketing Account</h2>
                <p className="text-sm text-gray-500">Choose the account you'd like to analyze</p>
              </div>
            )}

            {!showMCCStep && (
              <div className="mb-3">
                <p className="text-sm text-gray-500">Select the account you'd like to analyze</p>
              </div>
            )}

            {availableAccounts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">📊</div>
                <h3 className="text-base font-medium text-gray-900 mb-1">No Accounts Available</h3>
                <p className="text-gray-600 text-sm">
                  Please contact support to set up your marketing accounts.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableAccounts
                  .filter(account => {
                    // Filter out MCC accounts
                    if (account.google_ads_account_type === 'mcc') return false

                    // Basic type check
                    const isValidType = account.id.startsWith('google_') || account.id.startsWith('user_') || account.id.startsWith('meta_')
                    if (!isValidType) return false

                    // If user has multiple MCCs and selected one, filter strictly by that MCC's sub-accounts
                    if (selectedMCC && showMCCStep) {
                      const selectedMCCData = mccAccounts.find(m => m.customer_id === selectedMCC)
                      if (selectedMCCData?.sub_account_ids?.length) {
                        // Only show accounts that belong to the selected MCC
                        return selectedMCCData.sub_account_ids.includes(account.google_ads_id || '')
                      }
                      // MCC selected but no sub_account_ids data - show nothing
                      return false
                    }

                    // For non-MCC users, show all accounts
                    return true
                  })
                  .map((account) => {
                    const isThisAccountSelecting = selectingAccountId === account.id
                    return (
                      <button
                        key={account.id}
                        onClick={() => handleAccountSelect(account)}
                        disabled={!!selectingAccountId}
                        className={`
                          w-full p-4 rounded-xl border-2 transition-all text-left
                          ${selectingAccountId && !isThisAccountSelecting
                            ? 'opacity-60 cursor-not-allowed border-gray-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                              style={{ backgroundColor: account.color || '#E5E7EB' }}
                            >
                              {getAccountIcon(account.business_type)}
                            </div>

                            <div className="min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {account.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {account.google_ads_id ? `Ads: ${account.google_ads_id}` :
                                 account.meta_ads_id ? `Meta: ${account.meta_ads_id}` :
                                 'Account'}
                              </p>
                            </div>
                          </div>

                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>

                        {isThisAccountSelecting && (
                          <div className="mt-3 flex items-center justify-center">
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                              <span className="text-sm text-gray-600">Connecting...</span>
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CombinedAccountSelection
