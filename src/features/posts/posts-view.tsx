import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/button'
import { Edit03 } from '../../components/icon/edit-03'
import { Spinner } from '../../components/spinner'
import { useSession } from '../../contexts/session-context'
import { useToast } from '../../contexts/toast-context'
import { Modal } from '../overlay'
import { deletePost, fetchPosts, markPosted, reschedulePost, retryPost } from './services/posts-api'
import type { PostStatus, ScheduledPost } from './types'

/**
 * Posts — the Quick Posts home. For basic-tier workspaces this IS the content
 * calendar: every scheduled/published organic post, no campaign concepts.
 * Rows open a platform-style detail view (the post as it will appear) with the
 * manage actions; quick actions stay on the row.
 */

const STATUS_STYLE: Record<PostStatus, { label: string; cls: string; dot: string }> = {
  scheduled: { label: 'Scheduled', cls: 'bg-utility-warning-100 text-utility-warning-700', dot: 'bg-utility-warning-700' },
  publishing: { label: 'Publishing', cls: 'bg-utility-info-100 text-utility-info-700', dot: 'bg-utility-info-700' },
  published: { label: 'Published', cls: 'bg-utility-success-100 text-utility-success-700', dot: 'bg-utility-success-700' },
  failed: { label: 'Failed', cls: 'bg-utility-error-100 text-utility-error-700', dot: 'bg-utility-error-700' },
  canceled: { label: 'Canceled', cls: 'bg-tertiary text-quaternary', dot: 'bg-quaternary' },
  reminded: { label: 'Ready to post', cls: 'bg-utility-info-100 text-utility-info-700', dot: 'bg-utility-info-700' },
  draft: { label: 'Draft', cls: 'bg-tertiary text-quaternary', dot: 'bg-quaternary' },
}

const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
}

const MODE_EXPLANATION: Record<string, string> = {
  native_fb: 'Facebook is holding this post in the Page’s scheduled queue and will publish it itself.',
  mia: 'Mia will publish this at the scheduled time.',
  manual: 'Mia will remind you when it’s time to post it yourself.',
}

const isVideoUrl = (url: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

/** Local datetime-local input value for a stored ISO timestamp. */
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const StatusPill = ({ status }: { status: PostStatus }) => {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.draft
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full label-xs font-semibold shrink-0 ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

/** Shared mutation runner: every action funnels through here for busy/toast/refresh. */
const usePostActions = (onChanged: (p: ScheduledPost) => void) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const tenantId = activeWorkspace?.tenant_id
  const [busy, setBusy] = useState(false)

  const run = useCallback(
    async (
      fn: (sessionId: string, tenantId: string) => Promise<ScheduledPost | null>,
      okMsg: string,
      after?: () => void,
    ) => {
      if (!sessionId || !tenantId || busy) return
      setBusy(true)
      try {
        const updated = await fn(sessionId, tenantId)
        if (updated) onChanged(updated)
        showToast('success', okMsg)
        after?.()
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setBusy(false)
      }
    },
    [sessionId, tenantId, busy, onChanged, showToast],
  )

  return { busy, run }
}

const removeConfirmText = (post: ScheduledPost) =>
  post.status !== 'published'
    ? 'Remove this post? It will not be published.'
    : post.platform === 'facebook'
      ? 'Remove this post? This also DELETES the live post from Facebook.'
      : 'Remove this post from the list? Instagram doesn’t let apps delete posts — the live post stays until you delete it in the Instagram app.'

const whenLine = (post: ScheduledPost) =>
  post.status === 'published' && post.published_at
    ? `Published ${fmtWhen(post.published_at)}`
    : post.status === 'canceled'
      ? `Was set for ${fmtWhen(post.scheduled_at)}`
      : `Scheduled for ${fmtWhen(post.scheduled_at)}`

// ── Detail modal — the post as it will appear, plus the manage actions ──────

const PostDetailModal = ({
  post,
  onClose,
  onChanged,
  onRemoved,
}: {
  post: ScheduledPost
  onClose: () => void
  onChanged: (p: ScheduledPost) => void
  onRemoved: (postId: string) => void
}) => {
  const { busy, run } = usePostActions(onChanged)
  const [editingTime, setEditingTime] = useState(false)
  const [newTime, setNewTime] = useState(() => toLocalInput(post.scheduled_at))

  const pending = post.status === 'scheduled' || post.status === 'reminded' || post.status === 'failed'
  const initial = (post.target_name || 'P').slice(0, 1).toUpperCase()

  return (
    <Modal isOpen onClose={onClose} title={post.title || 'Post'} size="md">
      <div className="flex flex-col gap-4">
        {/* Platform-style post preview */}
        <div className="rounded-xl border border-secondary bg-primary overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
            <span className="w-9 h-9 rounded-full bg-brand-solid text-primary-onbrand flex items-center justify-center paragraph-sm font-semibold">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="paragraph-sm font-semibold text-primary truncate">
                {post.target_name || PLATFORM_LABEL[post.platform] || post.platform}
              </p>
              <p className="paragraph-xs text-quaternary">
                {PLATFORM_LABEL[post.platform] ?? post.platform} · {whenLine(post)}
              </p>
            </div>
            <div className="ml-auto">
              <StatusPill status={post.status} />
            </div>
          </div>

          <p className="px-4 pb-3 paragraph-sm text-primary whitespace-pre-wrap break-words">
            {post.copy}
          </p>

          {post.media_urls.length > 0 && (
            <div className="border-t border-tertiary bg-secondary">
              {isVideoUrl(post.media_urls[0]) ? (
                <video src={post.media_urls[0]} controls className="w-full max-h-96 object-contain bg-black" />
              ) : (
                <img
                  src={post.media_urls[0]}
                  alt=""
                  className="w-full max-h-96 object-contain bg-black/20"
                />
              )}
              {post.media_urls.length > 1 && (
                <div className="flex gap-1.5 p-2 overflow-x-auto">
                  {post.media_urls.slice(1).map((url) =>
                    isVideoUrl(url) ? (
                      <video key={url} src={url} className="h-16 rounded-md object-cover" />
                    ) : (
                      <img key={url} src={url} alt="" className="h-16 rounded-md object-cover" />
                    ),
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Facts */}
        <div className="flex flex-col gap-1">
          <p className="paragraph-xs text-quaternary">
            {MODE_EXPLANATION[post.publish_mode] ?? ''}
          </p>
          {post.created_by && (
            <p className="paragraph-xs text-quaternary">Scheduled by {post.created_by}</p>
          )}
          {post.status === 'failed' && post.error && (
            <p className="paragraph-xs text-utility-error-600">{post.error}</p>
          )}
          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noreferrer"
              className="paragraph-xs text-utility-brand-600 hover:underline"
            >
              View on {PLATFORM_LABEL[post.platform] ?? 'platform'} ↗
            </a>
          )}
        </div>

        {/* Actions */}
        {editingTime ? (
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="flex-1 px-2.5 py-1.5 border border-tertiary rounded-lg paragraph-sm bg-primary text-primary outline-none focus:border-utility-brand-400"
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void run(
                  (s, t) => reschedulePost(s, t, post.post_id, new Date(newTime).toISOString()),
                  'Post rescheduled',
                ).then(() => setEditingTime(false))
              }
            >
              Save time
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingTime(false)}>
              Back
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {pending && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setEditingTime(true)}>
                Reschedule
              </Button>
            )}
            {post.status === 'failed' && post.publish_mode !== 'native_fb' && (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void run((s, t) => retryPost(s, t, post.post_id), 'Retrying')}
              >
                Retry
              </Button>
            )}
            {post.status === 'reminded' && (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void run((s, t) => markPosted(s, t, post.post_id), 'Marked as posted')}
              >
                Mark as posted
              </Button>
            )}
            {post.status !== 'publishing' && (
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(removeConfirmText(post))) {
                    void run(
                      async (s, t) => {
                        await deletePost(s, t, post.post_id)
                        return null
                      },
                      'Post removed',
                      () => {
                        onRemoved(post.post_id)
                        onClose()
                      },
                    )
                  }
                }}
              >
                Remove post
              </Button>
            )}
            <div className="ml-auto">
              <Button size="sm" variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── List row ─────────────────────────────────────────────────────────────────

const PostRow = ({
  post,
  onOpen,
  onChanged,
  onRemoved,
}: {
  post: ScheduledPost
  onOpen: (p: ScheduledPost) => void
  onChanged: (p: ScheduledPost) => void
  onRemoved: (postId: string) => void
}) => {
  const { busy, run } = usePostActions(onChanged)
  const firstLine = (post.copy || '').split('\n').find((l) => l.trim()) ?? ''
  const thumb = post.media_urls[0]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(post)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(post)}
      className="flex items-center gap-3.5 p-3.5 rounded-xl border border-secondary bg-primary cursor-pointer hover:border-tertiary transition-colors text-left"
    >
      {thumb && !isVideoUrl(thumb) ? (
        <img src={thumb} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 border border-tertiary" />
      ) : thumb ? (
        <video src={thumb} className="w-11 h-11 rounded-lg object-cover shrink-0 border border-tertiary" />
      ) : (
        <div className="w-11 h-11 rounded-lg shrink-0 bg-tertiary flex items-center justify-center text-quaternary">
          <Edit03 size={16} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="paragraph-sm font-semibold text-primary truncate">
          {post.title || firstLine || 'Untitled post'}
        </p>
        <p className="paragraph-xs text-quaternary truncate">
          {PLATFORM_LABEL[post.platform] ?? post.platform}
          {post.target_name ? ` · ${post.target_name}` : ''} · {whenLine(post)}
        </p>
        {post.status === 'failed' && post.error && (
          <p className="paragraph-xs text-utility-error-600 truncate" title={post.error}>
            {post.error}
          </p>
        )}
      </div>

      <StatusPill status={post.status} />

      {/* Quick actions — clicks must not open the detail view */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {post.status !== 'publishing' && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm(removeConfirmText(post))) {
                void run(
                  async (s, t) => {
                    await deletePost(s, t, post.post_id)
                    return null
                  },
                  'Post removed',
                  () => onRemoved(post.post_id),
                )
              }
            }}
          >
            Remove
          </Button>
        )}
        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            className="paragraph-xs text-utility-brand-600 hover:underline whitespace-nowrap px-1"
          >
            View ↗
          </a>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const PostsView = () => {
  const { sessionId, activeWorkspace } = useSession()
  const navigate = useNavigate()
  const tenantId = activeWorkspace?.tenant_id

  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // React Query: revisits render instantly from cache (background refetch keeps
  // the list fresh); row mutations write through to the cache below.
  const { data, error: queryError, refetch } = useQuery({
    queryKey: ['posts', tenantId],
    queryFn: async () => (await fetchPosts(sessionId!, tenantId!)).posts,
    enabled: !!sessionId && !!tenantId,
  })
  const posts = data ?? null
  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to load posts'
    : null

  const onChanged = useCallback(
    (updated: ScheduledPost) => {
      queryClient.setQueryData<ScheduledPost[]>(['posts', tenantId], (prev) =>
        prev?.map((p) => (p.post_id === updated.post_id ? updated : p)) ?? prev,
      )
    },
    [queryClient, tenantId],
  )

  const onRemoved = useCallback(
    (postId: string) => {
      queryClient.setQueryData<ScheduledPost[]>(['posts', tenantId], (prev) =>
        prev?.filter((p) => p.post_id !== postId) ?? prev,
      )
    },
    [queryClient, tenantId],
  )

  const scheduledCount = useMemo(
    () => posts?.filter((p) => p.status === 'scheduled' || p.status === 'reminded').length ?? 0,
    [posts],
  )

  const openPost = posts?.find((p) => p.post_id === openPostId) ?? null

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="paragraph-lg font-semibold text-primary">Posts</h1>
            <p className="paragraph-xs text-quaternary">
              {posts === null
                ? 'Loading…'
                : `${posts.length} post${posts.length === 1 ? '' : 's'}${scheduledCount ? ` · ${scheduledCount} scheduled` : ''}`}
            </p>
          </div>
          <Button onClick={() => navigate('/home', { state: { newChat: true } })}>New post</Button>
        </div>

        {error && (
          <div className="flex items-center gap-3">
            <p className="paragraph-sm text-utility-error-600">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        )}

        {posts === null && !error && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {posts !== null && posts.length === 0 && (
          <div className="rounded-xl border border-secondary bg-primary p-8 text-center flex flex-col items-center gap-2">
            <p className="paragraph-sm font-semibold text-primary">No posts yet</p>
            <p className="paragraph-xs text-quaternary max-w-sm">
              Draft a post in chat — “create a Facebook post about…” — then hit the schedule
              button on the canvas. It shows up here.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/home', { state: { newChat: true } })}
            >
              Start drafting
            </Button>
          </div>
        )}

        {posts !== null &&
          posts.map((p) => (
            <PostRow
              key={p.post_id}
              post={p}
              onOpen={(x) => setOpenPostId(x.post_id)}
              onChanged={onChanged}
              onRemoved={onRemoved}
            />
          ))}
      </div>

      {openPost && (
        <PostDetailModal
          post={openPost}
          onClose={() => setOpenPostId(null)}
          onChanged={onChanged}
          onRemoved={onRemoved}
        />
      )}
    </div>
  )
}

export default PostsView
