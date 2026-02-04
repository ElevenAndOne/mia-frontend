import { apiFetch } from '../../../utils/api'
import type { GA4Property } from '../types'

export const refreshGa4Properties = async (sessionId: string): Promise<GA4Property[]> => {
  const response = await apiFetch('/api/ga4/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({ session_id: sessionId }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh GA4 properties')
  }

  const data = await response.json()
  return data.properties || []
}
