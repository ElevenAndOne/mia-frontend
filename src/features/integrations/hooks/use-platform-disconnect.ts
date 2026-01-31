import { useCallback, useState } from 'react'
import { disconnectPlatform } from '../services/platform-service'

interface UsePlatformDisconnectParams {
  sessionId: string | null
  platformId: string
  onSuccess?: () => void
  onError?: (message: string) => void
}

export const usePlatformDisconnect = ({ sessionId, platformId, onSuccess, onError }: UsePlatformDisconnectParams) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const handleDisconnect = useCallback(async () => {
    if (!sessionId) return

    setIsDisconnecting(true)
    try {
      await disconnectPlatform(sessionId, platformId)
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect'
      onError?.(message)
    } finally {
      setIsDisconnecting(false)
    }
  }, [sessionId, platformId, onSuccess, onError])

  return { isDisconnecting, handleDisconnect }
}
