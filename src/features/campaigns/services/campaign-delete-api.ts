// Deleting a campaign: what a delete would leave or stop first, then the delete itself.
// Jobs sent to Flex are cancelled there with the campaign (live 28 Oct: a deleted campaign left its jobs open in Flex).

import { apiFetch } from '../../../utils/api'

export interface FlexJobOpen {
  asset_id: string
  name: string
  stage_label: string
  why?: string
}

export interface DeleteCheck {
  flex_jobs: FlexJobOpen[]
  busy: string | null
}

export type DeleteResult =
  | { ok: true }
  | { ok: false; flexLeft: FlexJobOpen[]; message: string }

const url = (tenantId: string, id: string) => `/api/tenants/${tenantId}/campaigns/${id}`

export async function fetchDeleteCheck(sessionId: string, tenantId: string, id: string): Promise<DeleteCheck> {
  const res = await apiFetch(`${url(tenantId, id)}/delete-check`, { headers: { 'X-Session-ID': sessionId } })
  if (!res.ok) throw new Error("Couldn't check the campaign before deleting it")
  return res.json()
}

// flex: 'cancel' cancels its open Flex jobs first; 'leave' deletes in Mia only (the PM said delete anyway).
export async function deleteCampaignWithFlex(
  sessionId: string,
  tenantId: string,
  id: string,
  flex: 'cancel' | 'leave',
): Promise<DeleteResult> {
  const res = await apiFetch(`${url(tenantId, id)}?flex=${flex}`, { method: 'DELETE', headers: { 'X-Session-ID': sessionId } })
  if (res.ok) return { ok: true }
  const body = await res.json().catch(() => null)
  const detail = body?.detail
  if (detail && typeof detail === 'object') return { ok: false, flexLeft: detail.flex_left ?? [], message: detail.message ?? '' }
  return { ok: false, flexLeft: [], message: typeof detail === 'string' ? detail : "The campaign wasn't deleted." }
}
