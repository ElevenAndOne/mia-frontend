import React, { useState, useEffect } from 'react'

interface MCCAccount {
  customer_id: string
  descriptive_name: string
  manager: boolean
  account_count?: number
}

interface MCCSelectionPageProps {
  sessionId: string
  onMCCSelected: (mccId: string) => void
}

const MCCSelectionPage: React.FC<MCCSelectionPageProps> = ({ sessionId, onMCCSelected }) => {
  const [mccAccounts, setMccAccounts] = useState<MCCAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMCC, setSelectedMCC] = useState<string | null>(null)

  useEffect(() => {
    fetchMCCAccounts()
  }, [sessionId])

  const fetchMCCAccounts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user_id from session
      const sessionResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/session/validate?session_id=${sessionId}`
      )

      if (!sessionResponse.ok) {
        throw new Error('Session validation failed')
      }

      const sessionData = await sessionResponse.json()
      const userId = sessionData.user?.user_id || sessionData.user_id || sessionData.google_user_id

      console.log('[MCC-SELECTION] Session data:', sessionData)
      console.log('[MCC-SELECTION] User ID:', userId)

      if (!userId) {
        throw new Error('User ID not found in session')
      }

      // Fetch MCC accounts
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/oauth/google/ad-accounts?user_id=${userId}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch MCC accounts')
      }

      const data = await response.json()

      console.log('[MCC-SELECTION] API response:', data)

      // Backend returns mcc_accounts and ad_accounts
      // Use mcc_accounts if available, otherwise filter ad_accounts
      const mccOnly = data.mcc_accounts || (data.ad_accounts || []).filter((acc: MCCAccount) => acc.manager === true || acc.is_mcc === true)

      setMccAccounts(mccOnly)

      // If only one MCC, auto-select it
      if (mccOnly.length === 1) {
        setSelectedMCC(mccOnly[0].customer_id)
      }
    } catch (err) {
      console.error('Error fetching MCC accounts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load MCC accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    if (selectedMCC) {
      onMCCSelected(selectedMCC)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading MCC accounts...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="bg-red-500 text-white p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={fetchMCCAccounts}
            className="mt-4 bg-white text-red-500 px-4 py-2 rounded hover:bg-gray-100"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (mccAccounts.length === 0) {
    // No MCC accounts - skip this page
    onMCCSelected('none')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Select Manager Account</h1>
        <p className="text-gray-600 mb-6">
          Choose which Google Ads Manager account you want to manage. This will determine which sub-accounts you can access.
        </p>

        <div className="space-y-4">
          {mccAccounts.map((mcc) => (
            <div
              key={mcc.customer_id}
              onClick={() => setSelectedMCC(mcc.customer_id)}
              className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                selectedMCC === mcc.customer_id
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-800 mb-1">{mcc.descriptive_name}</h3>
                  <p className="text-sm text-gray-600 mb-2">ID: {mcc.customer_id}</p>
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                      {mcc.account_count || 0} sub-accounts
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedMCC === mcc.customer_id
                        ? 'border-purple-600 bg-purple-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedMCC === mcc.customer_id && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            You can change this later in settings
          </p>
          <button
            onClick={handleContinue}
            disabled={!selectedMCC}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedMCC
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default MCCSelectionPage