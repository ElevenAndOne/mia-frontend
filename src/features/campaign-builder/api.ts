// The new campaign page's calls: /api/tenants/{t}/campaign-builder (staff only while tested).

import { apiFetch } from '../../utils/api'
import type { Board, BriefField, BuildState, KpiGroup, LaunchState, PlanOp, ResultsState, StudioState } from './types'

const base = (tenantId: string) => `/api/tenants/${tenantId}/campaign-builder`
const json = (sessionId: string) => ({ 'X-Session-ID': sessionId, 'Content-Type': 'application/json' })

type ValidationItem = { loc?: (string | number)[]; msg?: string; type?: string; ctx?: { max_length?: number } }

/** FastAPI's 422 detail is a list; turn its first item into a sentence a PM can act on
 *  (a long pasted brief used to show only "Request failed (422)", sweep 12 Nov). */
function validationMessage(items: ValidationItem[]): string {
  const it = items[0] ?? {}
  const field = String((it.loc ?? []).filter((p) => p !== 'body').slice(-1)[0] ?? 'text').replace(/_/g, ' ')
  if (it.type === 'string_too_long' && it.ctx?.max_length) {
    return `That's too long: the ${field} can be at most ${it.ctx.max_length.toLocaleString()} characters. Shorten it, or attach it as a file.`
  }
  return it.msg ? `${it.msg} (${field})` : 'Some of what was sent could not be read.'
}

async function check<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>
  let detail = `Request failed (${res.status})`
  try {
    const body = await res.json()
    if (typeof body?.detail === 'string') detail = body.detail
    else if (Array.isArray(body?.detail) && body.detail.length) detail = validationMessage(body.detail)
  } catch {
    // keep the status line
  }
  throw new Error(detail)
}

/** Make this the campaign the home tracker shows (the workspace's starred campaign). Admin-only on the server: a
 *  member gets a plain reason instead of the silent failure the home dropdown gives (home tracker plan, 2 Nov). */
export async function showOnHome(sessionId: string, tenantId: string, campaignId: string): Promise<void> {
  const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/set-primary`, {
    method: 'PATCH',
    headers: { 'X-Session-ID': sessionId },
  })
  if (res.status === 403) throw new Error('Only a workspace admin can choose the campaign on home.')
  await check(res)
}

/** Read and save the workspace brand guide from the builder page (the same two calls as Settings → Brand Guide, saved
 *  as read: the PM can review the fields in Settings). Admin-only on the server, said plainly here (3 Nov). */
export async function addBrandGuide(sessionId: string, tenantId: string, file: File): Promise<void> {
  const form = new FormData()
  form.append('file', file)
  const admin = 'Only a workspace admin can add the brand guide.'
  const q = `session_id=${encodeURIComponent(sessionId)}&tenant_id=${encodeURIComponent(tenantId)}`
  const read = await apiFetch(`/api/marketing-context/upload-brand-guide?${q}`, { method: 'POST', body: form })
  if (read.status === 403) throw new Error(admin)
  const got = await check<{ filename: string; extracted: Record<string, unknown>; brand_guide_raw: string }>(read)
  const save = await apiFetch('/api/marketing-context/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      tenant_id: tenantId,
      brand_guide_filename: got.filename,
      brand_guide_raw: got.brand_guide_raw,
      brand_guide_extracted: got.extracted,
    }),
  })
  if (save.status === 403) throw new Error(admin)
  await check(save)
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

/** A chat canvas deliverable, as the canvas parsed it: the job's words and how it runs (budget, flight, measure). */
export interface CanvasJob {
  phase: string
  name: string
  channel: string
  format?: string
  primary_text?: string
  hashtags?: string
  headline?: string
  description?: string
  headlines?: string[]
  descriptions?: string[]
  keywords?: string[]
  cta?: string
  link?: string
  visuals?: string[]
  media?: string[]
  notes?: { label: string; value: string }[]
  conversation_id?: string
  document_id?: string
}

/** "Add to campaign" on the chat canvas for a builder campaign: one card on its page, applied there (step 5). */
export async function addFromCanvas(sessionId: string, tenantId: string, campaignId: string, job: CanvasJob) {
  return check<{ card_id: string; change: string[] }>(
    await apiFetch(`${base(tenantId)}/${campaignId}/from-canvas`, {
      method: 'POST',
      headers: json(sessionId),
      body: JSON.stringify(job),
    }),
  )
}

// Put back what an answer changed in the plan; the answer stays answered.
export async function undoAnswer(sessionId: string, tenantId: string, campaignId: string, questionId: string) {
  return check<BuildState>(
    await apiFetch(`${base(tenantId)}/${campaignId}/answers/${encodeURIComponent(questionId)}/undo`, {
      method: 'POST',
      headers: json(sessionId),
    }),
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
