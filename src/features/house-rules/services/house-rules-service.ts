// API calls for the hidden house-rules page. Access is the backend's HOUSE_RULES_EMAILS allowlist.

import { apiFetch, createSessionHeaders } from '../../../utils/api'
import type { CheckResult, Decision, HouseRule, Me, RuleKind, RuleList } from '../types'

/** Carries the status so the page can tell "not on the list" (403) from a failed request. */
export class HouseRulesError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'HouseRulesError'
    this.status = status
  }
}

const BASE = '/api/admin/house-rules'

async function call<T>(path: string, sessionId: string | null, body?: unknown): Promise<T> {
  if (!sessionId) throw new HouseRulesError(401, 'No active session')
  const resp = await apiFetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: createSessionHeaders(sessionId, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!resp.ok) {
    let detail = `Something went wrong (${resp.status}). Try again.`
    try {
      const data = await resp.json()
      if (typeof data?.detail === 'string') detail = data.detail
    } catch {
      // not JSON: keep the plain message
    }
    throw new HouseRulesError(resp.status, detail)
  }
  return resp.json() as Promise<T>
}

export const fetchMe = (sessionId: string | null) => call<Me>(`${BASE}/me`, sessionId)

export const fetchRules = (sessionId: string | null, kind: RuleKind) =>
  call<RuleList>(`${BASE}?kind=${kind}`, sessionId)

export const decideRule = (sessionId: string | null, id: string, decision: Decision, note?: string) =>
  call<HouseRule>(`${BASE}/${encodeURIComponent(id)}/decision`, sessionId, { decision, note: note || null })

export const decideMany = (sessionId: string | null, ids: string[], decision: 'approve' | 'reject') =>
  call<RuleList>(`${BASE}/decisions`, sessionId, { ids, decision })

export const checkPost = (sessionId: string | null, text: string) =>
  call<CheckResult>(`${BASE}/check`, sessionId, { text, social: true })
