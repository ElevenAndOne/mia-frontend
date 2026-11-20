// API calls for the hidden house-rules page. Access is the backend's HOUSE_RULES_EMAILS allowlist.

import { apiFetch, createSessionHeaders } from '../../../utils/api'
import type {
  Benchmarks,
  CheckResult,
  Decision,
  HouseRule,
  JobName,
  Me,
  NewsCard,
  NewsDecision,
  NewsDecisionResult,
  NewsList,
  RuleKind,
  RuleList,
} from '../types'

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

export const fetchNews = (sessionId: string | null) => call<NewsList>(`${BASE}/news`, sessionId)

export const decideNews = (sessionId: string | null, id: string, decision: NewsDecision, ruleText?: string) =>
  call<NewsDecisionResult>(`${BASE}/news/${encodeURIComponent(id)}/decision`, sessionId, {
    decision,
    rule_text: ruleText?.trim() || null,
  })

export const addClientNotes = (sessionId: string | null, id: string, text?: string) =>
  call<NewsCard>(`${BASE}/news/${encodeURIComponent(id)}/client-notes`, sessionId, { text: text?.trim() || null })

export const takeBackClientNotes = (sessionId: string | null, id: string) =>
  call<NewsCard>(`${BASE}/news/${encodeURIComponent(id)}/client-notes/take-back`, sessionId, {})

export const fetchBenchmarks = (sessionId: string | null, weeks = 6) =>
  call<Benchmarks>(`${BASE}/benchmarks?weeks=${weeks}`, sessionId)

export const runJob = (sessionId: string | null, job: Exclude<JobName, 'house_rules_digest'>) =>
  call<{ started: boolean; job: string }>(`${BASE}/jobs/${job}/run`, sessionId, {})
