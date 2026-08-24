// Campaign API — all `/api/tenants/{tenantId}/campaigns` calls in one place.
// Read helpers parse + return data (throw on failure); mutation helpers return
// the raw Response so callers (hooks) can do optimistic commit-on-confirm.

import { apiFetch } from '../../../utils/api'
import type { CampaignDetail, CampaignLaunchReadiness, CampaignSummary, ChannelConfig, DriveFolderListing, GooglePushPreview, GooglePushResult, GoogleSearchSuggestion, LaunchCheckSnapshot, LaunchCheckWaiver, LinkedCampaign, LinkedContent, LinkedContentSave, MetaAudienceSuggestion, MetaPushPreview, MetaPushResult, SyncResult } from '../types'

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

// Everything linkable across the whole campaign, grouped phase → channel, with the
// date-window suggestions already worked out server-side.
export async function fetchLinkedContent(
  sessionId: string,
  tenantId: string,
  campaignId: string,
): Promise<LinkedContent> {
  const res = await apiFetch(`${base(tenantId)}/${campaignId}/linked-content`, {
    headers: auth(sessionId),
  })
  if (!res.ok) throw new Error('Failed to load linked content')
  return res.json()
}

export const saveLinkedContent = (
  s: string,
  t: string,
  id: string,
  channels: LinkedContentSave[],
) =>
  apiFetch(`${base(t)}/${id}/linked-content`, {
    method: 'PUT',
    headers: authJson(s),
    body: JSON.stringify({ channels }),
  })

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

/** Campaign built by a builder-chat conversation (canvas restore for past builds). */
export const fetchCampaignByConversation = async (
  s: string,
  t: string,
  conversationId: string,
): Promise<string | null> => {
  const res = await apiFetch(`${base(t)}/by-conversation/${conversationId}`, {
    headers: auth(s),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.campaign_id ?? null
}

export interface AssetVersionRow {
  version: number
  asset_name: string | null
  key_message: string | null
  cta: string | null
  headline: string | null
  deliverable_url: string | null
  edited_by: string | null
  edited_by_email: string | null
  created_at: string | null
  is_me: boolean
}

/** Shared edit timeline for an asset (newest first). */
export const fetchAssetVersions = async (
  s: string,
  t: string,
  id: string,
  assetId: string,
): Promise<AssetVersionRow[]> => {
  const res = await apiFetch(`${base(t)}/${id}/assets/${assetId}/versions`, { headers: auth(s) })
  if (!res.ok) return []
  return (await res.json()).versions ?? []
}

/** Apply a past version's snapshot (appends a new version — history is never rewritten). */
export const restoreAssetVersion = (s: string, t: string, id: string, assetId: string, version: number) =>
  apiFetch(`${base(t)}/${id}/assets/${assetId}/versions/${version}/restore`, {
    method: 'POST',
    headers: auth(s),
  })

/** Build the UTM'd Final URL for an asset (utm_source=meta, utm_medium=paid_social,
 * campaign/asset auto). persist=false — the caller saves via the normal patch path. */
export const buildAssetFinalUrl = async (
  s: string,
  t: string,
  id: string,
  assetId: string,
  baseUrl: string,
): Promise<string> => {
  const res = await apiFetch(`${base(t)}/${id}/assets/${assetId}/final-url`, {
    method: 'POST',
    headers: authJson(s),
    body: JSON.stringify({ base_url: baseUrl, persist: false }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || 'Failed to build UTM URL')
  return body.final_url as string
}

/** Upload a creative image for an asset — appended to deliverable_url (ClickUp "Final Asset"). */
export const uploadAssetMedia = async (
  s: string,
  t: string,
  id: string,
  assetId: string,
  file: File,
): Promise<{ url: string; deliverable_url: string }> => {
  const form = new FormData()
  form.append('file', file)
  const res = await apiFetch(`${base(t)}/${id}/assets/${assetId}/media`, {
    method: 'POST',
    headers: auth(s),
    body: form,
  })
  if (!res.ok) throw new Error('Failed to upload image')
  return res.json()
}

// ── Google Drive creative picker ──────────────────────────────────────────

// Lists a link-shared Drive folder (subfolders + images/videos, natural-sorted).
// 422s carry a human fix ("share the folder as Anyone with the link…").
export async function browseDriveFolder(
  s: string,
  t: string,
  folderUrlOrId: string,
): Promise<DriveFolderListing> {
  const res = await apiFetch(`${base(t)}/drive/browse?url=${encodeURIComponent(folderUrlOrId)}`, {
    headers: auth(s),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || `Drive browse failed (${res.status})`)
  return body as DriveFolderListing
}

// ── Ask Mia (inline field suggestion) ─────────────────────────────────────

export interface SuggestFieldBody {
  field_label: string
  phase_name?: string
  channel?: string
  asset_name?: string
  asset_type?: string
  current_value?: string
}

export async function suggestField(
  s: string,
  t: string,
  id: string,
  body: SuggestFieldBody,
): Promise<string> {
  const res = await apiFetch(`${base(t)}/${id}/suggest-field`, {
    method: 'POST',
    headers: authJson(s),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Suggestion failed')
  const data = await res.json()
  return data.suggestion ?? ''
}

// ── ClickUp ──────────────────────────────────────────────────────────────

export async function fetchClickupSync(s: string, t: string, id: string): Promise<SyncResult> {
  const res = await apiFetch(`${base(t)}/${id}/clickup-sync`, { headers: auth(s) })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.detail || 'Sync check failed')
  }
  return res.json()
}

// Calls the ClickUp plugin SDK (list_spaces, list_folders, list_folder_lists,
// push_campaign_summary, update_campaign_summary). Returns the `result` payload.
export async function invokeClickup(
  s: string,
  t: string,
  action: string,
  data: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const res = await apiFetch(`/api/tenants/${t}/plugins/clickup/invoke/${action}`, {
    method: 'POST',
    headers: authJson(s),
    body: JSON.stringify({ data }),
  })
  if (!res.ok) {
    let detail = `ClickUp ${action} failed (${res.status})`
    try { const err = await res.json(); detail = err.detail || detail } catch { /* non-JSON */ }
    throw new Error(detail)
  }
  const body = await res.json()
  return body.result
}

// ── Meta push ──────────────────────────────────────────────────────────────

// Preflight: everything push-to-meta WOULD do, without doing it — derived
// objective/budget/flight/audience/ads + capabilities + blocking errors.
export async function fetchMetaPushPreview(
  s: string,
  t: string,
  campaignId: string,
  actionId: string,
): Promise<MetaPushPreview> {
  const res = await apiFetch(
    `${base(t)}/${campaignId}/channel_actions/${actionId}/push-preview`,
    { headers: auth(s) },
  )
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || `Preview failed (${res.status})`)
  return body as MetaPushPreview
}

// The ad account's saved custom audiences (for the preflight include/exclude pickers).
export async function fetchMetaCustomAudiences(
  s: string,
  t: string,
  campaignId: string,
): Promise<{ name: string; subtype: string; approx_size: number | null }[]> {
  const res = await apiFetch(`${base(t)}/${campaignId}/meta-custom-audiences`, { headers: auth(s) })
  if (!res.ok) return []
  const body = await res.json().catch(() => null)
  return body?.audiences ?? []
}

// Mia proposes Advantage+ starting signals (interest/behavior seed names + demo
// range) from the campaign context. Nothing persists until the PM applies + pushes.
export async function suggestMetaAudience(
  s: string,
  t: string,
  campaignId: string,
  actionId: string,
): Promise<MetaAudienceSuggestion> {
  const res = await apiFetch(
    `${base(t)}/${campaignId}/channel_actions/${actionId}/suggest-audience`,
    { method: 'POST', headers: authJson(s), body: '{}' },
  )
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || 'Suggestion failed')
  return body as MetaAudienceSuggestion
}

// Pushes a Meta Ads channel action's READY assets to Meta as a PAUSED
// campaign → ad set → ads. The backend starts a durable workflow and returns
// its id immediately (the push can outlive any single HTTP request — Meta ids
// are written back server-side even if we stop polling); we poll the generic
// workflow-status endpoint until it settles.
const PUSH_POLL_MS = 3000
const PUSH_POLL_MAX = 100 // ~5 min — the workflow keeps going server-side regardless

export async function pushChannelActionToMeta(
  s: string,
  t: string,
  campaignId: string,
  actionId: string,
  overrides: { default_cta?: string } = {},
): Promise<MetaPushResult> {
  const res = await apiFetch(
    `${base(t)}/${campaignId}/channel_actions/${actionId}/push-to-meta`,
    { method: 'POST', headers: authJson(s), body: JSON.stringify(overrides) },
  )
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || `Push to Meta failed (${res.status})`)

  const workflowId: string = body.workflow_id
  for (let i = 0; i < PUSH_POLL_MAX; i++) {
    await new Promise((r) => setTimeout(r, PUSH_POLL_MS))
    const poll = await apiFetch(`/api/actions/status/${workflowId}`, { headers: auth(s) })
    const st = await poll.json().catch(() => null)
    if (!st) continue
    if (st.status === 'completed') return st.result as MetaPushResult
    if (st.status && st.status !== 'running') {
      throw new Error(`Push to Meta ${st.status} — check the workflow logs (${workflowId})`)
    }
  }
  throw new Error(
    'Still pushing — Meta is taking a while. The push continues server-side; refresh the campaign in a minute to see the scheduled ads.',
  )
}

// ── Google Ads push (mirrors the Meta push above; Search/RSA only) ──────────

// Preflight: everything push-to-google WOULD do — derived daily budget/bidding/
// flight + per-asset ad groups (keywords + RSA copy w/ inline problems) + capabilities.
export async function fetchGooglePushPreview(
  s: string,
  t: string,
  campaignId: string,
  actionId: string,
): Promise<GooglePushPreview> {
  const res = await apiFetch(
    `${base(t)}/${campaignId}/channel_actions/${actionId}/google-push-preview`,
    { headers: auth(s) },
  )
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || `Preview failed (${res.status})`)
  return body as GooglePushPreview
}

// Mia drafts keywords + RSA copy per READY asset from the campaign context.
// Nothing persists — the modal saves the PM-approved copy via patchAsset.
export async function suggestGoogleSearch(
  s: string,
  t: string,
  campaignId: string,
  actionId: string,
): Promise<GoogleSearchSuggestion> {
  const res = await apiFetch(
    `${base(t)}/${campaignId}/channel_actions/${actionId}/suggest-google-search`,
    { method: 'POST', headers: authJson(s), body: '{}' },
  )
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || 'Suggestion failed')
  return body as GoogleSearchSuggestion
}

// Pushes a Google Ads channel action's READY assets as ONE atomic mutate:
// PAUSED Search campaign → one ad group (keyword theme + RSA) per asset.
// All-or-nothing — a failed push creates nothing. Same start-then-poll shape
// as pushChannelActionToMeta (deterministic workflow id server-side).
export async function pushChannelActionToGoogle(
  s: string,
  t: string,
  campaignId: string,
  actionId: string,
  overrides: { daily_budget?: number | null } = {},
): Promise<GooglePushResult> {
  const res = await apiFetch(
    `${base(t)}/${campaignId}/channel_actions/${actionId}/push-to-google`,
    { method: 'POST', headers: authJson(s), body: JSON.stringify(overrides) },
  )
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || `Push to Google failed (${res.status})`)

  const workflowId: string = body.workflow_id
  for (let i = 0; i < PUSH_POLL_MAX; i++) {
    await new Promise((r) => setTimeout(r, PUSH_POLL_MS))
    const poll = await apiFetch(`/api/actions/status/${workflowId}`, { headers: auth(s) })
    const st = await poll.json().catch(() => null)
    if (!st) continue
    if (st.status === 'completed') return st.result as GooglePushResult
    if (st.status && st.status !== 'running') {
      throw new Error(`Push to Google ${st.status} — check the workflow logs (${workflowId})`)
    }
  }
  throw new Error(
    'Still pushing — Google is taking a while. The push continues server-side; refresh the campaign in a minute to see the scheduled ads.',
  )
}

// ── Launch readiness ───────────────────────────────────────────────────────

// The campaign roll-up: the last saved check per pushable channel. Reads stored
// snapshots only — no ad-platform calls, so it is safe to load on open.
export async function fetchCampaignLaunchReadiness(
  s: string,
  t: string,
  campaignId: string,
): Promise<CampaignLaunchReadiness> {
  const res = await apiFetch(`${base(t)}/${campaignId}/launch-checks`, { headers: auth(s) })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || 'Failed to load launch readiness')
  return body as CampaignLaunchReadiness
}

// Run one channel's preflight now and save the result. Deliberately slow: it asks
// the ad platform about the account, the objects and the creative URLs.
export async function runLaunchChecks(
  s: string,
  t: string,
  campaignId: string,
  actionId: string,
): Promise<LaunchCheckSnapshot> {
  const res = await apiFetch(
    `${base(t)}/${campaignId}/channel_actions/${actionId}/launch-checks`,
    { method: 'POST', headers: auth(s) },
  )
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || `Readiness check failed (${res.status})`)
  return body as LaunchCheckSnapshot
}

// Accept a warning, on the record. Admin only; blockers are refused server-side.
// Returns the restated snapshot (same findings, waiver applied) so the screen can
// update without paying for another round of platform reads.
export async function waiveLaunchCheck(
  s: string,
  t: string,
  campaignId: string,
  actionId: string,
  code: string,
  reason?: string,
): Promise<{ waiver: LaunchCheckWaiver; snapshot: LaunchCheckSnapshot | null }> {
  const res = await apiFetch(
    `${base(t)}/${campaignId}/channel_actions/${actionId}/launch-checks/waivers`,
    { method: 'POST', headers: authJson(s), body: JSON.stringify({ code, reason: reason || null }) },
  )
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || `Could not waive that check (${res.status})`)
  return body as { waiver: LaunchCheckWaiver; snapshot: LaunchCheckSnapshot | null }
}

// Merge keys into the channel's push profile. A plain channel-action PATCH would
// replace the whole profile and take the PM-approved audience with it.
export async function patchPushConfig(
  s: string,
  t: string,
  campaignId: string,
  actionId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const res = await apiFetch(
    `${base(t)}/${campaignId}/channel_actions/${actionId}/launch-checks/push-config`,
    { method: 'PATCH', headers: authJson(s), body: JSON.stringify({ patch }) },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail || `Could not save that setting (${res.status})`)
  }
}

export async function revokeLaunchCheckWaiver(
  s: string,
  t: string,
  campaignId: string,
  actionId: string,
  code: string,
): Promise<{ snapshot: LaunchCheckSnapshot | null }> {
  const res = await apiFetch(
    `${base(t)}/${campaignId}/channel_actions/${actionId}/launch-checks/waivers/${encodeURIComponent(code)}`,
    { method: 'DELETE', headers: auth(s) },
  )
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.detail || `Could not remove that waiver (${res.status})`)
  return body as { snapshot: LaunchCheckSnapshot | null }
}
