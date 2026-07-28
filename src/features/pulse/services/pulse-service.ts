// API calls for Mia Pulse (beta usage analytics). Read-only, session-gated.

import { apiFetch, createSessionHeaders } from '../../../utils/api'
import type {
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
