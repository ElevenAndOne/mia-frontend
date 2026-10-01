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

async function send<T>(sessionId: string, path: string, method = 'GET', body?: unknown): Promise<T> {
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

export const fetchPeople = async (sessionId: string, tenantId: string): Promise<WorkspacePerson[]> => {
  const d = await send<{ people?: WorkspacePerson[] } | WorkspacePerson[]>(sessionId, `${base(tenantId)}/people`)
  return Array.isArray(d) ? d : (d.people ?? [])
}

export const updatePerson = (
  sessionId: string,
  tenantId: string,
  personId: string,
  patch: { display_name?: string; relation?: string }
) => send<unknown>(sessionId, `${base(tenantId)}/people/${encodeURIComponent(personId)}`, 'PATCH', patch)

export const deletePerson = (sessionId: string, tenantId: string, personId: string) =>
  send<unknown>(sessionId, `${base(tenantId)}/people/${encodeURIComponent(personId)}`, 'DELETE')

export const fetchLearnedRules = async (sessionId: string, tenantId: string): Promise<LearnedRule[]> => {
  const d = await send<{ rules?: LearnedRule[] }>(sessionId, `${base(tenantId)}/learned-rules`)
  return d.rules ?? []
}

export const updateLearnedRule = (
  sessionId: string,
  tenantId: string,
  id: string,
  patch: { status?: 'active' | 'off'; text?: string }
) => send<unknown>(sessionId, `${base(tenantId)}/learned-rules/${encodeURIComponent(id)}`, 'PATCH', patch)

export const deleteLearnedRule = (sessionId: string, tenantId: string, id: string) =>
  send<unknown>(sessionId, `${base(tenantId)}/learned-rules/${encodeURIComponent(id)}`, 'DELETE')

export const resetLearnedRules = (sessionId: string, tenantId: string) =>
  send<unknown>(sessionId, `${base(tenantId)}/learned-rules/reset`, 'POST', {})
