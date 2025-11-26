import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSession, AccountMapping } from '../contexts/SessionContext'
import { apiFetch } from '../utils/api'

interface AccountSelectionPageProps {
  onAccountSelected: () => void
  onBack?: () => void
}

interface MCCAccount {
  customer_id: string
  descriptive_name: string
  account_count: number
  manager: boolean
}

interface GoogleAdsAccount {
  customer_id: string
  descriptive_name: string
  manager: boolean
}

const AccountSelectionPage = ({ onAccountSelected, onBack }: AccountSelectionPageProps) => {
  const {
    availableAccounts,
    selectedAccount,
    selectAccount,
    isLoading,
    error,
    clearError,
    user,
    refreshAccounts,
    sessionId
  } = useSession()

  const [isSelecting, setIsSelecting] = useState(false)
  const [mccAccounts, setMccAccounts] = useState<MCCAccount[]>([])
  const [selectedMCC, setSelectedMCC] = useState<string | null>(null)
  const [isFetchingMCCs, setIsFetchingMCCs] = useState(true)
  const [industries, setIndustries] = useState<string[]>([])
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const [localSelectedAccount, setLocalSelectedAccount] = useState<AccountMapping | null>(null)

  // Fetch MCC accounts and industries on mount
  useEffect(() => {
    fetchMCCAccounts()
    fetchIndustries()
  }, [])

  // Auto-select MCC if there's only one
  useEffect(() => {
    if (mccAccounts.length === 1 && !selectedMCC) {
      handleMCCSelect(mccAccounts[0].customer_id)
    }
  }, [mccAccounts])

  // Load available accounts after MCC is selected
  useEffect(() => {
    if (selectedMCC && availableAccounts.length === 0) {
      refreshAccounts()
    }
  }, [selectedMCC])

  const fetchMCCAccounts = async () => {
    try {
      setIsFetchingMCCs(true)

      const response = await apiFetch('/api/oauth/google/ad-accounts', {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch accounts')
      }

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

  const fetchIndustries = async () => {
    try {
      const response = await apiFetch('/api/industries', {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch industries')
      }

      const data = await response.json()
      setIndustries(data.industries || [])
      console.log('[ACCOUNT-SELECTION] Fetched industries:', data.industries)
    } catch (err) {
      console.error('[ACCOUNT-SELECTION] Error fetching industries:', err)
    }
  }

  const handleMCCSelect = async (mccId: string) => {
    try {
      setSelectedMCC(mccId)

      // Store selected MCC in session
      if (sessionId) {
        const response = await apiFetch('/api/session/select-mcc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sessionId,
            mcc_id: mccId
          }),
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

  const handleAccountSelect = async (account: AccountMapping) => {
    if (isSelecting) return

    // Validate industry selection
    if (!selectedIndustry) {
      alert('Please select your business industry')
      return
    }

    setIsSelecting(true)
    clearError()

    try {
      const success = await selectAccount(account.id, selectedIndustry)

      if (success) {
        onAccountSelected()
      }
    } catch (err) {
      console.error('[ACCOUNT-SELECTION] Error selecting account:', err)
    } finally {
      setIsSelecting(false)
    }
  }

  const getAccountIcon = (businessType: string) => {
    switch (businessType?.toLowerCase()) {
      case 'food':
        return '🍎'
      case 'engineering':
        return '⚙️'
      case 'retail':
        return '🏪'
      default:
        return '🏢'
    }
  }

  if (isFetchingMCCs || (isLoading && availableAccounts.length === 0)) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center" style={{ maxWidth: '393px', margin: '0 auto' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white flex flex-col" style={{ maxWidth: '393px', margin: '0 auto' }}>
      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center">
        {onBack && (
          <div className="flex justify-start mb-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
              className="w-16 h-16 rounded-full mx-auto mb-4 border-2 border-gray-200"
            />
          )}

          <h1 className="text-2xl font-semibold text-black mb-3">
            Welcome{user?.name ? `, ${user.name}` : ''}!
          </h1>

          <p className="text-gray-600">
            {mccAccounts.length > 1 && !selectedMCC
              ? 'Select your Manager Account first'
              : 'Select the account you\'d like to analyze'}
          </p>
        </motion.div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mb-6">
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
      {mccAccounts.length > 1 && !selectedMCC && (
        <div className="px-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Select Manager Account</h2>
            <p className="text-sm text-gray-600">Choose which Manager Account to use</p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {mccAccounts.map((mcc, index) => (
              <motion.button
                key={mcc.customer_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
                onClick={() => handleMCCSelect(mcc.customer_id)}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-xl">
                    🏢
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {mcc.descriptive_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {mcc.account_count} account{mcc.account_count !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      )}

      {/* STEP 2: Account Selection (show after MCC selected, or if 0-1 MCCs) */}
      {(mccAccounts.length <= 1 || selectedMCC) && (
        <div className="px-6 flex-1 overflow-y-auto">
          {/* Show step header only if there were multiple MCCs */}
          {mccAccounts.length > 1 && selectedMCC && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Select Marketing Account</h2>
              <div className="flex items-center text-sm text-gray-600">
                <span>Using: {mccAccounts.find(m => m.customer_id === selectedMCC)?.descriptive_name}</span>
                <button
                  onClick={() => setSelectedMCC(null)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  (change)
                </button>
              </div>
            </div>
          )}

          {availableAccounts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Accounts Available</h3>
              <p className="text-gray-600 text-sm">
                Please contact support to set up your marketing accounts.
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {availableAccounts
                .filter(account => account.id.startsWith('google_') || account.id.startsWith('meta_'))  // Show Google and Meta accounts
                .map((account, index) => (
                <motion.button
                  key={account.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (index + 1) }}
                  onClick={() => setLocalSelectedAccount(account)}
                  disabled={isSelecting}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    localSelectedAccount?.id === account.id
                      ? 'border-black bg-gray-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${
                    isSelecting ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  style={{
                    borderColor: localSelectedAccount?.id === account.id ? account.color : undefined
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-medium text-white"
                      style={{ backgroundColor: account.color }}
                    >
                      {getAccountIcon(account.business_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {account.name}
                        </h3>
                        {localSelectedAccount?.id === account.id && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center ml-2" style={{ backgroundColor: account.color }}>
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 capitalize mb-2">
                        {account.business_type || 'Business'} Account
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {account.google_ads_id && (
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
                            </svg>
                            Ads: {account.google_ads_id}
                          </span>
                        )}
                        {account.ga4_property_id && (
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            GA4: {account.ga4_property_id}
                          </span>
                        )}
                        {account.meta_ads_id && (
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v6.114a4.369 4.369 0 00-1-.114c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                            Meta: {account.meta_ads_id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSelecting && localSelectedAccount?.id === account.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 flex items-center justify-center"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        <span className="text-sm text-gray-600">Connecting...</span>
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Industry Selection - Only show when account is selected */}
      {localSelectedAccount && !isSelecting && (mccAccounts.length <= 1 || selectedMCC) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 pb-4 flex-shrink-0"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What industry are you in?
          </label>
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="">Select your industry</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </motion.div>
      )}

      {/* Continue Button - Only show when account is selected */}
      {localSelectedAccount && !isSelecting && (mccAccounts.length <= 1 || selectedMCC) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 pt-2 flex-shrink-0"
        >
          <button
            onClick={() => handleAccountSelect(localSelectedAccount)}
            disabled={!selectedIndustry}
            className={`w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
              selectedIndustry
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Continue with {localSelectedAccount.name}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </motion.div>
      )}
    </div>
  )
}

export default AccountSelectionPage
