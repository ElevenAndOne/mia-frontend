import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFacebook } from '../../hooks/useMiaSDK'
import { useSession } from '../../contexts/session-context'
import { MetaAdsAccount } from '../../sdk/types'

interface MetaAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  currentGoogleAccountName?: string
  currentAccountData?: any  // Fresh account data from IntegrationsPage
}

const MetaAccountSelector = ({ isOpen, onClose, onSuccess, currentGoogleAccountName, currentAccountData }: MetaAccountSelectorProps) => {
  const { selectedAccount } = useSession()
  const { getMetaAccounts, linkMetaAccount, isLoading: sdkLoading, error: sdkError, clearError } = useFacebook()
  // Use currentAccountData if provided (fresh data), otherwise fall back to selectedAccount
  const accountToUse = currentAccountData || selectedAccount
  const [metaAccounts, setMetaAccounts] = useState<MetaAdsAccount[]>([])
  const [selectedMetaAccountId, setSelectedMetaAccountId] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [success, setSuccess] = useState(false)

  // Fetch available Meta accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMetaAccounts()
    }
  }, [isOpen])

  const fetchMetaAccounts = async () => {
    clearError()
    
    const result = await getMetaAccounts()
    
    if (result.success && result.data) {
      setMetaAccounts(result.data)

      // Auto-select account if only one is available or if already linked
      if (accountToUse?.linked_meta_account_id) {
        setSelectedMetaAccountId(accountToUse.linked_meta_account_id)
        console.log('[META-ACCOUNT-SELECTOR] Pre-selected linked account:', accountToUse.linked_meta_account_id)
      } else if (result.data.length === 1) {
        setSelectedMetaAccountId(result.data[0].id)
      }
    }
  }

  const handleLinkMetaAccount = async () => {
    if (!accountToUse) {
      return
    }

    setIsLinking(true)
    console.log('[META-ACCOUNT-SELECTOR] Linking Meta account:', selectedMetaAccountId)

    const result = await linkMetaAccount(selectedMetaAccountId, accountToUse.id)

    if (result.success) {
      setSuccess(true)

      setTimeout(() => {
        onSuccess?.()
        handleClose()
      }, 1500)
    }

    setIsLinking(false)
  }

  const handleClose = () => {
    if (!isLinking) {
      setSelectedMetaAccountId(null)
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
              {/* Success state and account selection */}
              {sdkLoading ? (
                <div className="py-8 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600">Loading your Meta accounts...</p>
                </div>
              ) : sdkError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">{sdkError}</p>
                    </div>
                  </div>
                </div>
              ) : (
                success ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      <p className="text-sm font-medium text-green-800">Meta account linked successfully!</p>
                    </div>
                  </div>
                ) : (
                  metaAccounts.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-gray-600">No Meta accounts found.</p>
                      <p className="text-sm text-gray-500 mt-2">Make sure you have access to at least one Meta account.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {metaAccounts.map((account: MetaAdsAccount) => (
                        <div
                          key={account.id}
                          className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedMetaAccountId === account.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedMetaAccountId(selectedMetaAccountId === account.id ? null : account.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{account.name}</h3>
                              <p className="text-sm text-gray-500">ID: {account.id}</p>
                              <p className="text-sm text-gray-500">Currency: {account.currency}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedMetaAccountId === account.id
                                ? 'border-blue-600 bg-blue-600'
                                : 'border-gray-300'
                            }`}>
                              {selectedMetaAccountId === account.id && (
                                <div className="w-3 h-3 rounded-full bg-white"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )
              )}
            </div>

            {/* Footer */}
            {!sdkLoading && metaAccounts.length > 0 && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleClose}
                  disabled={isLinking}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkMetaAccount}
                  disabled={isLinking || !selectedMetaAccountId}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    isLinking || !selectedMetaAccountId
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isLinking ? 'Linking...' : `Link Account (${selectedMetaAccountId ? '1' : '0'})`}
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
