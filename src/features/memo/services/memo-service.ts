import { apiFetch } from '../../../utils/api'
import type { ApproveResult, MemoData, MemoDrafts, ScheduleDraftResult } from '../types'

// Not tenant-scoped in the URL — the backend resolves the session's active
// workspace (same convention as /api/whatsapp-alerts/*).

const auth = (sessionId: string) => ({ 'X-Session-ID': sessionId })

async function orThrow(response: Response, fallback: string): Promise<Response> {
  if (response.ok) return response
  const err = await response.json().catch(() => ({}))
  const msg = err?.detail?.message || err?.detail || `${fallback} (${response.status})`
  throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
}

export const fetchLatestMemo = async (
  sessionId: string,
  signal?: AbortSignal,
): Promise<MemoData | null> => {
  const response = await apiFetch('/api/memo/latest', { headers: auth(sessionId), signal })
  if (response.status === 404) return null
  await orThrow(response, 'Failed to load the memo')
  return response.json()
}

export const approveRecommendation = async (
  sessionId: string,
  recId: string,
): Promise<ApproveResult> => {
  const response = await apiFetch(`/api/memo/recommendations/${recId}/approve`, {
    method: 'POST',
    headers: auth(sessionId),
  })
  await orThrow(response, 'Failed to approve the recommendation')
  return response.json()
}

export interface ScheduleDraftInput {
  document_id: string
  platform: 'facebook' | 'instagram'
  scheduled_at: string // ISO 8601 with offset
  timezone?: string
}

/** Schedule one of Mia's drafted posts straight from the memo card — same Quick
 *  Posts path as the canvas Schedule button. */
export const scheduleDraft = async (
  sessionId: string,
  recId: string,
  input: ScheduleDraftInput,
): Promise<ScheduleDraftResult> => {
  const response = await apiFetch(`/api/memo/recommendations/${recId}/drafts/schedule`, {
    method: 'POST',
    headers: { ...auth(sessionId), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await orThrow(response, 'Failed to schedule the post')
  return response.json()
}

/** Throw away a card's drafts and have Mia write three new ones. */
export const redraftRecommendation = async (
  sessionId: string,
  recId: string,
): Promise<{ success: boolean; drafts: MemoDrafts }> => {
  const response = await apiFetch(`/api/memo/recommendations/${recId}/drafts/redraft`, {
    method: 'POST',
    headers: auth(sessionId),
  })
  await orThrow(response, 'Failed to redraft the posts')
  return response.json()
}

export const dismissRecommendation = async (
  sessionId: string,
  recId: string,
): Promise<{ success: boolean }> => {
  const response = await apiFetch(`/api/memo/recommendations/${recId}/dismiss`, {
    method: 'POST',
    headers: auth(sessionId),
  })
  await orThrow(response, 'Failed to dismiss the recommendation')
  return response.json()
}
