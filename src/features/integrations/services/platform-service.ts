import { apiFetch } from '../../../utils/api'

export const disconnectPlatform = async (sessionId: string, platformId: string) => {
  const response = await apiFetch(`/api/platform/${platformId}/disconnect`, {
    method: 'POST',
    headers: {
      'X-Session-ID': sessionId,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to disconnect' }))
    throw new Error(errorData.detail || 'Failed to disconnect')
  }

  return response.json().catch(() => ({ success: true }))
}
