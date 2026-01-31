import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession, type AccountMapping } from '../contexts/session-context'
import { apiFetch } from '../utils/api'
import LoadingScreen from './loading-screen'

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
 * - For users with 2+ MCCs: Shows accordion-style MCC selection with inline sub-accounts
 * - Standalone accounts shown in separate section below MCCs
 * - For non-MCC users: Shows accounts directly
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
    setSelectedMCC(null)
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
    <div className="w-full h-full bg-primary overflow-y-auto" style={{ maxWidth: '393px', margin: '0 auto' }}>
      {/* Header */}
      <div className="px-6 pt-4 pb-4 text-center">
        {onBack && (
          <div className="flex justify-start mb-2">
            <button
              onClick={onBack}
              className="p-1 hover:bg-tertiary rounded-full transition-colors"
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
              className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-secondary"
            />
          )}

          <h1 className="title-h6 text-primary mb-1">
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
            className="bg-error-primary border border-error-subtle rounded-lg p-4"
          >
            <p className="paragraph-sm text-error">{error}</p>
          </motion.div>
        </div>
      )}

      {/* STEP 1: MCC Selection (only show if user has 2+ MCCs) */}
      {showMCCStep && (
        <div className="px-6 pb-4">
          <div className="mb-3">
            <h2 className="label-md text-primary">Step 1: Select Manager Account</h2>
            <p className="paragraph-sm text-quaternary">Choose which Manager Account to use</p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {mccAccounts.map((mcc, index) => {
              const isSelected = selectedMCC === mcc.customer_id
              // Get sub-accounts for this MCC
              const mccSubAccounts = availableAccounts.filter(a =>
                mcc.sub_account_ids?.includes(a.google_ads_id || '') &&
                a.google_ads_account_type !== 'mcc'
              )

              return (
                <motion.div
                  key={mcc.customer_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  className="space-y-2"
                >
                  {/* MCC Header - clickable to expand/collapse */}
                  <div
                    onClick={() => isSelected ? handleMCCDeselect() : handleMCCSelect(mcc.customer_id)}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all text-left cursor-pointer
                      ${isSelected
                        ? 'border-brand bg-brand-primary'
                        : 'border-secondary hover:border-primary hover:bg-secondary'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-quaternary flex items-center justify-center paragraph-bg">
                          🏢
                        </div>
                        <div>
                          <h3 className="subheading-bg text-primary">{mcc.descriptive_name}</h3>
                          <p className="paragraph-sm text-quaternary">
                            {mccSubAccounts.length} Account{mccSubAccounts.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {/* Chevron - rotates when expanded */}
                      <svg
                        className={`w-5 h-5 text-placeholder-subtle transition-transform duration-200 ${isSelected ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Sub-accounts - expand inline when MCC is selected */}
                  <AnimatePresence>
                    {isSelected && mccSubAccounts.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pl-4 space-y-2 overflow-hidden"
                      >
                        {mccSubAccounts.map((account) => {
                          const isThisAccountSelecting = selectingAccountId === account.id
                          return (
                            <button
                              key={account.id}
                              onClick={() => handleAccountSelect(account)}
                              disabled={!!selectingAccountId}
                              className={`
                                w-full p-3 rounded-lg border transition-all text-left
                                ${selectingAccountId && !isThisAccountSelecting
                                  ? 'opacity-60 cursor-not-allowed border-secondary'
                                  : 'border-secondary hover:border-brand-alt hover:bg-brand-primary'
                                }
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center paragraph-sm"
                                    style={{ backgroundColor: account.color || 'var(--background-color-quaternary)' }}
                                  >
                                    📊
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="subheading-md text-primary truncate">{account.name}</h4>
                                    <p className="paragraph-xs text-quaternary">Ads: {account.google_ads_id}</p>
                                  </div>
                                </div>
                                {isThisAccountSelecting ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-utility-brand-600" />
                                ) : (
                                  <svg className="w-4 h-4 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Standalone Accounts - shown at Step 1 level, selectable without choosing an MCC */}
          {availableAccounts.filter(a =>
            a.google_ads_account_type === 'standalone' &&
            (a.id.startsWith('google_') || a.id.startsWith('user_'))
          ).length > 0 && (
            <div className="mt-6 pt-4 border-t border-secondary">
              <h3 className="subheading-md text-quaternary mb-3">Standalone Accounts</h3>
              <div className="space-y-3">
                {availableAccounts
                  .filter(a => a.google_ads_account_type === 'standalone' && (a.id.startsWith('google_') || a.id.startsWith('user_')))
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
                            ? 'opacity-60 cursor-not-allowed border-secondary'
                            : 'border-secondary hover:border-primary hover:bg-secondary'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center paragraph-bg"
                              style={{ backgroundColor: account.color || 'var(--background-color-quaternary)' }}
                            >
                              🏢
                            </div>
                            <div className="min-w-0">
                              <h3 className="subheading-bg text-primary truncate">{account.name}</h3>
                              <p className="paragraph-xs text-quaternary">Standalone Account • Ads: {account.google_ads_id}</p>
                            </div>
                          </div>
                          {isThisAccountSelecting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-utility-brand-600" />
                          ) : (
                            <svg className="w-5 h-5 text-placeholder-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Direct Account Selection (for users without multiple MCCs) */}
      {!showMCCStep && (
        <div className="px-6 pb-8">
          <div className="mb-3">
            <p className="paragraph-sm text-quaternary">Select the account you'd like to analyze</p>
          </div>

          {availableAccounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="title-h2 mb-3">📊</div>
              <h3 className="subheading-bg text-primary mb-1">No Accounts Available</h3>
              <p className="paragraph-sm text-tertiary">
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
                  return isValidType
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
                          ? 'opacity-60 cursor-not-allowed border-secondary'
                          : 'border-secondary hover:border-primary hover:bg-secondary'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center paragraph-bg"
                            style={{ backgroundColor: account.color || 'var(--background-color-quaternary)' }}
                          >
                            {getAccountIcon(account.business_type)}
                          </div>

                          <div className="min-w-0">
                            <h3 className="subheading-bg text-primary truncate">
                              {account.name}
                            </h3>
                            <p className="paragraph-sm text-quaternary">
                              {account.google_ads_id ? `Ads: ${account.google_ads_id}` :
                               account.meta_ads_id ? `Meta: ${account.meta_ads_id}` :
                               'Account'}
                            </p>
                          </div>
                        </div>

                        <svg className="w-5 h-5 text-placeholder-subtle shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>

                      {isThisAccountSelecting && (
                        <div className="mt-3 flex items-center justify-center">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            <span className="paragraph-sm text-tertiary">Connecting...</span>
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CombinedAccountSelection
