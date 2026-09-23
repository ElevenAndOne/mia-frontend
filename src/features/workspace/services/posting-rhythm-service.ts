/**
 * Posting rhythm (loop step 4) and watched creative folders (step 5).
 *
 * The rhythm is mostly counted from the workspace's own history; only what a person sets is
 * stored. `source` says which is which so the card can show "from your posts" honestly.
 */
import { apiFetch } from '../../../utils/api'

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface PostingCadence {
  posts_per_week: number
  best_days: Weekday[]
  nudge_enabled: boolean
  hard_cap: number
  source: { posts_per_week: 'set' | 'history' | 'default'; best_days: 'set' | 'history' | 'none' }
  last_nudge_at: string | null
  this_week: { published: number; scheduled: number; queued_ahead: number; week_start: string }
}

export interface CreativeWatch {
  id: number
  kind: 'drive' | 'canva'
  ref: string
  label: string | null
  active: boolean
  seen: number
  last_polled_at: string | null
  last_error: string | null
}

const headers = (sessionId: string) => ({
  'X-Session-ID': sessionId,
  'Content-Type': 'application/json',
})

const detailOf = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body = await response.json()
    return typeof body?.detail === 'string' ? body.detail : fallback
  } catch {
    return fallback
  }
}

export const fetchCadence = async (sessionId: string, tenantId: string): Promise<PostingCadence> => {
  const res = await apiFetch(`/api/whatsapp-alerts/workspace/${tenantId}/cadence`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!res.ok) throw new Error(await detailOf(res, 'Could not load your posting rhythm'))
  return res.json()
}

export const updateCadence = async (
  sessionId: string,
  tenantId: string,
  body: {
    posts_per_week?: number
    best_days?: Weekday[]
    nudge_enabled?: boolean
    reset_posts_per_week?: boolean
    reset_best_days?: boolean
  }
): Promise<void> => {
  const res = await apiFetch(`/api/whatsapp-alerts/workspace/${tenantId}/cadence`, {
    method: 'PATCH',
    headers: headers(sessionId),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await detailOf(res, 'Could not save your posting rhythm'))
}

export const fetchCreativeWatches = async (
  sessionId: string,
  tenantId: string
): Promise<CreativeWatch[]> => {
  const res = await apiFetch(`/api/tenants/${tenantId}/creative-watches`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!res.ok) throw new Error(await detailOf(res, 'Could not load watched folders'))
  const data = (await res.json()) as { watches: CreativeWatch[] }
  return data.watches
}

export const addCreativeWatch = async (
  sessionId: string,
  tenantId: string,
  body: { url?: string; kind?: 'canva' }
): Promise<CreativeWatch> => {
  const res = await apiFetch(`/api/tenants/${tenantId}/creative-watches`, {
    method: 'POST',
    headers: headers(sessionId),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await detailOf(res, 'Could not watch that folder'))
  return res.json()
}

export const removeCreativeWatch = async (
  sessionId: string,
  tenantId: string,
  watchId: number
): Promise<void> => {
  const res = await apiFetch(`/api/tenants/${tenantId}/creative-watches/${watchId}`, {
    method: 'DELETE',
    headers: { 'X-Session-ID': sessionId },
  })
  if (!res.ok) throw new Error(await detailOf(res, 'Could not stop watching that folder'))
}
