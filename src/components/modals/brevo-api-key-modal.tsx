import { useState } from 'react'
import { useBrevo } from '../../hooks/useMiaSDK'

interface BrevoApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const BrevoApiKeyModal = ({ isOpen, onClose, onSuccess }: BrevoApiKeyModalProps) => {
  const { saveApiKey, isLoading, error: sdkError, clearError } = useBrevo()
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!apiKey.trim()) {
      setError('Please enter a valid Brevo API key')
      return
    }

    clearError()
    setError(null)

    const result = await saveApiKey(apiKey)

    if (result.success) {
      onSuccess?.()
      onClose()
      setApiKey('')
    } else {
      setError(result.error || 'Failed to connect to Brevo. Please check your API key.')
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setApiKey('')
      setError(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Connect Brevo</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={(e) => e.preventDefault()} className="p-6">
          <div className="mb-6">
            <label htmlFor="brevo-api-key" className="block text-sm font-medium text-gray-700 mb-2">
              Brevo API Key
            </label>
            <input
              id="brevo-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Brevo API key here"
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <p>
                Don't have an API key?{' '}
                <a
                  href="https://app.brevo.com/settings/keys/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Get your API key from Brevo
                </a>
              </p>
              <p className="text-gray-500">
                1. Click "Generate a new API key" and copy it<br />
                2. Go to{' '}
                <a
                  href="https://app.brevo.com/security/authorised_ips"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Authorized IPs
                </a>
                {' '}and click "Deactivate blocking"<br />
                3. Paste your key above
              </p>
            </div>
          </div>

          {(error || sdkError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm mt-2">{error || sdkError}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !apiKey.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BrevoApiKeyModal
