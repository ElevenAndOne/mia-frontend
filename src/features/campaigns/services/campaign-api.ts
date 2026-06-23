// Campaign API — all `/api/tenants/{tenantId}/campaigns` calls in one place.
// Read helpers parse + return data (throw on failure); mutation helpers return
// the raw Response so callers (hooks) can do optimistic commit-on-confirm.

import { apiFetch } from '../../../utils/api'
import type { CampaignDetail, CampaignSummary, ChannelConfig, LinkedCampaign } from '../types'

const base = (tenantId: string) => `/api/tenants/${tenantId}/campaigns`
const auth = (sessionId: string) => ({ 'X-Session-ID': sessionId })
const authJson = (sessionId: string) => ({ ...auth(sessionId), 'Content-Type': 'application/json' })

type Json = Record<string, unknown>

// ── Reads ────────────────────────────────────────────────────────────────

export async function fetchCampaignList(sessionId: string, tenantId: string): Promise<CampaignSummary[]> {
  const res = await apiFetch(`${base(tenantId)}/`, { headers: auth(sessionId) })
  if (!res.ok) throw new Error('Failed to load campaigns')
  return res.json()
}

export async function fetchCampaignDetail(
  sessionId: string,
  tenantId: string,
  campaignId: string,
): Promise<CampaignDetail> {
  const res = await apiFetch(`${base(tenantId)}/${campaignId}`, { headers: auth(sessionId) })
  if (!res.ok) throw new Error('Failed to load campaign detail')
  return res.json()
}

export async function fetchPlatformCampaigns(
  sessionId: string,
  tenantId: string,
  channel: string,
): Promise<{ campaigns: LinkedCampaign[]; message?: string }> {
  const res = await apiFetch(`${base(tenantId)}/platform-campaigns?channel=${channel}`, {
    headers: auth(sessionId),
  })
  if (!res.ok) throw new Error('Failed to load platform campaigns')
  return res.json()
}

export async function fetchHubspotLists(sessionId: string, tenantId: string) {
  const res = await apiFetch(`${base(tenantId)}/hubspot-lists`, { headers: auth(sessionId) })
  return res.ok ? res.json() : null
}

export async function fetchBrevoLists(sessionId: string, tenantId: string) {
  const res = await apiFetch(`${base(tenantId)}/brevo-lists`, { headers: auth(sessionId) })
  return res.ok ? res.json() : null
}

export async function fetchChannelConfig(
  sessionId: string,
  tenantId: string,
): Promise<ChannelConfig | null> {
  const res = await apiFetch(`/api/tenants/${tenantId}/channel-config`, { headers: auth(sessionId) })
  return res.ok ? res.json() : null
}

// ── Campaign-level mutations (return Response) ─────────────────────────────

export const updateCampaign = (s: string, t: string, id: string, fields: Json) =>
  apiFetch(`${base(t)}/${id}`, { method: 'PUT', headers: authJson(s), body: JSON.stringify(fields) })

export const deleteCampaign = (s: string, t: string, id: string) =>
  apiFetch(`${base(t)}/${id}`, { method: 'DELETE', headers: auth(s) })

export const setPrimaryCampaign = (s: string, t: string, id: string) =>
  apiFetch(`${base(t)}/${id}/set-primary`, { method: 'PATCH', headers: auth(s) })

export const linkCampaignGuide = (s: string, t: string, id: string, guideId: string | null) =>
  apiFetch(`${base(t)}/${id}/guide`, {
    method: 'PATCH',
    headers: authJson(s),
    body: JSON.stringify({ guide_id: guideId }),
  })

export const updateObjectives = (s: string, t: string, id: string, objectives: string[]) =>
  apiFetch(`${base(t)}/${id}/objectives`, {
    method: 'PUT',
    headers: authJson(s),
    body: JSON.stringify({ objectives }),
  })

export const updateChannelConfig = (s: string, t: string, config: ChannelConfig) =>
  apiFetch(`/api/tenants/${t}/channel-config`, {
    method: 'PATCH',
    headers: authJson(s),
    body: JSON.stringify(config),
  })

// ── Phase / KPI ────────────────────────────────────────────────────────────

export const patchPhase = (s: string, t: string, id: string, phaseId: string, fields: Json) =>
  apiFetch(`${base(t)}/${id}/phases/${phaseId}`, {
    method: 'PATCH',
    headers: authJson(s),
    body: JSON.stringify(fields),
  })

export const createKpi = (s: string, t: string, id: string, phaseId: string, body: Json) =>
  apiFetch(`${base(t)}/${id}/phases/${phaseId}/kpis`, {
    method: 'POST',
    headers: authJson(s),
    body: JSON.stringify(body),
  })

export const patchKpi = (s: string, t: string, id: string, kpiId: number, fields: Json) =>
  apiFetch(`${base(t)}/${id}/kpis/${kpiId}`, {
    method: 'PATCH',
    headers: authJson(s),
    body: JSON.stringify(fields),
  })

export const deleteKpi = (s: string, t: string, id: string, kpiId: number) =>
  apiFetch(`${base(t)}/${id}/kpis/${kpiId}`, { method: 'DELETE', headers: auth(s) })

// ── Channel actions ──────────────────────────────────────────────────────

export const createChannelAction = (s: string, t: string, id: string, phaseId: string, body: Json) =>
  apiFetch(`${base(t)}/${id}/phases/${phaseId}/channel_actions`, {
    method: 'POST',
    headers: authJson(s),
    body: JSON.stringify(body),
  })

export const patchChannelAction = (s: string, t: string, id: string, actionId: string, fields: Json) =>
  apiFetch(`${base(t)}/${id}/channel_actions/${actionId}`, {
    method: 'PATCH',
    headers: authJson(s),
    body: JSON.stringify(fields),
  })

export const deleteChannelAction = (s: string, t: string, id: string, actionId: string) =>
  apiFetch(`${base(t)}/${id}/channel_actions/${actionId}`, { method: 'DELETE', headers: auth(s) })

// ── Assets ───────────────────────────────────────────────────────────────

export const createAsset = (s: string, t: string, id: string, actionId: string, body: Json) =>
  apiFetch(`${base(t)}/${id}/channel_actions/${actionId}/assets`, {
    method: 'POST',
    headers: authJson(s),
    body: JSON.stringify(body),
  })

export const patchAsset = (s: string, t: string, id: string, assetId: string, fields: Json) =>
  apiFetch(`${base(t)}/${id}/assets/${assetId}`, {
    method: 'PATCH',
    headers: authJson(s),
    body: JSON.stringify(fields),
  })

export const deleteAsset = (s: string, t: string, id: string, assetId: string) =>
  apiFetch(`${base(t)}/${id}/assets/${assetId}`, { method: 'DELETE', headers: auth(s) })
