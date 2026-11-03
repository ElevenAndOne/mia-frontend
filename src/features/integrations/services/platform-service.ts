import { apiFetch } from '../../../utils/api'
import { withWorkspace } from '../utils/with-workspace'

export const disconnectPlatform = async (
  sessionId: string,
  platformId: string,
  tenantId?: string | null
) => {
  const response = await apiFetch(
    withWorkspace(`/api/platform/${platformId}/disconnect`, tenantId),
    {
      method: 'POST',
      headers: {
        'X-Session-ID': sessionId,
      },
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to disconnect' }))
    throw new Error(errorData.detail || 'Failed to disconnect')
  }

  return response.json().catch(() => ({ success: true }))
}
