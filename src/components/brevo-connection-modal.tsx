import { motion } from 'framer-motion'
import { Modal } from '../features/overlay'
import { CloseButton } from './close-button'
import { Alert } from './alert'
import { useBrevoConnection } from '../features/integrations/hooks/use-brevo-connection'

interface BrevoConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const BrevoConnectionModal = ({ isOpen, onClose, onSuccess }: BrevoConnectionModalProps) => {
  const {
    apiKey,
    setApiKey,
    isConnecting,
    error,
    success,
    handleConnect,
    handleClose,
  } = useBrevoConnection({ onClose, onSuccess })

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
        <CloseButton onClick={handleClose} disabled={isConnecting} />
      </div>

      {/* Success Message */}
      {success && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Alert variant="success">Connected successfully!</Alert>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Alert variant="error">{error}</Alert>
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
