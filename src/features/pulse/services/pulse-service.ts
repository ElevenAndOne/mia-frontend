// API calls for Mia Pulse (beta usage analytics). Read-only, session-gated.

import { apiFetch, createSessionHeaders } from '../../../utils/api'
import type {
  FeedbackRecent,
  FeedbackSummary,
  Overview,
  PulseFilter,
  TesterDetail,
  TesterList,
  Timeseries,
  Topics,
  WorkspaceList,
} from '../types'

/** Thrown so the UI can distinguish "not on the allowlist" (403) from other failures. */
export class PulseError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'PulseError'
    this.status = status
  }
}

async function get<T>(path: string, sessionId: string | null): Promise<T> {
  if (!sessionId) throw new PulseError(401, 'No active session')
  const resp = await apiFetch(path, { headers: createSessionHeaders(sessionId) })
  if (!resp.ok) {
    if (resp.status === 403) {
      throw new PulseError(403, 'Your account is not on the Mia Pulse allowlist.')
    }
    throw new PulseError(resp.status, `Request failed (${resp.status})`)
  }
  return resp.json() as Promise<T>
}

const BASE = '/api/admin/analytics'

/** Serialise the workspace/user filter into repeatable query params. */
function scopeParams(filter?: PulseFilter): string {
  if (!filter) return ''
  const parts: string[] = []
  for (const t of filter.tenantIds) parts.push(`tenant_id=${encodeURIComponent(t)}`)
  if (filter.userId) parts.push(`user_id=${encodeURIComponent(filter.userId)}`)
  return parts.length ? `&${parts.join('&')}` : ''
}

export const fetchWorkspaces = (sessionId: string | null) =>
  get<WorkspaceList>(`${BASE}/workspaces`, sessionId)

export const fetchOverview = (sessionId: string | null, range: string, filter?: PulseFilter) =>
  get<Overview>(`${BASE}/overview?range=${encodeURIComponent(range)}${scopeParams(filter)}`, sessionId)

export const fetchTimeseries = (
  sessionId: string | null,
  metric: 'questions' | 'active_users',
  range: string,
  filter?: PulseFilter
) =>
  get<Timeseries>(
    `${BASE}/timeseries?metric=${metric}&range=${encodeURIComponent(range)}${scopeParams(filter)}`,
    sessionId
  )

export const fetchTesters = (sessionId: string | null, range: string, filter?: PulseFilter) =>
  get<TesterList>(`${BASE}/testers?range=${encodeURIComponent(range)}${scopeParams(filter)}`, sessionId)

export const fetchTesterDetail = (sessionId: string | null, googleUserId: string, filter?: PulseFilter) => {
  // Only the workspace part of the filter applies — the detail is already one user.
  const params = (filter?.tenantIds ?? []).map((t) => `tenant_id=${encodeURIComponent(t)}`).join('&')
  return get<TesterDetail>(
    `${BASE}/testers/${encodeURIComponent(googleUserId)}${params ? `?${params}` : ''}`,
    sessionId
  )
}

export const fetchTopics = (sessionId: string | null, range: string, filter?: PulseFilter) =>
  get<Topics>(`${BASE}/topics?range=${encodeURIComponent(range)}${scopeParams(filter)}`, sessionId)

export const fetchFeedbackSummary = (sessionId: string | null, range: string, filter?: PulseFilter) =>
  get<FeedbackSummary>(
    `${BASE}/feedback/summary?range=${encodeURIComponent(range)}${scopeParams(filter)}`,
    sessionId
  )

// --- Ask Mia Pulse (LLM Q&A over the analytics) ------------------------------

export interface AskChunk {
  text?: string
  status?: string
  done?: boolean
  error?: string
}

export interface AskPayload {
  question: string
  history?: { role: 'user' | 'assistant'; content: string }[]
  range?: string
  tenant_ids?: string[]
  user_ids?: string[]
  tenant_names?: string[]
  user_name?: string
}

/** Stream an answer from POST /ask. Calls onChunk per SSE event until done/error. */
export async function askPulse(
  sessionId: string | null,
  payload: AskPayload,
  onChunk: (chunk: AskChunk) => void,
  signal?: AbortSignal
): Promise<void> {
  if (!sessionId) throw new PulseError(401, 'No active session')
  const resp = await apiFetch(`${BASE}/ask`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', ...createSessionHeaders(sessionId) },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    if (resp.status === 403) throw new PulseError(403, 'Not on the Mia Pulse allowlist.')
    throw new PulseError(resp.status, `Ask failed (${resp.status})`)
  }
  const reader = resp.body?.getReader()
  if (!reader) throw new PulseError(500, 'No response body')
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const evt of events) {
      if (!evt.startsWith('data: ')) continue
      try {
        onChunk(JSON.parse(evt.slice(6)))
      } catch {
        // malformed SSE chunk — ignore
      }
    }
  }
}

export const fetchFeedbackRecent = (
  sessionId: string | null,
  range: string,
  rating: 'down' | 'up' | 'all',
  filter?: PulseFilter
) =>
  get<FeedbackRecent>(
    `${BASE}/feedback/recent?range=${encodeURIComponent(range)}&rating=${rating}${scopeParams(filter)}`,
    sessionId
  )
