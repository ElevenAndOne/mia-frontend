import { useState, useEffect } from 'react'
import { apiFetch } from '../../../utils/api'
import { useSession } from '../../../contexts/session-context'
import { ModalShell } from '../../../components/modal-shell'

interface BrevoAccount {
  id: number
  account_name: string
  is_primary: boolean
  created_at: string
}

interface BrevoAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const BrevoAccountSelector = ({ isOpen, onClose, onSuccess }: BrevoAccountSelectorProps) => {
  const { sessionId } = useSession()
  const [accounts, setAccounts] = useState<BrevoAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch available Brevo accounts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchBrevoAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchBrevoAccounts is intentionally omitted to prevent re-fetching on every render
  }, [isOpen])

  const fetchBrevoAccounts = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiFetch(`/api/oauth/brevo/accounts?session_id=${sessionId}`, {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId || 'default'
        }
      })

      const data = await response.json()

      if (data.success && data.accounts) {
        setAccounts(data.accounts)

        // Pre-select currently primary account
        const primaryAccount = data.accounts.find((acc: BrevoAccount) => acc.is_primary)
        if (primaryAccount) {
          setSelectedAccountId(primaryAccount.id)
          console.log('[BREVO-ACCOUNT-SELECTOR] Pre-selected primary account:', primaryAccount.id)
        } else if (data.accounts.length === 1) {
          // Auto-select if only one account
          setSelectedAccountId(data.accounts[0].id)
        }
      } else {
        setError(data.error || 'Failed to fetch Brevo accounts')
      }
    } catch (err) {
      console.error('Error fetching Brevo accounts:', err)
      setError('Failed to load Brevo accounts. Please try again.')
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
      console.log('[BREVO-ACCOUNT-SELECTOR] Switching to Brevo account:', selectedAccountId)

      const response = await apiFetch('/api/oauth/brevo/select-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default'
        },
        body: JSON.stringify({
          session_id: sessionId,
          brevo_id: selectedAccountId
        })
      })

      const data = await response.json()

      if (data.success) {
        console.log('[BREVO-ACCOUNT-SELECTOR] Successfully switched to:', data.account_name)
        setSuccess(true)

        // Show success for 1 second, then close and refresh
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 1000)
      } else {
        setError(data.message || 'Failed to switch Brevo account')
      }
    } catch (err) {
      console.error('Error switching Brevo account:', err)
      setError('Failed to switch account. Please try again.')
    } finally {
      setIsSwitching(false)
    }
  }

  const handleRemoveAccount = async (brevoId: number, accountName: string) => {
    if (!confirm(`Remove ${accountName} from this account?`)) {
      return
    }

    try {
      const response = await apiFetch(`/api/oauth/brevo/disconnect?session_id=${sessionId}&brevo_id=${brevoId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        console.log('[BREVO-ACCOUNT-SELECTOR] Removed Brevo account:', brevoId)
        // Refresh list
        await fetchBrevoAccounts()
      } else {
        setError(data.message || 'Failed to remove Brevo account')
      }
    } catch (err) {
      console.error('Error removing Brevo account:', err)
      setError('Failed to remove account. Please try again.')
    }
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="max-w-md max-h-[80vh] overflow-hidden"
    >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900">Brevo Accounts</h2>
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
              Select which Brevo account to use for this account
            </p>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-96">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-sm text-gray-600">Loading Brevo accounts...</p>
              </div>
            ) : error && accounts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-red-500 mb-2">⚠️</div>
                <p className="text-sm text-gray-600">{error}</p>
                <button
                  onClick={fetchBrevoAccounts}
                  className="mt-4 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
                >
                  Try Again
                </button>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600">No Brevo accounts connected yet.</p>
                <p className="text-xs text-gray-500 mt-2">Add a Brevo API key to get started.</p>
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
                          Added {new Date(account.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveAccount(account.id, account.account_name)
                      }}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove this account"
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
                <p className="text-sm text-green-600">✓ Successfully switched accounts!</p>
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
                {isSwitching ? 'Switching...' : 'Switch Account'}
              </button>
            </div>
          )}
    </ModalShell>
  )
}

export default BrevoAccountSelector
