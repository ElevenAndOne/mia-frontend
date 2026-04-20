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
  conversation_id?: string
}

export interface RecentConversation {
  conversation_id: string
  title: string
  is_pinned: boolean
  last_at: string | null
  message_count: number
}

export interface PendingAction {
  action_type: string
  platform: string
  summary: string
  params: Record<string, unknown>
  continue_chain?: boolean
}

export interface ChatResponse {
  success: boolean
  claude_response?: string
  pending_action?: PendingAction
  error?: string
}

export const confirmAction = async (
  sessionId: string,
  action: PendingAction,
): Promise<{ success: boolean; workflow_id?: string; error?: string }> => {
  const response = await apiFetch('/api/actions/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({
      action_type: action.action_type,
      platform: action.platform,
      params: action.params,
    }),
  })
  return response.json()
}

export const pollActionStatus = async (
  sessionId: string,
  workflowId: string,
): Promise<{ status: string; result?: Record<string, unknown> }> => {
  const response = await apiFetch(`/api/actions/status/${workflowId}`, {
    headers: { 'X-Session-ID': sessionId },
  })
  return response.json()
}

export const sendChatMessage = async (payload: ChatRequestPayload, signal?: AbortSignal) => {
  const v2Payload = {
    message: payload.message,
    session_id: payload.session_id,
    date_range: payload.date_range,
    selected_platforms: payload.selected_platforms,
    conversation_history: payload.conversation_history,
    conversation_id: payload.conversation_id,
  }

  const response = await apiFetch('/api/chat/v2', {
    method: 'POST',
    signal,
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

export const fetchRecentConversations = async (sessionId: string): Promise<RecentConversation[]> => {
  try {
    const response = await apiFetch('/api/chat/v2/conversations', {
      headers: { 'X-Session-ID': sessionId },
    })
    if (!response.ok) return []
    const data = await response.json()
    return data.conversations || []
  } catch {
    return []
  }
}

export const deleteConversation = async (sessionId: string, conversationId: string): Promise<boolean> => {
  try {
    const response = await apiFetch(`/api/chat/v2/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: { 'X-Session-ID': sessionId },
    })
    if (!response.ok) return false
    const data = await response.json()
    return data.success === true
  } catch {
    return false
  }
}

export const renameConversation = async (sessionId: string, conversationId: string, title: string): Promise<boolean> => {
  try {
    const response = await apiFetch(`/api/chat/v2/conversations/${conversationId}/title`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({ title }),
    })
    if (!response.ok) return false
    const data = await response.json()
    return data.success === true
  } catch {
    return false
  }
}

export const pinConversation = async (sessionId: string, conversationId: string): Promise<boolean | null> => {
  try {
    const response = await apiFetch(`/api/chat/v2/conversations/${conversationId}/pin`, {
      method: 'PATCH',
      headers: { 'X-Session-ID': sessionId },
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.is_pinned as boolean
  } catch {
    return null
  }
}

export const fetchConversationMessages = async (
  sessionId: string,
  conversationId: string,
): Promise<ChatHistoryMessage[]> => {
  try {
    const response = await apiFetch(`/api/chat/v2/conversations/${conversationId}`, {
      headers: { 'X-Session-ID': sessionId },
    })
    if (!response.ok) return []
    const data = await response.json()
    return data.messages || []
  } catch {
    return []
  }
}
