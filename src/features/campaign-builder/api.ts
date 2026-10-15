// The new campaign page's calls: /api/tenants/{t}/campaign-builder (staff only while tested).

import { apiFetch } from '../../utils/api'
import type { Board, BriefField, BuildState, KpiGroup, PlanOp, StudioState } from './types'

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
  fields: Partial<Record<BriefField | 'playbook', unknown>>,
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

export async function discardDraft(sessionId: string, tenantId: string, campaignId: string) {
  return check<{ discarded: string }>(
    await apiFetch(`${base(tenantId)}/${campaignId}`, { method: 'DELETE', headers: { 'X-Session-ID': sessionId } }),
  )
}

export async function writeWords(sessionId: string, tenantId: string, campaignId: string, jobIds?: string[], rewrite = false) {
  return check<{ run_id: string }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/words`, {
      method: 'POST',
      headers: json(sessionId),
      body: JSON.stringify({ job_ids: jobIds ?? null, rewrite }),
    }),
  )
}

export async function fetchStudio(sessionId: string, tenantId: string, campaignId: string) {
  return check<StudioState>(await apiFetch(`${base(tenantId)}/${campaignId}/studio`, { headers: { 'X-Session-ID': sessionId } }))
}

export async function editStudio(
  sessionId: string,
  tenantId: string,
  campaignId: string,
  changes: { asset_id: string; credits?: number | null; include?: boolean }[],
  confirmAll = false,
) {
  return check<{ ok: boolean }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/studio`, {
      method: 'PATCH',
      headers: json(sessionId),
      body: JSON.stringify({ changes, confirm_all: confirmAll }),
    }),
  )
}

export async function sendToFlex(sessionId: string, tenantId: string, campaignId: string, actingUserEmail: string) {
  return check<{ sent: number; jobs: number }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/studio/send`, {
      method: 'POST',
      headers: json(sessionId),
      body: JSON.stringify({ acting_user_email: actingUserEmail }),
    }),
  )
}

export async function refreshFromFlex(sessionId: string, tenantId: string, campaignId: string) {
  return check<{ updated: number }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/studio/refresh`, { method: 'POST', headers: json(sessionId) }),
  )
}

export async function fetchBoard(sessionId: string, tenantId: string): Promise<Board> {
  return check(await apiFetch(base(tenantId), { headers: { 'X-Session-ID': sessionId } }))
}

export interface ClientRule {
  rule_id: string
  text: string
  kind: string
  by: string | null
  added: string | null
  origin: 'person' | 'learned'
}

export async function fetchRules(sessionId: string, tenantId: string): Promise<{ rules: ClientRule[] }> {
  return check(await apiFetch(`${base(tenantId)}/rules`, { headers: { 'X-Session-ID': sessionId } }))
}

export async function addRule(sessionId: string, tenantId: string, text: string, kind = 'constraint'): Promise<unknown> {
  return check(
    await apiFetch(`${base(tenantId)}/rules`, { method: 'POST', headers: json(sessionId), body: JSON.stringify({ text, kind }) }),
  )
}

export async function removeRule(sessionId: string, tenantId: string, ruleId: string): Promise<unknown> {
  return check(await apiFetch(`${base(tenantId)}/rules/${ruleId}`, { method: 'DELETE', headers: { 'X-Session-ID': sessionId } }))
}

export async function fetchPlaybooks(sessionId: string, tenantId: string): Promise<{ playbooks: { slug: string; name: string; summary: string }[] }> {
  return check(await apiFetch(`${base(tenantId)}/playbooks`, { headers: { 'X-Session-ID': sessionId } }))
}

export interface DeckRead {
  text: string
  how: string
  pages: number | null
  filename: string
  chars: number
  note?: string | null
}

// The client's deck or brief as text (PDF, PowerPoint, Word, text). Slides that are pictures are transcribed.
export async function readDeck(sessionId: string, tenantId: string, file: File): Promise<DeckRead> {
  const form = new FormData()
  form.append('file', file)
  return check(await apiFetch(`${base(tenantId)}/deck`, { method: 'POST', headers: { 'X-Session-ID': sessionId }, body: form }))
}

export async function repricePlan(sessionId: string, tenantId: string, campaignId: string): Promise<{ priced: number; jobs: number }> {
  return check(await apiFetch(`${base(tenantId)}/${campaignId}/plan/reprice`, { method: 'POST', headers: { 'X-Session-ID': sessionId } }))
}
