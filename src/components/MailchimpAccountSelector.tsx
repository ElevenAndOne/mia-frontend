import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiFetch } from '../utils/api'
import { useSession } from '../contexts/SessionContext'

interface MailchimpAccount {
  id: number
  mailchimp_account_id: string
  mailchimp_account_name: string
  is_primary: boolean
}

interface MailchimpAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const MailchimpAccountSelector = ({ isOpen, onClose, onSuccess }: MailchimpAccountSelectorProps) => {
  const { sessionId } = useSession()
  const [accounts, setAccounts] = useState<MailchimpAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch available Mailchimp accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMailchimpAccounts()
    }
  }, [isOpen])

  const fetchMailchimpAccounts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiFetch(`/api/oauth/mailchimp/accounts?session_id=${sessionId}`, {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId || 'default'
        }
      })

      const data = await response.json()

      if (data.success && data.accounts) {
        setAccounts(data.accounts)

        // Pre-select currently primary account
        const primaryAccount = data.accounts.find((acc: MailchimpAccount) => acc.is_primary)
        if (primaryAccount) {
          setSelectedAccountId(primaryAccount.id)
          console.log('[MAILCHIMP-ACCOUNT-SELECTOR] Pre-selected primary account:', primaryAccount.id)
        } else if (data.accounts.length === 1) {
          // Auto-select if only one account
          setSelectedAccountId(data.accounts[0].id)
        }
      } else {
        setError(data.error || 'Failed to fetch Mailchimp accounts')
      }
    } catch (err: any) {
      console.error('Error fetching Mailchimp accounts:', err)
      setError('Failed to load Mailchimp accounts. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwitchAccount = async () => {
    if (!selectedAccountId) {
      setError('Please select an account')
      return
    }

    setIsSwitching(true)
    setError(null)

    try {
      console.log('[MAILCHIMP-ACCOUNT-SELECTOR] Switching to Mailchimp account:', selectedAccountId)

      const response = await apiFetch(`/api/oauth/mailchimp/set-primary?mailchimp_id=${selectedAccountId}&session_id=${sessionId}`, {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId || 'default'
        }
      })

      const data = await response.json()

      if (data.success) {
        console.log('[MAILCHIMP-ACCOUNT-SELECTOR] Successfully switched to:', data.message)
        setSuccess(true)

        // Show success for 1 second, then close and refresh
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 1000)
      } else {
        setError(data.error || 'Failed to switch account')
      }
    } catch (err: any) {
      console.error('Error switching Mailchimp account:', err)
      setError(err.message || 'Failed to switch account. Please try again.')
    } finally {
      setIsSwitching(false)
    }
  }

  const handleConnectAnother = () => {
    // Close modal and trigger connection flow
    onClose()
    // The parent component will handle opening the OAuth flow
    window.location.href = `/api/oauth/mailchimp/auth-url?session_id=${sessionId}`
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Mailchimp Accounts</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error && accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={fetchMailchimpAccounts}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Try Again
                </button>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No Mailchimp accounts connected yet.</p>
                <button
                  onClick={handleConnectAnother}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect Mailchimp Account
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Select which Mailchimp account to use with this Google Ads account
                </p>

                {/* Account List */}
                <div className="space-y-2 mb-6">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => setSelectedAccountId(account.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedAccountId === account.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {account.mailchimp_account_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {account.mailchimp_account_id}
                          </div>
                        </div>
                        {account.is_primary && (
                          <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-600">✓ Account switched successfully!</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSwitchAccount}
                    disabled={isSwitching || !selectedAccountId || success}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isSwitching ? 'Switching...' : 'Switch Account'}
                  </button>
                  <button
                    onClick={handleConnectAnother}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    + Add Another
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default MailchimpAccountSelector
