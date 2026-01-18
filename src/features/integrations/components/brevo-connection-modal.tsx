import { useState } from 'react'
import * as Dialog from '@/components/ui/dialog'
import { Alert, Button, Input } from '@/components/ui'
import { apiFetch } from '@/utils/api'

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess?.()
          handleClose()
        }, 1500)
      } else {
        setError(data.message || 'Failed to connect Brevo account')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Brevo')
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
    <Dialog.Root isOpen={isOpen} onClose={handleClose} disabled={isConnecting}>
      <Dialog.Overlay>
        <Dialog.Content size="md">
          <Dialog.Header
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            iconClassName="bg-blue-100"
          >
            <Dialog.Title>Connect Brevo</Dialog.Title>
          </Dialog.Header>

          <Dialog.Body className="space-y-4">
            {success && <Alert variant="success">Connected successfully!</Alert>}
            {error && <Alert variant="error">{error}</Alert>}

            <p className="text-gray-600 text-sm">
              Connect your Brevo account to analyze email campaign performance alongside your other marketing data.
            </p>

            <Alert variant="info" showIcon={false}>
              <strong>Where to find your API key:</strong> Login to Brevo → Settings → API Keys → Create a new key
            </Alert>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brevo API Key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                placeholder="xkeysib-..."
                disabled={isConnecting || success}
              />
            </div>
          </Dialog.Body>

          <Dialog.Footer>
            <Dialog.Close disabled={isConnecting}>Cancel</Dialog.Close>
            <Button
              onClick={handleConnect}
              isLoading={isConnecting}
              disabled={isConnecting || success || !apiKey.trim()}
              className="flex-1"
            >
              Connect
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  )
}

export default BrevoConnectionModal
