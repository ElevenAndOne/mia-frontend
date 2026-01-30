import { useState, useEffect } from 'react'
import { useSession } from '../../../contexts/session-context'
import { ModalShell } from '../../../components/modal-shell'

interface GoogleAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const GoogleAccountSelector = ({ isOpen, onClose, onSuccess }: GoogleAccountSelectorProps) => {
  const { availableAccounts, selectedAccount, selectAccount } = useSession()
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Pre-select current account when modal opens
  useEffect(() => {
    if (isOpen && selectedAccount) {
      setSelectedAccountId(selectedAccount.id)
      console.log('[GOOGLE-ACCOUNT-SELECTOR] Pre-selected account:', selectedAccount.id)
    }
  }, [isOpen, selectedAccount])

  const handleSwitchAccount = async () => {
    if (!selectedAccountId) {
      setError('Please select a Google Ads account')
      return
    }

    // If same account selected, just close
    if (selectedAccountId === selectedAccount?.id) {
      handleClose()
      return
    }

    setIsSwitching(true)
    setError(null)

    try {
      console.log('[GOOGLE-ACCOUNT-SELECTOR] Switching to account:', selectedAccountId)

      const success = await selectAccount(selectedAccountId)

      if (success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess?.()
          handleClose()
        }, 1000)
      } else {
        setError('Failed to switch account')
      }
    } catch (err) {
      console.error('Google account switching error:', err)
      setError('Failed to switch account. Please try again.')
    } finally {
      setIsSwitching(false)
    }
  }

  const handleClose = () => {
    if (!isSwitching) {
      setSelectedAccountId(null)
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <ModalShell isOpen={isOpen} onClose={handleClose} panelClassName="max-w-md p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <img src="/icons/google-ads.svg" alt="Google Ads" className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Switch Google Ads Account</h2>
                  <p className="text-sm text-gray-500">Select an account to view its data</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isSwitching}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
                    <p className="text-sm font-medium text-green-800">Account switched successfully!</p>
                  </div>
                </div>
              )}

              {/* Account Selection */}
              {!success && availableAccounts.length > 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Google Ads Account
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {availableAccounts
                        .filter(account => account.google_ads_id) // Only show Google Ads accounts (exclude Meta-only accounts)
                        .sort((a, b) => a.name.localeCompare(b.name)) // Sort A-Z
                        .map((account) => {
                        const isSelected = selectedAccountId === account.id
                        const isCurrent = account.id === selectedAccount?.id
                        return (
                          <div
                            key={account.id}
                            onClick={() => setSelectedAccountId(account.id)}
                            className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Square Checkbox */}
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-green-600 bg-green-600'
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
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 truncate">{account.name}</p>
                                  {isCurrent && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 truncate">
                                  ID: {account.google_ads_id}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Helper Text */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-800">
                      💡 Switching accounts will load that account's integrations and data.
                    </p>
                  </div>
                </>
              )}

              {/* No Accounts Found */}
              {!success && availableAccounts.length === 0 && (
                <div className="py-8 text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-600">No Google Ads accounts found</p>
                  <p className="text-sm text-gray-500 mt-2">Please authenticate with Google first</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {!success && availableAccounts.length > 0 && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleClose}
                  disabled={isSwitching}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSwitchAccount}
                  disabled={!selectedAccountId || isSwitching}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSwitching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Switching...
                    </>
                  ) : (
                    'Switch Account'
                  )}
                </button>
              </div>
            )}
    </ModalShell>
  )
}

export default GoogleAccountSelector
