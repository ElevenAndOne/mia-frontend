import { apiFetch } from '../../../utils/api'

interface ChatRequestPayload {
  message: string
  session_id: string | null
  user_id: string
  google_ads_id?: string
  ga4_property_id?: string
  date_range: string
  selected_platforms?: string[]
}

export interface ChatResponse {
  success: boolean
  claude_response?: string
  error?: string
}

export const sendChatMessage = async (payload: ChatRequestPayload) => {
  const response = await apiFetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': payload.session_id || 'default',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json() as Promise<ChatResponse>
}
