import { useState } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '../utils/api'
import { Modal } from '../features/overlay'

interface BrevoConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const BrevoConnectionModal = ({ isOpen, onClose, onSuccess }: BrevoConnectionModalProps) => {
  const [apiKey, setApiKey] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Brevo API key')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const response = await apiFetch('/api/oauth/brevo/save-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess?.()
          onClose()
          setApiKey('')
          setSuccess(false)
        }, 1500)
      } else {
        setError(data.message || 'Failed to connect Brevo account')
      }
    } catch (err) {
      console.error('Brevo connection error:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect to Brevo. Please check your API key.')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleClose = () => {
    if (!isConnecting) {
      setApiKey('')
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" showCloseButton={false} panelClassName="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-utility-info-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-utility-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="title-h6 text-primary">Connect Brevo</h2>
        </div>
        <button
          onClick={handleClose}
          disabled={isConnecting}
          className="text-placeholder-subtle hover:text-tertiary transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-success-primary border border-utility-success-300 rounded-lg flex items-center space-x-3"
        >
          <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="subheading-md text-success">Connected successfully!</span>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-error-primary border border-error-subtle rounded-lg"
        >
          <p className="paragraph-sm text-error">{error}</p>
        </motion.div>
      )}

      {/* Description */}
      <div className="mb-6">
        <p className="paragraph-sm text-tertiary mb-4">
          Connect your Brevo account to analyze email campaign performance alongside your other marketing data.
        </p>
        <div className="bg-utility-info-100 border border-utility-info-300 rounded-lg p-3">
          <p className="paragraph-xs text-utility-info-700">
            <strong>Where to find your API key:</strong> Login to Brevo → Settings → API Keys → Create a new key
          </p>
        </div>
      </div>

      {/* API Key Input */}
      <div className="mb-6">
        <label className="block subheading-md text-secondary mb-2">Brevo API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          placeholder="xkeysib-..."
          disabled={isConnecting || success}
          className="w-full px-4 py-3 border border-primary rounded-lg focus:ring-2 focus:ring-utility-info-500 focus:border-transparent transition-all disabled:bg-disabled disabled:cursor-not-allowed"
        />
      </div>

      {/* Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleClose}
          disabled={isConnecting}
          className="flex-1 px-4 py-3 border border-primary rounded-lg subheading-md text-secondary hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handleConnect}
          disabled={isConnecting || success || !apiKey.trim()}
          className="flex-1 px-4 py-3 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Connecting...</span>
            </>
          ) : (
            <span>Connect</span>
          )}
        </button>
      </div>
    </Modal>
  )
}

export default BrevoConnectionModal
