import { apiFetch, safeJson } from '../../../utils/api'
import type { MiaNote, NoteKind, NoteScope } from '../types'

// /api/notes follows the marketing-context convention: session_id as a query param on
// GET/DELETE and in the JSON body on POST; tenant_id lets a member act on a workspace
// that is not the active one.
const q = (params: Record<string, string | boolean | null | undefined>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')

const fail = async (res: Response, fallback: string): Promise<never> => {
  const body = await safeJson<{ detail?: string }>(res, {})
  throw new Error(body.detail || fallback)
}

export const fetchNotes = async (
  sessionId: string,
  tenantId: string,
  opts: { scope?: NoteScope; campaignId?: string | null; includeRetired?: boolean } = {},
  signal?: AbortSignal
): Promise<MiaNote[]> => {
  const res = await apiFetch(
    `/api/notes?${q({
      session_id: sessionId,
      tenant_id: tenantId,
      scope: opts.scope,
      campaign_id: opts.campaignId,
      include_retired: opts.includeRetired ? 'true' : undefined,
    })}`,
    { signal }
  )
  if (!res.ok) return fail(res, 'Could not load notes')
  const data = await res.json()
  return (data.notes ?? []) as MiaNote[]
}

export const createNote = async (
  sessionId: string,
  tenantId: string,
  input: { text: string; kind: NoteKind; scope: NoteScope; campaignId?: string | null }
): Promise<MiaNote & { created: boolean }> => {
  const res = await apiFetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      tenant_id: tenantId,
      text: input.text,
      kind: input.kind,
      scope: input.scope,
      campaign_id: input.scope === 'campaign' ? (input.campaignId ?? null) : null,
    }),
  })
  if (!res.ok) return fail(res, 'Could not save the note')
  const data = await res.json()
  return data.note
}

export const retireNote = async (
  sessionId: string,
  tenantId: string,
  noteId: string
): Promise<MiaNote> => {
  const res = await apiFetch(
    `/api/notes/${encodeURIComponent(noteId)}?${q({ session_id: sessionId, tenant_id: tenantId })}`,
    { method: 'DELETE' }
  )
  if (!res.ok) return fail(res, 'Could not retire the note')
  return (await res.json()).note
}

export const restoreNote = async (
  sessionId: string,
  tenantId: string,
  noteId: string
): Promise<MiaNote> => {
  const res = await apiFetch(`/api/notes/${encodeURIComponent(noteId)}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, tenant_id: tenantId }),
  })
  if (!res.ok) return fail(res, 'Could not restore the note')
  return (await res.json()).note
}
