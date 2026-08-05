import { apiFetch } from '../../../utils/api'
import type {
  ApplyResult,
  AvailabilityResult,
  SchedulerCampaign,
  SchedulerRunResult,
  SchedulerRunSummary,
} from '../types'

const base = (tenantId: string) => `/api/tenants/${tenantId}/scheduler`
const auth = (sessionId: string) => ({ 'X-Session-ID': sessionId })
const authJson = (sessionId: string) => ({ ...auth(sessionId), 'Content-Type': 'application/json' })

async function orThrow(response: Response, fallback: string) {
  if (response.ok) return response
  const err = await response.json().catch(() => ({}))
  const msg = err?.detail?.message || err?.detail || `${fallback} (${response.status})`
  throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
}

export const listCampaigns = async (
  sessionId: string,
  tenantId: string
): Promise<SchedulerCampaign[]> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/campaigns/`, {
    headers: auth(sessionId),
  })
  await orThrow(response, 'Failed to load campaigns')
  return response.json()
}

export const runScheduler = async (
  sessionId: string,
  tenantId: string,
  params: { campaign_id: string; horizon_start?: string; horizon_days?: number }
): Promise<SchedulerRunResult> => {
  const response = await apiFetch(`${base(tenantId)}/run`, {
    method: 'POST',
    headers: authJson(sessionId),
    body: JSON.stringify(params),
  })
  await orThrow(response, 'Scheduling failed')
  return response.json()
}

export const listSchedulerRuns = async (
  sessionId: string,
  tenantId: string,
  campaignId?: string
): Promise<SchedulerRunSummary[]> => {
  const query = campaignId ? `?campaign_id=${encodeURIComponent(campaignId)}` : ''
  const response = await apiFetch(`${base(tenantId)}/runs${query}`, {
    headers: auth(sessionId),
  })
  await orThrow(response, 'Failed to load scheduler runs')
  const data = await response.json()
  return data.runs ?? []
}

export const getAvailability = async (
  sessionId: string,
  tenantId: string,
  params: { horizon_start?: string; horizon_days: number }
): Promise<AvailabilityResult> => {
  const response = await apiFetch(`${base(tenantId)}/availability`, {
    method: 'POST',
    headers: authJson(sessionId),
    body: JSON.stringify(params),
  })
  await orThrow(response, 'Failed to load team availability')
  return response.json()
}

export const applySchedulerRun = async (
  sessionId: string,
  tenantId: string,
  runId: string
): Promise<ApplyResult> => {
  const response = await apiFetch(`${base(tenantId)}/runs/${runId}/apply`, {
    method: 'POST',
    headers: auth(sessionId),
  })
  await orThrow(response, 'Failed to apply schedule')
  return response.json()
}
