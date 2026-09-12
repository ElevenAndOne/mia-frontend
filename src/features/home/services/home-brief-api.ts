// Home brief API — /api/tenants/{tenantId}/home-brief (see routes/home_brief.py).

import { apiFetch } from '../../../utils/api'
import type { BriefCard, HomeBrief } from '../types'

const base = (tenantId: string) => `/api/tenants/${tenantId}/home-brief`
const auth = (sessionId: string) => ({ 'X-Session-ID': sessionId })
const authJson = (sessionId: string) => ({ ...auth(sessionId), 'Content-Type': 'application/json' })

async function orThrow<T>(res: Response, fallback: string): Promise<T> {
  if (res.ok) return res.json() as Promise<T>
  let detail = fallback
  try {
    const body = await res.json()
    detail = (typeof body?.detail === 'string' ? body.detail : body?.detail?.message) || fallback
  } catch {
    /* keep fallback */
  }
  throw new Error(detail)
}

/** Today's brief. The first call for a new workspace builds it on the spot (a few seconds). */
export async function fetchHomeBrief(sessionId: string, tenantId: string): Promise<HomeBrief> {
  const res = await apiFetch(base(tenantId), { headers: auth(sessionId) })
  return orThrow(res, "Couldn't load what's happening this week")
}

/** Rebuild now (admin). Used by the "refresh" affordance and after connecting a platform. */
export async function refreshHomeBrief(sessionId: string, tenantId: string): Promise<HomeBrief> {
  const res = await apiFetch(`${base(tenantId)}/refresh`, {
    method: 'POST',
    headers: auth(sessionId),
  })
  return orThrow(res, "Couldn't refresh")
}

/** Hide a card for `days` (never a blocker — the server refuses). */
export async function dismissBriefCard(
  sessionId: string,
  tenantId: string,
  cardId: string,
  days = 7
): Promise<void> {
  const res = await apiFetch(`${base(tenantId)}/cards/${encodeURIComponent(cardId)}/dismiss`, {
    method: 'POST',
    headers: authJson(sessionId),
    body: JSON.stringify({ days }),
  })
  await orThrow(res, "Couldn't hide that")
}

/** Change a card in place, e.g. after scheduling: new state, title, sub and button. */
export async function patchBriefCard(
  sessionId: string,
  tenantId: string,
  cardId: string,
  patch: Partial<Pick<BriefCard, 'state' | 'title' | 'sub' | 'cta'>>
): Promise<BriefCard> {
  const res = await apiFetch(`${base(tenantId)}/cards/${encodeURIComponent(cardId)}`, {
    method: 'PATCH',
    headers: authJson(sessionId),
    body: JSON.stringify(patch),
  })
  return orThrow(res, "Couldn't update the card")
}
