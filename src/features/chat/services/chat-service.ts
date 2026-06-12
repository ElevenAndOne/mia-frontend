import { apiFetch } from '../../../utils/api'

interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AttachedDocument {
  filename: string
  content?: string  // text-based files (CSV, Excel)
  b64?: string      // PDFs (sent as native Claude document block)
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
  images?: string[]
  documents?: AttachedDocument[]
  campaign_id?: string
  start_date?: string
  end_date?: string
  workspace_hint?: string
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
  skill_workspaces?: string[]
  error?: string
}

export const confirmAction = async (
  sessionId: string,
  action: PendingAction
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
  if (!response.ok) {
    // Surface the backend's real reason (FastAPI puts it in `detail`) instead of a
    // generic failure — otherwise every rejection shows the same "Action failed" card.
    let detail = `HTTP ${response.status}: ${response.statusText}`
    try {
      const body = await response.json()
      detail = (body?.detail as string) || (body?.error as string) || detail
    } catch {
      /* non-JSON error body — keep the status line */
    }
    return { success: false, error: detail }
  }
  return response.json()
}

export const pollActionStatus = async (
  sessionId: string,
  workflowId: string
): Promise<{ status: string; result?: Record<string, unknown> }> => {
  const response = await apiFetch(`/api/actions/status/${workflowId}`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  return response.json()
}

export const uploadChatFile = async (
  sessionId: string,
  file: File
): Promise<
  | { type: 'image'; data_url: string }
  | { type: 'document'; filename: string; content: string; b64?: never }
  | { type: 'document'; filename: string; b64: string; content?: never }
  | { type: 'pdf_images'; filename: string; pages: string[] }
> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiFetch('/api/chat/v2/upload', {
    method: 'POST',
    headers: { 'X-Session-ID': sessionId },
    body: formData,
  })
  if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
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
    ...(payload.images?.length ? { images: payload.images } : {}),
    ...(payload.documents?.length ? { documents: payload.documents } : {}),
    ...(payload.campaign_id
      ? { campaign_id: payload.campaign_id, start_date: payload.start_date, end_date: payload.end_date }
      : {}),
    ...(payload.workspace_hint ? { workspace_hint: payload.workspace_hint } : {}),
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

export const sendChatMessageStreaming = async (
  payload: ChatRequestPayload,
  onChunk: (chunk: { text?: string; status?: string; done?: boolean; pending_action?: PendingAction; skill_workspaces?: string[]; error?: string }) => void,
  signal?: AbortSignal
): Promise<void> => {
  const v2Payload = {
    message: payload.message,
    session_id: payload.session_id,
    date_range: payload.date_range,
    selected_platforms: payload.selected_platforms,
    conversation_history: payload.conversation_history,
    conversation_id: payload.conversation_id,
    ...(payload.images?.length ? { images: payload.images } : {}),
    ...(payload.documents?.length ? { documents: payload.documents } : {}),
    ...(payload.campaign_id
      ? { campaign_id: payload.campaign_id, start_date: payload.start_date, end_date: payload.end_date }
      : {}),
    ...(payload.workspace_hint ? { workspace_hint: payload.workspace_hint } : {}),
  }

  const response = await apiFetch('/api/chat/v2/stream', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': payload.session_id || 'default',
    },
    body: JSON.stringify(v2Payload),
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const messages = buffer.split('\n\n')
    buffer = messages.pop() ?? ''

    for (const msg of messages) {
      if (!msg.startsWith('data: ')) continue
      try {
        const parsed = JSON.parse(msg.slice(6))
        onChunk(parsed)
      } catch {
        // malformed SSE chunk — ignore
      }
    }
  }
}

export const fetchRecentConversations = async (
  sessionId: string,
  skill?: string
): Promise<RecentConversation[]> => {
  try {
    const url = skill
      ? `/api/chat/v2/conversations?skill=${encodeURIComponent(skill)}`
      : '/api/chat/v2/conversations'
    const response = await apiFetch(url, {
      headers: { 'X-Session-ID': sessionId },
    })
    if (!response.ok) return []
    const data = await response.json()
    return data.conversations || []
  } catch {
    return []
  }
}

export const deleteConversation = async (
  sessionId: string,
  conversationId: string
): Promise<boolean> => {
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

export const renameConversation = async (
  sessionId: string,
  conversationId: string,
  title: string
): Promise<boolean> => {
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

export const pinConversation = async (
  sessionId: string,
  conversationId: string
): Promise<boolean | null> => {
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

export const transcribeAudio = async (
  sessionId: string,
  audioBlob: Blob,
  mimeType: string
): Promise<string> => {
  const formData = new FormData()
  const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : 'wav'
  formData.append('audio', audioBlob, `recording.${ext}`)
  const response = await apiFetch('/api/chat/v2/transcribe', {
    method: 'POST',
    headers: { 'X-Session-ID': sessionId },
    body: formData,
  })
  if (!response.ok) throw new Error(`Transcription failed: ${response.status}`)
  const data = await response.json()
  return data.transcript as string
}

export const fetchConversationMessages = async (
  sessionId: string,
  conversationId: string
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
