import { apiFetch } from '../../../utils/api'

export interface GoldInsightsResponse {
  success: boolean
  status: 'no_data' | 'triggered' | 'running' | 'completed' | 'failed'
  summary: string | null
  created_at: string | null
  job_status: string | null
  failure_reason: string | null
}

export const fetchGoldInsights = async (sessionId: string): Promise<GoldInsightsResponse> => {
  const response = await apiFetch('/api/gold-insights/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({ session_id: sessionId }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}
