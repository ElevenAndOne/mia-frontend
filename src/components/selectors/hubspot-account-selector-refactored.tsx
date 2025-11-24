import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHubSpot } from '../../hooks/useMiaSDK'

interface HubSpotAccount {
  id: number
  portal_id: string
  account_name: string
  is_primary: boolean
}

interface HubSpotAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const HubSpotAccountSelectorRefactored = ({ isOpen, onClose, onSuccess }: HubSpotAccountSelectorProps) => {
  // Use the custom hook - much cleaner!
  const { getAccounts, selectAccount, disconnectAccount, isLoading, error, clearError } = useHubSpot()
  
  const [accounts, setAccounts] = useState<HubSpotAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [success, setSuccess] = useState(false)

  const fetchHubSpotAccounts = useCallback(async () => {
    clearError()
    
    const result = await getAccounts()
    
    if (result.success && result.data) {
      setAccounts(result.data)

      // Pre-select currently primary account
      const primaryAccount = result.data.find((acc: HubSpotAccount) => acc.is_primary)
      if (primaryAccount) {
        setSelectedAccountId(primaryAccount.id)
        console.log('[HUBSPOT-ACCOUNT-SELECTOR] Pre-selected primary account:', primaryAccount.id)
      } else if (result.data.length === 1) {
        // Auto-select if only one account
        setSelectedAccountId(result.data[0].id)
      }
    }
  }, [clearError, getAccounts])

  // Fetch accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchHubSpotAccounts()
    }
  }, [fetchHubSpotAccounts, isOpen])

  const handleSwitchAccount = async () => {
    if (!selectedAccountId) {
      return
    }

    setIsSwitching(true)
    console.log('[HUBSPOT-ACCOUNT-SELECTOR] Switching to HubSpot account:', selectedAccountId)

    const result = await selectAccount(selectedAccountId)

    if (result.success) {
      console.log('[HUBSPOT-ACCOUNT-SELECTOR] Successfully switched to account')
      setSuccess(true)

      // Show success for 1 second, then close and refresh
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1000)
    }

    setIsSwitching(false)
  }

  const handleRemoveAccount = async (hubspotId: number, accountName: string) => {
    if (!confirm(`Remove ${accountName} from this account?`)) {
      return
    }

    const result = await disconnectAccount(hubspotId)

    if (result.success) {
      console.log('[HUBSPOT-ACCOUNT-SELECTOR] Removed HubSpot account:', hubspotId)
      // Refresh list
      await fetchHubSpotAccounts()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">HubSpot Portals</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Select which HubSpot portal to use for this account
            </p>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-96">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-sm text-gray-600">Loading HubSpot portals...</p>
              </div>
            ) : error && accounts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-red-500 mb-2">⚠️</div>
                <p className="text-sm text-gray-600">{error}</p>
                <button
                  onClick={fetchHubSpotAccounts}
                  className="mt-4 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
                >
                  Try Again
                </button>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600">No HubSpot portals connected yet.</p>
                <p className="text-xs text-gray-500 mt-2">Connect a HubSpot portal to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedAccountId === account.id
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedAccountId(account.id)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedAccountId === account.id
                          ? 'border-black'
                          : 'border-gray-300'
                      }`}>
                        {selectedAccountId === account.id && (
                          <div className="w-3 h-3 rounded-full bg-black"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{account.account_name}</h3>
                          {account.is_primary && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Portal ID: {account.portal_id}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveAccount(account.id, account.account_name)
                      }}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove this portal"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && accounts.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">✓ Successfully switched portals!</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {!isLoading && accounts.length > 0 && (
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSwitching}
              >
                Cancel
              </button>
              <button
                onClick={handleSwitchAccount}
                disabled={isSwitching || !selectedAccountId}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSwitching || !selectedAccountId
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {isSwitching ? 'Switching...' : 'Switch Portal'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default HubSpotAccountSelectorRefactored
