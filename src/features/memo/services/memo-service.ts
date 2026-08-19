import { apiFetch } from '../../../utils/api'
import type { ApproveResult, MemoData } from '../types'

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
