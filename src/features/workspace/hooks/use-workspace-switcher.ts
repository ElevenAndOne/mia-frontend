import { useCallback, useState } from 'react'

interface UseWorkspaceSwitcherParams {
  activeWorkspaceId?: string
  switchWorkspace: (tenantId: string) => Promise<boolean>
  onSuccess?: () => void
  reloadOnSuccess?: boolean
  onError?: (error: unknown) => void
}

export const useWorkspaceSwitcher = ({
  activeWorkspaceId,
  switchWorkspace,
  onSuccess,
  reloadOnSuccess = true,
  onError,
}: UseWorkspaceSwitcherParams) => {
  const [isSwitching, setIsSwitching] = useState(false)
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const handleSwitch = useCallback(
    async (tenantId: string) => {
      if (tenantId === activeWorkspaceId) return

      setIsSwitching(true)
      setSwitchingId(tenantId)

      try {
        const success = await switchWorkspace(tenantId)
        if (success) {
          onSuccess?.()
          if (reloadOnSuccess) {
            window.location.reload()
          }
        }
      } catch (error) {
        onError?.(error)
        console.error('[WORKSPACE-SWITCHER] Switch error:', error)
      } finally {
        setIsSwitching(false)
        setSwitchingId(null)
      }
    },
    [activeWorkspaceId, switchWorkspace, onSuccess, reloadOnSuccess, onError]
  )

  return { isSwitching, switchingId, handleSwitch }
}
