import { useCallback, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { disconnectPlatform } from '../services/platform-service'

interface UsePlatformDisconnectParams {
  sessionId: string | null
  platformId: string
  onSuccess?: () => void
  onError?: (message: string) => void
}

export const usePlatformDisconnect = ({
  sessionId,
  platformId,
  onSuccess,
  onError,
}: UsePlatformDisconnectParams) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  // Disconnect the workspace on screen, never the one another tab switched to last.
  const { activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id

  const handleDisconnect = useCallback(async () => {
    if (!sessionId) return

    setIsDisconnecting(true)
    try {
      await disconnectPlatform(sessionId, platformId, tenantId)
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect'
      onError?.(message)
    } finally {
      setIsDisconnecting(false)
    }
  }, [sessionId, platformId, tenantId, onSuccess, onError])

  return { isDisconnecting, handleDisconnect }
}
