import { apiFetch } from '../../../utils/api'

export interface SummaryResponse {
  success: boolean
  type: string
  summary: string
}

export const fetchSummaryInsights = async (sessionId: string, dateRange: string): Promise<SummaryResponse> => {
  const response = await apiFetch('/api/quick-insights/summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,  // CRITICAL: Send session ID in header for workspace context lookup
    },
    body: JSON.stringify({
      session_id: sessionId,
      date_range: dateRange,
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}
