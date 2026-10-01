import { apiFetch } from '../../../utils/api'

/**
 * What Mia remembers about a Basic workspace (30 Sep 2026): the people in the owner's life
 * (services/people_roster.py) and the rules she has learned from their edits.
 */

export interface WorkspacePersonFace {
  crop_url: string
  confirmed?: boolean
}

export interface WorkspacePerson {
  person_id: string
  display_name: string
  relation: string | null
  aliases: string[]
  is_owner: boolean
  confirmed: boolean
  faces: WorkspacePersonFace[]
}

export interface LearnedRule {
  id: string
  text: string
  origin: string
  evidence_count: number
  status: 'active' | 'off' | 'suggested' | string
  scope: string
  created_at: string | null
}

const base = (tenantId: string) => `/api/workspaces/${encodeURIComponent(tenantId)}`

async function send<T>(
  sessionId: string,
  path: string,
  method = 'GET',
  body?: unknown
): Promise<T> {
  const r = await apiFetch(path, {
    method,
    headers: {
      'X-Session-ID': sessionId,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(`${method} ${path} failed (${r.status})`)
  return r.status === 204 ? (undefined as T) : ((await r.json()) as T)
}

/** The API's shape (routes/workspace_memory.py, services/people_roster.person_dict). */
interface ApiPerson {
  id?: string
  name?: string
  person_id?: string
  display_name?: string
  relation?: string | null
  aliases?: string[]
  is_owner?: boolean
  confirmed?: boolean
  faces?: (string | WorkspacePersonFace)[]
}

/** The API sends id/name and faces as URLs; the card reads person_id/display_name and
 *  {crop_url}. Read either, so names never show blank (1 Oct 2026). */
const toPerson = (p: ApiPerson): WorkspacePerson => ({
  person_id: p.person_id ?? p.id ?? '',
  display_name: p.display_name ?? p.name ?? '',
  relation: p.relation ?? null,
  aliases: p.aliases ?? [],
  is_owner: Boolean(p.is_owner),
  confirmed: Boolean(p.confirmed),
  faces: (p.faces ?? []).map((f) => (typeof f === 'string' ? { crop_url: f } : f)),
})

export const fetchPeople = async (
  sessionId: string,
  tenantId: string
): Promise<WorkspacePerson[]> => {
  const d = await send<{ people?: ApiPerson[] } | ApiPerson[]>(
    sessionId,
    `${base(tenantId)}/people`
  )
  return (Array.isArray(d) ? d : (d.people ?? [])).map(toPerson)
}

export const updatePerson = (
  sessionId: string,
  tenantId: string,
  personId: string,
  patch: { display_name?: string; relation?: string }
) =>
  send<unknown>(sessionId, `${base(tenantId)}/people/${encodeURIComponent(personId)}`, 'PATCH', {
    name: patch.display_name,
    relation: patch.relation,
  })

export interface AddPersonFace {
  index: number
  crop_url: string
  position: string
}

export type AddPersonResult =
  | { needs_pick: true; photo_url: string; faces: AddPersonFace[] }
  | { needs_pick?: false; person: WorkspacePerson | null; notice: string | null }

/** Add a person (or another photo of someone saved) from a photo and a name. A photo with
 *  several people comes back as faces to pick from; send again with photo_url + face_index. */
export const addPerson = async (
  sessionId: string,
  tenantId: string,
  args: { name: string; relation?: string; photo?: File; photoUrl?: string; faceIndex?: number }
): Promise<AddPersonResult> => {
  const form = new FormData()
  form.append('name', args.name)
  form.append('relation', args.relation ?? '')
  if (args.photo) form.append('photo', args.photo)
  if (args.photoUrl) form.append('photo_url', args.photoUrl)
  if (args.faceIndex !== undefined) form.append('face_index', String(args.faceIndex))
  const r = await apiFetch(`${base(tenantId)}/people`, {
    method: 'POST',
    headers: { 'X-Session-ID': sessionId },
    body: form,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok)
    throw new Error((data as { detail?: string }).detail || `Couldn't add them (${r.status})`)
  if ((data as { needs_pick?: boolean }).needs_pick) return data as AddPersonResult
  const d = data as { person: ApiPerson | null; notice: string | null }
  return { person: d.person ? toPerson(d.person) : null, notice: d.notice }
}

export const deletePerson = (sessionId: string, tenantId: string, personId: string) =>
  send<unknown>(sessionId, `${base(tenantId)}/people/${encodeURIComponent(personId)}`, 'DELETE')

export const fetchLearnedRules = async (
  sessionId: string,
  tenantId: string
): Promise<LearnedRule[]> => {
  const d = await send<{ rules?: LearnedRule[] }>(sessionId, `${base(tenantId)}/learned-rules`)
  return d.rules ?? []
}

export const updateLearnedRule = (
  sessionId: string,
  tenantId: string,
  id: string,
  patch: { status?: 'active' | 'off'; text?: string }
) =>
  send<unknown>(
    sessionId,
    `${base(tenantId)}/learned-rules/${encodeURIComponent(id)}`,
    'PATCH',
    patch
  )

export const deleteLearnedRule = (sessionId: string, tenantId: string, id: string) =>
  send<unknown>(sessionId, `${base(tenantId)}/learned-rules/${encodeURIComponent(id)}`, 'DELETE')

export const resetLearnedRules = (sessionId: string, tenantId: string) =>
  send<unknown>(sessionId, `${base(tenantId)}/learned-rules/reset`, 'POST', {})
