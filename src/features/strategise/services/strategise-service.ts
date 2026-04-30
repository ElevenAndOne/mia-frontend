import { apiFetch } from '../../../utils/api'
import type {
  CampaignInfo,
  OptimizerRunResult,
  OptimizerRunSummary,
  ParsedConstraints,
  RunAnalysis,
  RunParams,
} from '../types'

export const getActiveCampaign = async (
  sessionId: string,
  tenantId: string,
): Promise<CampaignInfo | null> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/campaigns/tracker`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) return null
  const data = await response.json()
  return data.campaign ?? null
}

export const runOptimizer = async (
  sessionId: string,
  tenantId: string,
  params: RunParams,
): Promise<OptimizerRunResult> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/optimizer/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({ ...params, include_explain: true }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg =
      err?.detail?.message || err?.detail || `Optimisation failed (${response.status})`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }

  return response.json()
}

export const listOptimizerRuns = async (
  sessionId: string,
  tenantId: string,
): Promise<OptimizerRunSummary[]> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/optimizer/runs`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) return []
  return response.json()
}

export const parseConstraints = async (
  sessionId: string,
  tenantId: string,
  payload: { free_text: string; phases: Array<{ phase_id: string; phase_name: string }>; total_budget: number; currency: string },
): Promise<ParsedConstraints> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/optimizer/parse-constraints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error('Could not parse constraints')
  return response.json()
}

export const analyzeRun = async (
  sessionId: string,
  tenantId: string,
  runId: string,
): Promise<RunAnalysis> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/optimizer/runs/${runId}/analyze`, {
    method: 'POST',
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) throw new Error('Could not generate analysis')
  return response.json()
}
