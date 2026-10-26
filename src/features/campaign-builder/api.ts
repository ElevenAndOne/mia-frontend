// The new campaign page's calls: /api/tenants/{t}/campaign-builder (staff only while tested).

import { apiFetch } from '../../utils/api'
import type { Board, BriefField, BuildState, KpiGroup, LaunchState, PlanOp, ResultsState, StudioState } from './types'

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
  answered?: { id: string; answer: string | null }[],
): Promise<{ version: number }> {
  return check(
    await apiFetch(`${base(tenantId)}/${campaignId}/brief`, {
      method: 'PUT',
      headers: json(sessionId),
      body: JSON.stringify({ fields, name, answered }),
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

// After a big brief change: keep this plan with the new brief instead of remaking it.
export async function keepPlan(sessionId: string, tenantId: string, campaignId: string) {
  return check<{ ok: boolean }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/plan/keep`, { method: 'POST', headers: json(sessionId) }),
  )
}

// Skip a question: Mia decides and says what she assumed.
export async function skipQuestion(sessionId: string, tenantId: string, campaignId: string, id: string) {
  return check<{ assumed: string }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/questions/${id}/skip`, { method: 'POST', headers: json(sessionId) }),
  )
}

// Mia's numbers into every empty target box (for plans made before she did it while planning).
export async function fillTargets(sessionId: string, tenantId: string, campaignId: string) {
  return check<{ filled: number }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/targets/fill`, { method: 'POST', headers: json(sessionId) }),
  )
}

// Mia checks the campaign as it stands now.
export async function finalCheck(sessionId: string, tenantId: string, campaignId: string) {
  return check<Record<string, unknown>>(
    await apiFetch(`${base(tenantId)}/${campaignId}/plan/check`, { method: 'POST', headers: json(sessionId) }),
  )
}

// A change the chat proposed: Apply applies exactly the stored edits; Not now drops them.
export async function applyChange(sessionId: string, tenantId: string, campaignId: string, id: string) {
  return check<{ ok: boolean }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/pending/${id}/apply`, { method: 'POST', headers: json(sessionId) }),
  )
}

export async function dropChange(sessionId: string, tenantId: string, campaignId: string, id: string) {
  return check<{ ok: boolean }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/pending/${id}`, { method: 'DELETE', headers: json(sessionId) }),
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

// pastFindings: the PM confirmed approving past the open findings of Mia's final check (the server asks once).
export async function approvePlan(sessionId: string, tenantId: string, campaignId: string, pastFindings = false) {
  return check<{ campaign_id: string; status: string }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/approve${pastFindings ? '?past_findings=true' : ''}`, {
      method: 'POST',
      headers: json(sessionId),
    }),
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

export async function fetchLaunch(sessionId: string, tenantId: string, campaignId: string): Promise<LaunchState> {
  return check(await apiFetch(`${base(tenantId)}/${campaignId}/launch`, { headers: { 'X-Session-ID': sessionId } }))
}

export async function launchAction(
  sessionId: string,
  tenantId: string,
  campaignId: string,
  what: 'take-in' | 'mark' | 'schedule' | 'not-on-page',
  body: Record<string, unknown>,
): Promise<unknown> {
  return check(
    await apiFetch(`${base(tenantId)}/${campaignId}/launch/${what}`, { method: 'POST', headers: json(sessionId), body: JSON.stringify(body) }),
  )
}

export async function fetchResults(sessionId: string, tenantId: string, campaignId: string): Promise<ResultsState> {
  return check(await apiFetch(`${base(tenantId)}/${campaignId}/results`, { headers: { 'X-Session-ID': sessionId } }))
}

export async function writeDebrief(sessionId: string, tenantId: string, campaignId: string): Promise<{ status: string; reason?: string }> {
  return check(await apiFetch(`${base(tenantId)}/${campaignId}/results/debrief`, { method: 'POST', headers: json(sessionId) }))
}

// The guide attached to this campaign, and the guides uploaded in Settings it could attach (only an attached one is
// read as this campaign's guide; 22 Oct).
export interface GuideOption {
  id: string
  filename: string
  uploaded: string | null
  campaign_name?: string | null
  attached_to?: string | null
}
export async function fetchGuides(
  sessionId: string,
  tenantId: string,
  campaignId: string,
): Promise<{ attached: GuideOption | null; available: GuideOption[] }> {
  return check(await apiFetch(`${base(tenantId)}/${campaignId}/guides`, { headers: { 'X-Session-ID': sessionId } }))
}

export async function attachGuide(
  sessionId: string,
  tenantId: string,
  campaignId: string,
  guideId: string | null,
): Promise<{ attached: string | null; run_id: string | null }> {
  return check(
    await apiFetch(`${base(tenantId)}/${campaignId}/guide`, {
      method: 'PUT',
      headers: json(sessionId),
      body: JSON.stringify({ guide_id: guideId }),
    }),
  )
}

// "These are right": Mia's drafted brief fields become the PM's (no new brief version, so the plan stays current).
export async function confirmBrief(sessionId: string, tenantId: string, campaignId: string, fields: string[]) {
  return check<{ set_by_pm: string[] }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/brief/confirm`, {
      method: 'POST',
      headers: json(sessionId),
      body: JSON.stringify({ fields }),
    }),
  )
}
