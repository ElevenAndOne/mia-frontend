import { apiFetch } from '../../../utils/api'

interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequestPayload {
  message: string
  session_id: string | null
  user_id: string
  google_ads_id?: string
  ga4_property_id?: string
  date_range: string
  selected_platforms?: string[]
  conversation_history?: ChatHistoryMessage[]
}

export interface ChatResponse {
  success: boolean
  claude_response?: string
  error?: string
}

export const sendChatMessage = async (payload: ChatRequestPayload) => {
  // Chat v2: Anthropic native tool_use — Claude decides which tools to call
  const v2Payload = {
    message: payload.message,
    session_id: payload.session_id,
    date_range: payload.date_range,
    selected_platforms: payload.selected_platforms,
    conversation_history: payload.conversation_history,
  }

  const response = await apiFetch('/api/chat/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': payload.session_id || 'default',
    },
    body: JSON.stringify(v2Payload),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json() as Promise<ChatResponse>
}
