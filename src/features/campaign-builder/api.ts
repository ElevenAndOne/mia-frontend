// The new campaign page's calls: /api/tenants/{t}/campaign-builder (staff only while tested).

import { apiFetch } from '../../utils/api'
import type { BriefField, BuildState, KpiGroup, PlanOp } from './types'

const base = (tenantId: string) => `/api/tenants/${tenantId}/campaign-builder`
const json = (sessionId: string) => ({ 'X-Session-ID': sessionId, 'Content-Type': 'application/json' })

async function check<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>
  let detail = `Request failed (${res.status})`
  try {
    const body = await res.json()
    if (typeof body?.detail === 'string') detail = body.detail
  } catch {
    // keep the status line
  }
  throw new Error(detail)
}

export async function fetchBuild(sessionId: string, tenantId: string, campaignId: string): Promise<BuildState> {
  return check(await apiFetch(`${base(tenantId)}/${campaignId}`, { headers: { 'X-Session-ID': sessionId } }))
}

export async function startBuild(
  sessionId: string,
  tenantId: string,
  body: { pm_text: string; deck_text?: string; name?: string },
): Promise<{ campaign_id: string }> {
  return check(await apiFetch(base(tenantId), { method: 'POST', headers: json(sessionId), body: JSON.stringify(body) }))
}

export async function saveBrief(
  sessionId: string,
  tenantId: string,
  campaignId: string,
  fields: Partial<Record<BriefField, unknown>>,
  name?: string,
): Promise<{ version: number }> {
  return check(
    await apiFetch(`${base(tenantId)}/${campaignId}/brief`, {
      method: 'PUT',
      headers: json(sessionId),
      body: JSON.stringify({ fields, name }),
    }),
  )
}

export async function redraftBrief(sessionId: string, tenantId: string, campaignId: string, answers: string[]) {
  return check<{ run_id: string }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/brief/redraft`, {
      method: 'POST',
      headers: json(sessionId),
      body: JSON.stringify({ answers }),
    }),
  )
}

export async function makePlan(sessionId: string, tenantId: string, campaignId: string) {
  return check<{ run_id: string }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/plan`, { method: 'POST', headers: json(sessionId) }),
  )
}

export async function editPlan(sessionId: string, tenantId: string, campaignId: string, ops: PlanOp[]) {
  return check<BuildState>(
    await apiFetch(`${base(tenantId)}/${campaignId}/plan`, {
      method: 'PATCH',
      headers: json(sessionId),
      body: JSON.stringify({ ops }),
    }),
  )
}

export async function approvePlan(sessionId: string, tenantId: string, campaignId: string) {
  return check<{ campaign_id: string; status: string }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/approve`, { method: 'POST', headers: json(sessionId) }),
  )
}

export async function fetchKpiOptions(sessionId: string, tenantId: string, campaignId: string) {
  return check<{ groups: KpiGroup[] }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/kpis`, { headers: { 'X-Session-ID': sessionId } }),
  )
}
