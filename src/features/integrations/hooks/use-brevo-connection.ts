import { useCallback, useEffect, useRef, useState } from 'react'
import { connectBrevoApiKey } from '../services/brevo-service'

interface UseBrevoConnectionParams {
  onSuccess?: () => void
  onClose: () => void
}

export const useBrevoConnection = ({ onSuccess, onClose }: UseBrevoConnectionParams) => {
  const [apiKey, setApiKey] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => clearTimeoutRef, [clearTimeoutRef])

  const handleConnect = useCallback(async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Brevo API key')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      await connectBrevoApiKey(apiKey.trim())
      setSuccess(true)
      clearTimeoutRef()
      timeoutRef.current = window.setTimeout(() => {
        onSuccess?.()
        onClose()
        setApiKey('')
        setSuccess(false)
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to Brevo. Please check your API key.'
      setError(message)
    } finally {
      setIsConnecting(false)
    }
  }, [apiKey, clearTimeoutRef, onClose, onSuccess])

  const handleClose = useCallback(() => {
    if (isConnecting) return
    clearTimeoutRef()
    setApiKey('')
    setError(null)
    setSuccess(false)
    onClose()
  }, [clearTimeoutRef, isConnecting, onClose])

  return {
    apiKey,
    setApiKey,
    isConnecting,
    error,
    success,
    handleConnect,
    handleClose,
  }
}
