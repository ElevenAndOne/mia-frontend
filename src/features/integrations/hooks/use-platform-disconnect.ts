import { useCallback, useState } from 'react'
import { useMiaClient, type PlatformId } from '../../../sdk'

interface UsePlatformDisconnectParams {
  sessionId: string | null
  platformId: string
  onSuccess?: () => void
  onError?: (message: string) => void
}

export const usePlatformDisconnect = ({ sessionId, platformId, onSuccess, onError }: UsePlatformDisconnectParams) => {
  const mia = useMiaClient()
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const handleDisconnect = useCallback(async () => {
    if (!sessionId) return

    setIsDisconnecting(true)
    try {
      await mia.platforms.disconnect(platformId as PlatformId)
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect'
      onError?.(message)
    } finally {
      setIsDisconnecting(false)
    }
  }, [sessionId, platformId, onSuccess, onError, mia])

  return { isDisconnecting, handleDisconnect }
}
