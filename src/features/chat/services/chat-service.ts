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

// --- Canvas (highlight-to-edit) ---------------------------------------------

/** A deliverable Mia rendered in the canvas pane (post copy, brief, ad copy…). */
export interface CanvasDocument {
  id: string          // stable document_id across versions
  title: string
  content: string     // markdown
  doc_type: string    // social_post | ad_copy | email | campaign_brief | content_calendar | generic
  version: number
  created_by?: 'mia' | 'user'
  created_at?: string | null
}

/** A highlighted span the user wants Mia to change. */
export interface DocumentSelection {
  text: string
  start?: number
  end?: number
}

/** Sent on an edit turn so Mia edits the right document (span-patch or full rewrite). */
export interface DocumentContext {
  document_id: string
  title?: string
  doc_type?: string
  current_content: string
  version: number
  selection?: DocumentSelection
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
  document_context?: DocumentContext  // set when the user is editing a canvas document
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

export interface MetaPreviewState {
  id?: string
  name?: string
  status?: string
  daily_budget?: number | null
  lifetime_budget?: number | null
  start_time?: string | null
  end_time?: string | null
}

export interface MetaReachEstimate {
  available?: boolean
  estimate_ready?: boolean
  estimate_mau_lower_bound?: number | null
  estimate_mau_upper_bound?: number | null
  estimate_dau?: number | null
  reason?: string
}

export interface MetaPreview {
  available: boolean
  level?: string
  before?: MetaPreviewState
  after?: MetaPreviewState
  // Creation previews (ad set) have no before-state to diff — the backend returns an
  // audience reach estimate instead.
  create?: boolean
  reach_estimate?: MetaReachEstimate
  error?: string
}

/**
 * Fetch the current vs projected state for a proposed Meta write, for the
 * confirm card's before→after diff. Best-effort: returns {available:false} on
 * any error so the card silently falls back to the text summary.
 */
export const fetchMetaPreview = async (
  sessionId: string,
  action: PendingAction
): Promise<MetaPreview> => {
  try {
    const response = await apiFetch('/api/actions/meta/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
      body: JSON.stringify({ action_type: action.action_type, params: action.params }),
    })
    if (!response.ok) return { available: false }
    return response.json()
  } catch {
    return { available: false }
  }
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
    ...(payload.document_context ? { document_context: payload.document_context } : {}),
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
  onChunk: (chunk: { text?: string; status?: string; done?: boolean; pending_action?: PendingAction; skill_workspaces?: string[]; document?: CanvasDocument; error?: string }) => void,
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
    ...(payload.document_context ? { document_context: payload.document_context } : {}),
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
  skill?: string,
  excludeSkill?: string
): Promise<RecentConversation[]> => {
  const qs = new URLSearchParams()
  if (skill) qs.set('skill', skill)
  if (excludeSkill) qs.set('exclude_skill', excludeSkill)
  const query = qs.toString()
  const url = query ? `/api/chat/v2/conversations?${query}` : '/api/chat/v2/conversations'
  const response = await apiFetch(url, {
    headers: { 'X-Session-ID': sessionId },
  })
  // Throw (rather than swallow to []) so callers can tell a load FAILURE from a
  // genuinely empty history and surface "couldn't load" instead of "no chats" (#13).
  if (!response.ok) throw new Error(`Failed to load conversations (${response.status})`)
  const data = await response.json()
  return data.conversations || []
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
  const response = await apiFetch(`/api/chat/v2/conversations/${conversationId}`, {
    headers: { 'X-Session-ID': sessionId },
  })
  // Throw on failure so opening a past conversation shows "couldn't load"
  // rather than a blank thread that looks like an empty conversation (#13).
  if (!response.ok) throw new Error(`Failed to load conversation (${response.status})`)
  const data = await response.json()
  return data.messages || []
}

// --- Canvas documents -------------------------------------------------------

/** Latest version of each canvas document in a conversation (loads the pane on open). */
export const fetchCanvasDocuments = async (
  sessionId: string,
  conversationId: string
): Promise<CanvasDocument[]> => {
  const response = await apiFetch(`/api/chat/v2/documents/${conversationId}`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) throw new Error(`Failed to load canvas documents (${response.status})`)
  const data = await response.json()
  return (data.documents || []) as CanvasDocument[]
}

/** Full version history for one document (newest first) — undo / diff view. */
export const fetchDocumentVersions = async (
  sessionId: string,
  conversationId: string,
  documentId: string
): Promise<CanvasDocument[]> => {
  const response = await apiFetch(
    `/api/chat/v2/documents/${conversationId}/${documentId}/versions`,
    { headers: { 'X-Session-ID': sessionId } }
  )
  if (!response.ok) throw new Error(`Failed to load versions (${response.status})`)
  const data = await response.json()
  // Backend returns rows without `id`; fold the documentId back in for a uniform shape.
  return ((data.versions || []) as Omit<CanvasDocument, 'id'>[]).map((v) => ({
    ...v,
    id: documentId,
  }))
}

/** Persist the user's own edit to a canvas document as a new version. */
export const saveDocumentEdit = async (
  sessionId: string,
  documentId: string,
  payload: { conversation_id: string; content: string; title?: string; doc_type?: string }
): Promise<{ success: boolean; version?: number; error?: string }> => {
  const response = await apiFetch(`/api/chat/v2/documents/${documentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Failed to save document (${response.status})`)
  return response.json()
}
