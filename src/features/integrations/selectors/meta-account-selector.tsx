import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../../../utils/api'
import { useSession } from '../../../contexts/session-context'

interface MetaAccount {
  id: string
  name: string
  currency: string
  status: string
}

interface MetaAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentGoogleAccountName?: string
  currentAccountData?: { meta_ads_id?: string } | null  // Fresh account data from IntegrationsPage
}

const MetaAccountSelector = ({ isOpen, onClose, onSuccess, currentGoogleAccountName, currentAccountData }: MetaAccountSelectorProps) => {
  const { sessionId, selectedAccount } = useSession()
  // Use currentAccountData if provided (fresh data), otherwise fall back to selectedAccount
  const accountToUse = currentAccountData || selectedAccount
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch available Meta accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMetaAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchMetaAccounts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiFetch('/api/oauth/meta/accounts/available', {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId || 'default'
        }
      })

      const data = await response.json()

      if (data.success && data.accounts) {
        // Sort Meta accounts alphabetically (A-Z)
        const sortedAccounts = data.accounts.sort((a: MetaAccount, b: MetaAccount) =>
          a.name.localeCompare(b.name)
        )
        setAccounts(sortedAccounts)

        // Pre-select currently linked Meta account if exists
        if (accountToUse?.meta_ads_id) {
          setSelectedAccountId(accountToUse.meta_ads_id)
          console.log('[META-ACCOUNT-SELECTOR] Pre-selected account:', accountToUse.meta_ads_id)
        } else if (sortedAccounts.length === 1) {
          // Auto-select if only one account and no account linked yet
          setSelectedAccountId(sortedAccounts[0].id)
        }
      } else {
        setError(data.error || 'Failed to fetch Meta accounts')
      }
    } catch (err) {
      console.error('Error fetching Meta accounts:', err)
      setError('Failed to load Meta accounts. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkAccount = async () => {
    setIsLinking(true)
    setError(null)

    try {
      if (selectedAccountId) {
        console.log('[META-ACCOUNT-SELECTOR] Linking Meta account:', selectedAccountId)
      } else {
        console.log('[META-ACCOUNT-SELECTOR] Unlinking Meta account')
      }

      const response = await apiFetch('/api/oauth/meta/accounts/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default'
        },
        body: JSON.stringify({
          meta_account_id: selectedAccountId || ''  // Empty string to unlink
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess?.()
          handleClose()
        }, 1000)
      } else {
        setError(data.message || 'Failed to update Meta account')
      }
    } catch (err) {
      console.error('Meta account update error:', err)
      setError('Failed to update Meta account. Please try again.')
    } finally {
      setIsLinking(false)
    }
  }

  const handleClose = () => {
    if (!isLinking) {
      setSelectedAccountId(null)
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Link Meta Account</h2>
                  {currentGoogleAccountName && (
                    <p className="text-sm text-gray-500">to {currentGoogleAccountName}</p>
                  )}
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
                  <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600">Loading your Meta accounts...</p>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success State */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-green-800">Meta account linked successfully!</p>
                  </div>
                </div>
              )}

              {/* Account Selection */}
              {!isLoading && !success && accounts.length > 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Meta Ad Account
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {accounts.map((account) => {
                        const isSelected = selectedAccountId === account.id
                        return (
                          <div
                            key={account.id}
                            onClick={() => setSelectedAccountId(isSelected ? null : account.id)}
                            className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Square Checkbox */}
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
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
                              {/* Account Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{account.name}</p>
                                <p className="text-sm text-gray-500 truncate">
                                  ID: {account.id} • {account.currency}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Helper Text */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      💡 This Meta account will be linked to your {currentGoogleAccountName || 'Google Ads'} account for unified reporting.
                    </p>
                  </div>
                </>
              )}

              {/* No Accounts Found */}
              {!isLoading && !error && accounts.length === 0 && (
                <div className="py-8 text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-600">No Meta ad accounts found</p>
                  <p className="text-sm text-gray-500 mt-2">Make sure you have access to at least one Meta Ads account</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isLoading && !success && accounts.length > 0 && (
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
                  disabled={isLinking}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLinking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Applying...
                    </>
                  ) : (
                    `Apply (${selectedAccountId ? '1' : '0'})`
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default MetaAccountSelector
