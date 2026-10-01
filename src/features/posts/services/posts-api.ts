// Quick Posts API — /api/tenants/{tenantId}/posts. Scheduling itself goes through
// the shared write-action rail (confirmAction with platform "organic"); this module
// is everything after that: list, reschedule, cancel, retry, mark-posted.

import { apiFetch } from '../../../utils/api'
import type { PostListResponse, ScheduledPost } from '../types'

const base = (tenantId: string) => `/api/tenants/${tenantId}/posts`
const auth = (sessionId: string) => ({ 'X-Session-ID': sessionId })
const authJson = (sessionId: string) => ({ ...auth(sessionId), 'Content-Type': 'application/json' })

/** Unwrap FastAPI's error `detail` so failures read as real reasons, not "HTTP 400". */
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

export async function fetchPosts(sessionId: string, tenantId: string): Promise<PostListResponse> {
  const res = await apiFetch(base(tenantId), { headers: auth(sessionId) })
  return orThrow(res, 'Failed to load posts')
}

/** The not-yet-published bookings of one canvas post — "is this already scheduled?". */
export async function fetchBookingsForDocument(
  sessionId: string,
  tenantId: string,
  documentId: string,
): Promise<ScheduledPost[]> {
  const q = new URLSearchParams({
    source_document_id: documentId,
    status: 'scheduled,draft,reminded,failed,publishing',
  })
  const res = await apiFetch(`${base(tenantId)}?${q.toString()}`, { headers: auth(sessionId) })
  const data = await orThrow<PostListResponse>(res, 'Failed to load posts')
  return data.posts ?? []
}

export async function reschedulePost(
  sessionId: string,
  tenantId: string,
  postId: string,
  scheduledAtIso: string,
): Promise<ScheduledPost> {
  const res = await apiFetch(`${base(tenantId)}/${postId}`, {
    method: 'PATCH',
    headers: authJson(sessionId),
    body: JSON.stringify({ scheduled_at: scheduledAtIso }),
  })
  return orThrow(res, 'Failed to reschedule')
}

export async function cancelPost(
  sessionId: string,
  tenantId: string,
  postId: string,
): Promise<ScheduledPost> {
  const res = await apiFetch(`${base(tenantId)}/${postId}`, {
    method: 'PATCH',
    headers: authJson(sessionId),
    body: JSON.stringify({ status: 'canceled' }),
  })
  return orThrow(res, 'Failed to cancel')
}

export async function retryPost(
  sessionId: string,
  tenantId: string,
  postId: string,
): Promise<ScheduledPost> {
  const res = await apiFetch(`${base(tenantId)}/${postId}/retry`, {
    method: 'POST',
    headers: auth(sessionId),
  })
  return orThrow(res, 'Failed to retry')
}

export async function markPosted(
  sessionId: string,
  tenantId: string,
  postId: string,
): Promise<ScheduledPost> {
  const res = await apiFetch(`${base(tenantId)}/${postId}/mark-posted`, {
    method: 'POST',
    headers: authJson(sessionId),
    body: JSON.stringify({}),
  })
  return orThrow(res, 'Failed to update')
}

export interface DeletePostResult {
  deleted: boolean
  post_id: string
  /** A published Instagram row: not deleted, marked for the owner to delete in the app. */
  instagram_manual?: { post_id: string; permalink?: string | null }
  /** Set when the removed Facebook post has a published Instagram twin. Meta's API cannot
   *  delete Instagram media, so that copy is still live until removed in the Instagram app. */
  instagram_still_live?: { post_id: string; permalink?: string | null }
}

export async function deletePost(
  sessionId: string,
  tenantId: string,
  postId: string,
): Promise<DeletePostResult> {
  const res = await apiFetch(`${base(tenantId)}/${postId}`, {
    method: 'DELETE',
    headers: auth(sessionId),
  })
  // orThrow already consumes the body: reading it again threw on every remove (30 Sep 2026).
  return orThrow<DeletePostResult>(res, 'Failed to remove')
}

/** The owner deleted the Instagram post in the Instagram app: drop the marked row. */
export async function confirmDeleted(
  sessionId: string,
  tenantId: string,
  postId: string,
): Promise<void> {
  const res = await apiFetch(`${base(tenantId)}/${postId}/confirm-deleted`, {
    method: 'POST',
    headers: auth(sessionId),
  })
  await orThrow(res, 'Failed to clear the post')
}
