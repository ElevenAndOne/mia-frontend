import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/button'
import { TopBar } from '../../components/top-bar'
import { Edit03 } from '../../components/icon/edit-03'
import { UploadCloud01 } from '../../components/icon/upload-cloud-01'
import { creativeStudioApi, miaCreateApi } from '../creative-studio/creative-studio-api'
import type { CreativeAsset } from '../creative-studio/creative-studio-api'
import { Spinner } from '../../components/spinner'
import { useSession } from '../../contexts/session-context'
import { useToast } from '../../contexts/toast-context'
import { Modal } from '../overlay'
import { SegmentedControl } from '../../components/segmented-control'
import { useFeature } from '../workspace/hooks/use-features'
import {
  confirmDeleted,
  decidePostItem,
  deletePost,
  dropPostItem,
  fetchPostItems,
  fetchPosts,
  markPosted,
  reschedulePost,
  retryPost,
  submitDesign,
  buildWeeklyPlan,
  decideWeeklyItem,
  fetchWeeklyPlan,
  type DeletePostResult,
  type WeeklyPlan,
  type WeeklyPlanItem,
} from './services/posts-api'
import type { PostItem, PostStatus, ScheduledPost } from './types'
import { fetchMoodboard, removeMoodboardPicture } from '../workspace/services/posting-rhythm-service'
import { SwipeReview } from './swipe-review'

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
      okMsg: string | (() => string),
      after?: () => void,
    ) => {
      if (!sessionId || !tenantId || busy) return
      setBusy(true)
      try {
        const updated = await fn(sessionId, tenantId)
        if (updated) onChanged(updated)
        showToast('success', typeof okMsg === 'function' ? okMsg() : okMsg)
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

// Meta's API has no delete for Instagram media, so removing the Facebook post leaves its
// Instagram twin live; the toast has to say so or the owner believes both are gone.
const INSTAGRAM_STILL_LIVE =
  'Deleted from Facebook. The Instagram copy is still live — delete it in the Instagram app.'

// Removing a published Instagram row marks it: the post itself is untouched until the owner
// deletes it in the Instagram app and taps "I've deleted it".
const removedToast = (post: ScheduledPost) =>
  post.status === 'published' && post.platform === 'instagram'
    ? 'Instagram doesn’t let apps delete posts. Open it in Instagram, delete it there, then tap “I’ve deleted it”.'
    : 'Post removed'

// A published post Mia couldn't delete: Instagram never lets apps delete, and Facebook sometimes
// refuses (the Page's settings or permissions). The owner deletes it there, with the link, then
// clears it here (Sean, 14 Oct 2026: a Facebook remove ended in a raw Graph error).
const awaitingManualDelete = (post: ScheduledPost) =>
  post.status === 'published' && Boolean(post.manual_delete_at)

const networkName = (post: ScheduledPost) => PLATFORM_LABEL[post.platform] ?? post.platform

const FACEBOOK_REFUSED =
  'Facebook didn’t let Mia delete this post (that’s a Facebook Page setting, not Mia). Open it on Facebook, delete it there, then tap “I’ve deleted it”.'

// The Instagram copy of the same post is live too, and only the Instagram app can delete it.
const facebookRefused = (r: DeletePostResult) =>
  r.instagram_still_live
    ? `${FACEBOOK_REFUSED} The Instagram copy is still live too: delete it in the Instagram app.`
    : FACEBOOK_REFUSED

/** The two-step removal: open the post on its network, then confirm it is gone. */
const ManualDeleteActions = ({
  post,
  busy,
  onConfirm,
}: {
  post: ScheduledPost
  busy: boolean
  onConfirm: () => void
}) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    {post.permalink && (
      <a
        href={post.permalink}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center h-8 px-3 rounded-lg bg-secondary paragraph-xs text-primary hover:bg-tertiary whitespace-nowrap"
      >
        Open in {networkName(post)} ↗
      </a>
    )}
    <Button size="sm" variant="secondary" disabled={busy} onClick={onConfirm}>
      I’ve deleted it
    </Button>
  </div>
)

const removeConfirmText = (post: ScheduledPost) =>
  post.status !== 'published'
    ? 'Remove this post? It will not be published.'
    : post.platform === 'facebook'
      ? 'Remove this post? This also DELETES the live post from Facebook. If it also went to Instagram, that copy stays up until you delete it in the Instagram app.'
      : 'Instagram doesn’t let apps delete posts. Mia will keep this row with a link so you can delete it in the Instagram app, then clear it here. Continue?'

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
            {awaitingManualDelete(post) ? (
              <ManualDeleteActions
                post={post}
                busy={busy}
                onConfirm={() =>
                  void run(
                    async (s, t) => {
                      await confirmDeleted(s, t, post.post_id)
                      return null
                    },
                    'Cleared',
                    () => {
                      onRemoved(post.post_id)
                      onClose()
                    },
                  )
                }
              />
            ) : post.status !== 'publishing' && (
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(removeConfirmText(post))) {
                    let msg = removedToast(post)
                    let marked = false
                    void run(
                      async (s, t) => {
                        const r = await deletePost(s, t, post.post_id)
                        if (r.instagram_still_live) msg = INSTAGRAM_STILL_LIVE
                        if (r.manual_delete || r.instagram_manual) {
                          if (r.manual_delete?.platform === 'facebook') msg = facebookRefused(r)
                          marked = true
                          return { ...post, manual_delete_at: new Date().toISOString() }
                        }
                        return null
                      },
                      () => msg,
                      () => {
                        if (marked) return
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
        {awaitingManualDelete(post) && (
          <p className="paragraph-xs text-utility-warning-700 truncate">
            Still live on {networkName(post)}. Delete it there, then clear it here.
          </p>
        )}
      </div>

      <StatusPill status={post.status} />

      {/* Quick actions — clicks must not open the detail view */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {awaitingManualDelete(post) ? (
          <ManualDeleteActions
            post={post}
            busy={busy}
            onConfirm={() =>
              void run(
                async (s, t) => {
                  await confirmDeleted(s, t, post.post_id)
                  return null
                },
                'Cleared',
                () => onRemoved(post.post_id),
              )
            }
          />
        ) : post.status !== 'publishing' && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm(removeConfirmText(post))) {
                let msg = removedToast(post)
                let marked = false
                void run(
                  async (s, t) => {
                    const r = await deletePost(s, t, post.post_id)
                    if (r.instagram_still_live) msg = INSTAGRAM_STILL_LIVE
                    if (r.manual_delete || r.instagram_manual) {
                      if (r.manual_delete?.platform === 'facebook') msg = facebookRefused(r)
                      marked = true
                      return { ...post, manual_delete_at: new Date().toISOString() }
                    }
                    return null
                  },
                  () => msg,
                  () => {
                    if (!marked) onRemoved(post.post_id)
                  },
                )
              }
            }}
          >
            Remove
          </Button>
        )}
        {!awaitingManualDelete(post) && post.permalink && (
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

// ── Team ideas (staff on WhatsApp, Oct 2026) ───────────────────────────────────
// The same records WhatsApp writes (services/post_items): an idea a staff member sent, what
// is waiting for the owner, and what the owner decided. A decision here is the same claim a
// WhatsApp tap makes, so a tap on the stale card afterwards says "already decided".

const ITEM_STATE: Record<string, { label: string; cls: string }> = {
  idea: { label: 'Idea', cls: 'bg-utility-info-100 text-utility-info-700' },
  waiting: { label: 'Waiting for you', cls: 'bg-utility-warning-100 text-utility-warning-700' },
  approved: { label: 'Used', cls: 'bg-utility-success-100 text-utility-success-700' },
  live: { label: 'Used · live', cls: 'bg-utility-success-100 text-utility-success-700' },
  not_used: { label: 'Held back', cls: 'bg-tertiary text-quaternary' },
  removed: { label: 'Used, then removed', cls: 'bg-tertiary text-quaternary' },
}

const itemWhen = (item: PostItem) => (item.created_at ? fmtWhen(item.created_at) : '')
const itemWho = (item: PostItem) => item.sender_name || 'A team member'
// From the shared Mia folder in Google Drive (22 Oct 2026): "Ready to post" pictures are finished
// work, used first in the Friday posts, so they're labelled and listed first.
const isReady = (item: PostItem) => item.source === 'folder_ready' && item.status === 'idea'
const fromFolder = (item: PostItem) => item.source === 'folder' || item.source === 'folder_ready'
const READY_STATE = { label: 'Ready to post', cls: 'bg-utility-success-100 text-utility-success-700' }

const useItems = (view: 'ideas' | 'waiting', enabled: boolean) => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  return useQuery({
    queryKey: ['post-items', tenantId, view],
    queryFn: async () => (await fetchPostItems(sessionId!, tenantId!, view)).items,
    enabled: enabled && !!sessionId && !!tenantId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

const IdeaCard = ({ item, canManage, onDropped }: { item: PostItem; canManage: boolean; onDropped: (id: string) => void }) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const state = isReady(item) ? READY_STATE : (ITEM_STATE[item.status] ?? ITEM_STATE.idea)
  const photo = item.photo_urls[0]
  const post = item.posts[0]
  return (
    <div className="rounded-xl border border-secondary bg-primary overflow-hidden flex flex-col">
      {photo ? (
        <img src={photo} alt="" className="w-full aspect-square object-cover bg-tertiary" />
      ) : (
        <div className="w-full aspect-square bg-tertiary flex items-center justify-center text-quaternary">
          <Edit03 size={18} />
        </div>
      )}
      <div className="p-3 flex flex-col gap-1.5 min-w-0">
        <p className="paragraph-sm font-semibold text-primary truncate">{item.note || 'Photo'}</p>
        <p className="paragraph-xs text-quaternary truncate">
          {itemWho(item)}{fromFolder(item) ? ' · Mia folder' : ''} · {itemWhen(item)}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex px-2 py-0.5 rounded-full label-xs font-semibold ${state.cls}`}>{state.label}</span>
          {post?.permalink && (
            <a href={post.permalink} target="_blank" rel="noreferrer" className="paragraph-xs text-utility-brand-600 hover:underline">
              View ↗
            </a>
          )}
        </div>
        {canManage && item.status === 'idea' && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (!sessionId || !activeWorkspace || !window.confirm("Don't keep this photo? It is deleted everywhere, including for the person who sent it.")) return
                setBusy(true)
                dropPostItem(sessionId, activeWorkspace.tenant_id, item.id)
                  .then(() => {
                    showToast('success', 'Gone')
                    onDropped(item.id)
                  })
                  .catch((e) => showToast('error', e instanceof Error ? e.message : 'Something went wrong'))
                  .finally(() => setBusy(false))
              }}
            >
              Don’t keep
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// The moodboard (22 Oct 2026): pictures from the Mia folder's "Ideas & moodboard" or sent on
// WhatsApp "for the moodboard". They set the look of pictures Mia draws and are never posted;
// they share the Ideas & moodboard tab with the team's ideas, the way they share the Drive folder.
type MoodboardPic = Awaited<ReturnType<typeof fetchMoodboard>>[number]

const useMoodboard = (enabled: boolean) => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  return useQuery({
    queryKey: ['moodboard', tenantId],
    queryFn: () => fetchMoodboard(sessionId!, tenantId!),
    enabled: enabled && !!sessionId && !!tenantId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

const MoodboardCard = ({ pic, canManage }: { pic: MoodboardPic; canManage: boolean }) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const tenantId = activeWorkspace?.tenant_id
  return (
    <div className="rounded-xl border border-secondary bg-primary overflow-hidden flex flex-col">
      <img src={pic.url} alt={pic.name ?? 'Moodboard picture'} className="w-full aspect-square object-cover bg-tertiary" />
      <div className="p-3 flex flex-col gap-1.5 min-w-0">
        <p className="paragraph-sm font-semibold text-primary truncate">{pic.name || 'Moodboard picture'}</p>
        <p className="paragraph-xs text-quaternary truncate">
          {pic.subfolder ? 'Mia folder' : 'WhatsApp'}{pic.added_at ? ` · ${fmtWhen(pic.added_at)}` : ''}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex px-2 py-0.5 rounded-full label-xs font-semibold bg-utility-purple-100 text-utility-purple-700">
            Moodboard · style only
          </span>
        </div>
        {canManage && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (!sessionId || !tenantId) return
                setBusy(true)
                removeMoodboardPicture(sessionId, tenantId, pic.id)
                  .then(() => {
                    showToast('success', 'Taken off the moodboard')
                    queryClient.setQueryData<MoodboardPic[]>(['moodboard', tenantId], (prev) => prev?.filter((x) => x.id !== pic.id) ?? prev)
                  })
                  .catch((e) => showToast('error', e instanceof Error ? e.message : 'Something went wrong'))
                  .finally(() => setBusy(false))
              }}
            >
              Remove from moodboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

const IdeasPanel = ({ canManage, kind }: { canManage: boolean; kind: 'ideas' | 'ready' }) => {
  const { activeWorkspace } = useSession()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useItems('ideas', true)
  const { data: moodData } = useMoodboard(kind === 'ideas' && canManage)
  const [sender, setSender] = useState<string | null>(null)
  // Ready to post on its own tab, oldest first (the order the Friday posts use them in); the
  // other ideas newest first, as they came (22 Oct 2026).
  const all = (data ?? []).filter((i) => (kind === 'ready' ? isReady(i) : !isReady(i)))
  if (kind === 'ready') all.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
  // Who sent what: owners save ideas too now (with the words they sent), so a filter by sender.
  const senders = Array.from(new Set(all.map(itemWho)))
  const items = sender ? all.filter((i) => itemWho(i) === sender) : all
  const onDropped = (id: string) =>
    queryClient.setQueryData<PostItem[]>(['post-items', activeWorkspace?.tenant_id, 'ideas'], (prev) => prev?.filter((i) => i.id !== id) ?? prev)
  const mood = kind === 'ideas' && !sender ? (moodData ?? []) : []
  // One grid, newest first, like the Drive folder it mirrors: ideas and moodboard pictures together.
  const grid: Array<{ at: string; idea?: PostItem; pic?: MoodboardPic }> = [
    ...items.map((i) => ({ at: i.created_at ?? '', idea: i })),
    ...mood.map((m) => ({ at: m.added_at ?? '', pic: m })),
  ]
  if (kind === 'ideas') grid.sort((a, b) => b.at.localeCompare(a.at))
  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error) return <p className="paragraph-sm text-utility-error-600">Couldn’t load the ideas.</p>
  if (grid.length === 0)
    return (
      <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-secondary bg-primary p-8 text-center flex flex-col items-center gap-2">
        <p className="paragraph-sm font-semibold text-primary">{kind === 'ready' ? 'Nothing ready to post yet' : 'No ideas or moodboard pictures yet'}</p>
        <p className="paragraph-xs text-quaternary max-w-sm">
          {kind === 'ready'
            ? 'Put finished pictures in the Mia folder’s Ready to post, or send one on WhatsApp saying it’s ready to post. Mia writes the words and uses them first on Fridays.'
            : 'Photos and notes the team sends Mia on WhatsApp land here, and so do pictures in the Mia folder’s Ideas & moodboard. On WhatsApp, saying “for the moodboard” with a photo makes it a style picture.'}
        </p>
      </div>
      </div>
    )
  return (
    <div className="flex flex-col gap-3">
      {senders.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {[null, ...senders].map((name) => (
            <button
              key={name ?? 'everyone'}
              type="button"
              onClick={() => setSender(name)}
              className={`px-2.5 py-1 rounded-full label-xs font-semibold border ${
                sender === name ? 'bg-brand-solid text-white border-transparent' : 'bg-primary text-secondary border-secondary'
              }`}
            >
              {name ?? 'Everyone'}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {grid.map((g) =>
          g.idea ? (
            <IdeaCard key={g.idea.id} item={g.idea} canManage={canManage} onDropped={onDropped} />
          ) : g.pic ? (
            <MoodboardCard key={`m-${g.pic.id}`} pic={g.pic} canManage={canManage} />
          ) : null,
        )}
      </div>
    </div>
  )
}

const WaitingCard = ({ item, onChanged }: { item: PostItem; onChanged: (item: PostItem) => void }) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [holding, setHolding] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const photo = item.photo_urls[0]
  const chosen = new Set(item.chosen?.indexes ?? [])
  const pending = new Set(item.decisions.filter((d) => d.decision === 'pending').map((d) => d.index))
  const decide = (body: { decision: 'approved' | 'not_used'; index?: number; reason?: string }, ok: string) => {
    if (!sessionId || !activeWorkspace || busy) return
    setBusy(true)
    decidePostItem(sessionId, activeWorkspace.tenant_id, item.id, body)
      .then((r) => {
        showToast('success', ok)
        onChanged(r.item)
        setHolding(null)
        setReason('')
      })
      .catch((e) => showToast('error', e instanceof Error ? e.message : 'Something went wrong'))
      .finally(() => setBusy(false))
  }
  return (
    <div className="rounded-xl border border-secondary bg-primary overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        {photo ? (
          <img src={photo} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 border border-tertiary" />
        ) : (
          <div className="w-11 h-11 rounded-lg shrink-0 bg-tertiary" />
        )}
        <div className="min-w-0">
          <p className="paragraph-sm font-semibold text-primary truncate">
            {itemWho(item)} would like {chosen.size > 1 ? 'both posts' : chosen.size === 1 ? `Post ${'AB'[[...chosen][0] - 1] ?? [...chosen][0]}` : 'a post'} to go out
          </p>
          <p className="paragraph-xs text-quaternary truncate">
            {item.note ? `“${item.note}” · ` : ''}{itemWhen(item)}
          </p>
        </div>
      </div>
      <div className="flex flex-col divide-y divide-tertiary border-t border-tertiary">
        {item.drafts
          .filter((d) => chosen.size === 0 || chosen.has(d.index))
          .map((d) => {
            const decision = item.decisions.find((x) => x.index === d.index)
            const open = pending.has(d.index)
            return (
              <div key={d.index} className="px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="label-xs font-semibold text-quaternary">Post {'AB'[d.index - 1] ?? d.index}</span>
                  <span className="paragraph-xs text-quaternary">· {PLATFORM_LABEL[d.platform] ?? d.platform}{d.scheduled_at ? ` · ${fmtWhen(d.scheduled_at)}` : ''}</span>
                  {!open && decision && (
                    <span className={`ml-auto inline-flex px-2 py-0.5 rounded-full label-xs font-semibold ${decision.decision === 'approved' ? ITEM_STATE.approved.cls : ITEM_STATE.not_used.cls}`}>
                      {decision.decision === 'approved' ? `Approved by ${decision.by_name ?? 'you'}` : decision.decision === 'withdrawn' ? `Taken back by ${itemWho(item)}` : `Held back${decision.by_name ? ` by ${decision.by_name}` : ''}`}
                    </span>
                  )}
                </div>
                <p className="paragraph-sm text-primary whitespace-pre-wrap break-words">{d.copy}</p>
                {open && holding !== d.index && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" disabled={busy} onClick={() => decide({ decision: 'approved', index: d.index }, 'Approved and booked')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => setHolding(d.index)}>
                      Not this one
                    </Button>
                  </div>
                )}
                {open && holding === d.index && (
                  <div className="flex flex-col gap-2">
                    <input
                      id={`reason-${item.id}-${d.index}`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={`Want to tell ${itemWho(item)} why? (optional)`}
                      className="px-2.5 py-1.5 border border-tertiary rounded-lg paragraph-sm bg-primary text-primary outline-none focus:border-utility-brand-400"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => decide({ decision: 'not_used', index: d.index, reason: reason.trim() || undefined }, `Held back, ${itemWho(item)} told`)}>
                        {reason.trim() ? 'Send' : 'Skip and hold back'}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setHolding(null)}>
                        Back
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

const WaitingPanel = () => {
  const { activeWorkspace } = useSession()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useItems('waiting', true)
  const items = data ?? []
  const onChanged = (item: PostItem) =>
    queryClient.setQueryData<PostItem[]>(['post-items', activeWorkspace?.tenant_id, 'waiting'], (prev) =>
      (prev ?? []).map((i) => (i.id === item.id ? item : i)).filter((i) => i.status === 'waiting'),
    )
  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error) return <p className="paragraph-sm text-utility-error-600">Couldn’t load what’s waiting.</p>
  if (items.length === 0)
    return (
      <div className="rounded-xl border border-secondary bg-primary p-8 text-center flex flex-col items-center gap-2">
        <p className="paragraph-sm font-semibold text-primary">Nothing waiting for you</p>
        <p className="paragraph-xs text-quaternary max-w-sm">
          When someone on your team makes a post from an idea, it lands here and on your WhatsApp. Approving in either place updates the other.
        </p>
      </div>
    )
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <WaitingCard key={item.id} item={item} onChanged={onChanged} />
      ))}
    </div>
  )
}

/**
 * Send a design for approval (staff plan slice 6): a picture already in the library (a Canva
 * design, a Figma frame, an upload) goes to the owner with the words written, as one request
 * on WhatsApp and on Waiting for you. The designer's own words win; left empty, Mia writes them.
 */
const SendDesignDialog = ({ onClose, onSent }: { onClose: () => void; onSent: (line: string) => void }) => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const { showToast } = useToast()
  const [library, setLibrary] = useState<CreativeAsset[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!sessionId || !tenantId) return
    creativeStudioApi
      .listAssets(tenantId, sessionId, { asset_type: 'reference', media_type: 'image', limit: 24 })
      .then((r) => setLibrary(r.assets))
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Couldn’t load the library'))
  }, [sessionId, tenantId])

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 10 ? prev : [...prev, id]))

  const upload = async (files: FileList | null) => {
    if (!files || !files.length || !sessionId || !tenantId) return
    setUploading(true)
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const r = await miaCreateApi.uploadReference(sessionId, tenantId, file)
        const asset: CreativeAsset = {
          asset_id: r.asset_id,
          tenant_id: tenantId,
          type: 'reference',
          media_type: 'image',
          cdn_url: r.cdn_url,
          filename: file.name,
          source: 'upload',
          status: 'completed',
          created_at: new Date().toISOString(),
        }
        setLibrary((prev) => [asset, ...(prev ?? [])])
        setPicked((prev) => (prev.length >= 10 ? prev : [...prev, r.asset_id]))
      }
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const send = () => {
    if (!sessionId || !tenantId || !picked.length || sending) return
    setSending(true)
    submitDesign(sessionId, tenantId, { asset_ids: picked, caption: caption.trim() || undefined })
      .then((r) => {
        onSent(r.sent[0] ?? 'Sent for approval')
        onClose()
      })
      .catch((e) => showToast('error', e instanceof Error ? e.message : 'Something went wrong'))
      .finally(() => setSending(false))
  }

  const order = (id: string) => picked.indexOf(id) + 1
  return (
    <Modal isOpen onClose={onClose} title="Send a design for approval" size="lg">
      <div className="flex flex-col gap-4">
        <p className="paragraph-xs text-quaternary">
          Pick the finished picture (or the pages of a carousel, in order). The owner gets it with the words written,
          on WhatsApp and here under Waiting for you, and sends it out with a tap.
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="paragraph-sm font-semibold text-primary">
            {picked.length ? `${picked.length} picked` : 'From the library'}
          </p>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
          <Button size="sm" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <UploadCloud01 size={14} />
            {uploading ? 'Uploading…' : 'Upload a picture'}
          </Button>
        </div>
        {loadError && <p className="paragraph-xs text-utility-error-600">{loadError}</p>}
        {library === null && !loadError && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
        {library !== null && library.length === 0 && (
          <p className="paragraph-xs text-quaternary">
            Nothing in the library yet. Upload a picture, or import a design from Canva or Figma in chat first.
          </p>
        )}
        {library !== null && library.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
            {library.map((a) => {
              const n = order(a.asset_id)
              return (
                <button
                  key={a.asset_id}
                  type="button"
                  onClick={() => toggle(a.asset_id)}
                  className={`relative rounded-lg overflow-hidden border-2 aspect-square bg-tertiary ${n ? 'border-utility-brand-600' : 'border-transparent hover:border-tertiary'}`}
                  title={a.filename || ''}
                >
                  <img src={a.cdn_url} alt="" className="w-full h-full object-cover" />
                  {n > 0 && (
                    <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-brand-solid text-primary-onbrand label-xs font-semibold flex items-center justify-center">
                      {n}
                    </span>
                  )}
                  {a.source && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-primary/80 label-xs text-quaternary capitalize">
                      {a.source}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="design-caption" className="paragraph-sm font-semibold text-primary">
            The words <span className="font-normal text-quaternary">(optional: leave it empty and Mia writes them)</span>
          </label>
          <textarea
            id="design-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            placeholder="The caption as it should go out"
            className="px-2.5 py-1.5 border border-tertiary rounded-lg paragraph-sm bg-primary text-primary outline-none focus:border-utility-brand-400 resize-y"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={!picked.length || sending || uploading}>
            {sending ? 'Sending…' : 'Send for approval'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

type PostsTab = 'ideas' | 'ready' | 'waiting' | 'next' | 'scheduled' | 'posted'

// ── Next week (the Friday round-up, 14 Oct 2026) ─────────────────────────────
// The same week the owner reviews on WhatsApp on Friday; whichever is used first wins.

const useWeeklyPlan = (enabled: boolean) => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  return useQuery({
    queryKey: ['weekly-plan', tenantId],
    queryFn: () => fetchWeeklyPlan(sessionId!, tenantId!),
    enabled: enabled && !!sessionId && !!tenantId,
    refetchInterval: 60_000,
  })
}

const NextWeekItem = ({ plan, item, onPlan }: { plan: WeeklyPlan; item: WeeklyPlanItem; onPlan: (p: WeeklyPlan) => void }) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [askKeep, setAskKeep] = useState(false)
  const act = (body: { action: 'book' | 'skip'; keep_idea?: boolean }) => {
    if (!sessionId || !activeWorkspace) return
    setBusy(true)
    decideWeeklyItem(sessionId, activeWorkspace.tenant_id, plan.id, item.i, body)
      .then((r) => {
        showToast('success', r.message)
        onPlan(r.plan)
      })
      .catch((e) => showToast('error', e instanceof Error ? e.message : 'Something went wrong'))
      .finally(() => setBusy(false))
  }
  return (
    <div className="rounded-xl border border-secondary bg-primary overflow-hidden flex flex-col sm:flex-row">
      {item.photo_url && (
        <img src={item.photo_url} alt="" className="w-full sm:w-40 aspect-square object-cover bg-tertiary shrink-0" />
      )}
      <div className="p-3 flex flex-col gap-2 min-w-0 flex-1">
        <p className="label-xs font-semibold text-quaternary">
          {fmtWhen(item.slot_at)} · {PLATFORM_LABEL[item.platform] ?? item.platform}
          {item.source === 'idea' ? ' · from a saved idea' : item.source === 'drawn' ? ' · a picture Mia drew' : ''}
        </p>
        <p className="paragraph-sm text-primary whitespace-pre-wrap break-words">
          {item.copy}
          {item.hashtags ? `\n\n${item.hashtags}` : ''}
        </p>
        {item.decision === 'pending' && askKeep ? (
          // Skipped: keep the photo for another week? Two taps here, not a browser dialog (review).
          <div className="flex items-center gap-2 flex-wrap">
            <span className="paragraph-xs text-tertiary">Keep the photo as an idea for another week?</span>
            <Button size="sm" disabled={busy} onClick={() => act({ action: 'skip', keep_idea: true })}>
              Keep as an idea
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => act({ action: 'skip', keep_idea: false })}>
              No thanks
            </Button>
          </div>
        ) : item.decision === 'pending' ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" disabled={busy} onClick={() => act({ action: 'book' })}>
              Book it
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => (item.source === 'drawn' ? act({ action: 'skip', keep_idea: false }) : setAskKeep(true))}
            >
              Skip
            </Button>
          </div>
        ) : (
          <span className="paragraph-xs text-quaternary">{item.decision === 'booked' ? 'Booked' : 'Skipped'}</span>
        )}
      </div>
    </div>
  )
}

const NextWeekPanel = () => {
  const { sessionId, activeWorkspace } = useSession()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { data, isLoading, error } = useWeeklyPlan(true)
  const [building, setBuilding] = useState(false)
  const [swiping, setSwiping] = useState(false)
  const setPlan = (plan: WeeklyPlan | null) =>
    queryClient.setQueryData(['weekly-plan', activeWorkspace?.tenant_id], (prev: { enabled: boolean; plan: WeeklyPlan | null } | undefined) =>
      prev ? { ...prev, plan } : prev,
    )
  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error) return <p className="paragraph-sm text-utility-error-600">Couldn’t load next week’s posts.</p>
  const plan = data?.plan
  if (!plan || plan.status === 'empty')
    return (
      <div className="rounded-xl border border-secondary bg-primary p-8 text-center flex flex-col items-center gap-3">
        <p className="paragraph-sm font-semibold text-primary">Nothing for next week yet</p>
        <p className="paragraph-xs text-quaternary max-w-sm">
          Every Friday morning Mia makes next week’s posts from your saved ideas and the photos you’ve sent, and
          sends them to you on WhatsApp. They show here too.
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={building}
          onClick={() => {
            if (!sessionId || !activeWorkspace) return
            setBuilding(true)
            buildWeeklyPlan(sessionId, activeWorkspace.tenant_id)
              .then((r) => setPlan(r.plan))
              .catch((e) => showToast('error', e instanceof Error ? e.message : 'Something went wrong'))
              .finally(() => setBuilding(false))
          }}
        >
          {building ? 'Making them…' : 'Make them now'}
        </Button>
      </div>
    )
  const pendingCount = plan.items.filter((i) => i.decision === 'pending').length
  return (
    <div className="flex flex-col gap-3">
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-secondary bg-primary p-3">
          <p className="paragraph-sm text-primary">
            {pendingCount} post{pendingCount === 1 ? '' : 's'} to go through
          </p>
          <Button size="sm" onClick={() => setSwiping(true)}>
            Go through them
          </Button>
        </div>
      )}
      {swiping && <SwipeReview plan={plan} onPlan={setPlan} onClose={() => setSwiping(false)} />}
      {plan.missing.length > 0 && (
        <p className="paragraph-xs text-quaternary">
          {plan.missing.length} more slot{plan.missing.length === 1 ? '' : 's'} next week had no photo. Send Mia one on
          WhatsApp and it can go in.
        </p>
      )}
      {plan.items.map((item) => (
        <NextWeekItem key={item.i} plan={plan} item={item} onPlan={setPlan} />
      ))}
    </div>
  )
}
const SCHEDULED_STATUSES: PostStatus[] = ['scheduled', 'reminded', 'publishing', 'failed', 'draft']

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
    // A post going out while the page is open shows without a refresh (Megan, 30 Sep 2026):
    // the publisher runs every five minutes, so a 30 s poll is never far behind it.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
  const posts = data ?? null
  const { showToast: notify } = useToast()
  const seenStatus = useRef<Map<string, PostStatus> | null>(null)
  useEffect(() => {
    if (!posts) return
    const next = new Map(posts.map((p) => [p.post_id, p.status] as const))
    const before = seenStatus.current
    seenStatus.current = next
    if (!before) return // first load: nothing has changed yet
    for (const p of posts) {
      const was = before.get(p.post_id)
      if (was && was !== 'published' && p.status === 'published') {
        const where = p.platform === 'instagram' ? 'Instagram' : p.platform === 'linkedin' ? 'LinkedIn' : 'Facebook'
        notify('success', `Your ${where} post is live${p.title ? `: ${p.title}` : ''}`)
      } else if (was && was !== 'failed' && p.status === 'failed') {
        notify('error', `A post did not go out${p.title ? `: ${p.title}` : ''}. Open it to retry.`)
      }
    }
  }, [posts, notify])
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

  // Staff on WhatsApp: the Ideas and Waiting-for-you tabs exist only where the feature is on,
  // and Waiting only for owners and admins (the approvers). Everyone else sees the page as it was.
  const teamOn = useFeature('staff_whatsapp')
  const canManage = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin'
  const [tab, setTab] = useState<PostsTab>('scheduled')
  const [sendingDesign, setSendingDesign] = useState(false)
  const { data: waitingItems } = useItems('waiting', teamOn && canManage)
  const isOwner = activeWorkspace?.role === 'owner'
  const { data: weekly } = useWeeklyPlan(teamOn && isOwner)
  const nextOn = Boolean(weekly?.enabled || weekly?.plan)
  const waitingCount = waitingItems?.length ?? 0
  const isPostsTab = !teamOn || tab === 'scheduled' || tab === 'posted'
  const shown = useMemo(() => {
    if (!posts) return null
    if (!teamOn) return posts
    return tab === 'posted'
      ? posts.filter((p) => p.status === 'published' || p.status === 'canceled')
      : posts.filter((p) => SCHEDULED_STATUSES.includes(p.status))
  }, [posts, teamOn, tab])

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Posts was the one page still wearing its own header — no trail, no way back
          except the sidebar. Same TopBar as everywhere else. */}
      <TopBar
        title="Posts"
        onBack={() => navigate('/home')}
        className="border-b border-tertiary"
        rightSlot={
          <Button onClick={() => navigate('/home', { state: { newChat: true } })}>New post</Button>
        }
      />
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-4">
          {teamOn && (
            <div className="overflow-x-auto -mx-1 px-1">
            <SegmentedControl<PostsTab>
              value={tab}
              onChange={setTab}
              fullWidth
              className="w-max min-w-full whitespace-nowrap"
              options={[
                { value: 'ready', label: 'Ready to post' },
                { value: 'ideas', label: 'Ideas & moodboard' },
                ...(canManage ? [{ value: 'waiting' as const, label: waitingCount ? `Waiting for you (${waitingCount})` : 'Waiting for you' }] : []),
                ...(isOwner && nextOn ? [{ value: 'next' as const, label: 'Next week' }] : []),
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'posted', label: 'Posted' },
              ]}
            />
            </div>
          )}
          {isPostsTab && (
            <p className="paragraph-xs text-quaternary">
              {posts === null
                ? 'Loading…'
                : `${(shown ?? posts).length} post${(shown ?? posts).length === 1 ? '' : 's'}${scheduledCount && tab !== 'posted' ? ` · ${scheduledCount} scheduled` : ''}`}
            </p>
          )}
          {teamOn && (tab === 'ready' || tab === 'ideas' || tab === 'waiting') && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="paragraph-xs text-quaternary">
                {tab === 'ready'
                  ? 'Finished pictures the team is happy with. Mia writes the words and uses these first in your Friday posts. Same as the Mia folder’s Ready to post.'
                  : tab === 'ideas'
                    ? 'Photos, notes and the look you like. Mia uses ideas when there’s nothing ready to post, and the moodboard for the look of pictures she draws (moodboard pictures are never posted). Same as the Mia folder’s Ideas & moodboard.'
                    : 'Posts the team would like to go out. Approving here or on WhatsApp updates the other.'}
              </p>
              {tab === 'ready' && !canManage && (
                <Button size="sm" variant="secondary" onClick={() => setSendingDesign(true)}>
                  <UploadCloud01 size={14} />
                  Send a finished design for approval
                </Button>
              )}
            </div>
          )}
          {sendingDesign && (
            <SendDesignDialog
              onClose={() => setSendingDesign(false)}
              onSent={(line) => {
                notify('success', line)
                void queryClient.invalidateQueries({ queryKey: ['post-items', tenantId] })
                if (canManage) setTab('waiting')
              }}
            />
          )}
          {teamOn && tab === 'ideas' && <IdeasPanel canManage={canManage} kind="ideas" />}
          {teamOn && tab === 'ready' && <IdeasPanel canManage={canManage} kind="ready" />}
          {teamOn && tab === 'waiting' && canManage && <WaitingPanel />}
          {teamOn && tab === 'next' && isOwner && <NextWeekPanel />}

        {error && (
          <div className="flex items-center gap-3">
            <p className="paragraph-sm text-utility-error-600">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        )}

        {isPostsTab && posts === null && !error && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {isPostsTab && shown !== null && shown.length === 0 && (
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

        {isPostsTab &&
          shown !== null &&
          shown.map((p) => (
            <PostRow
              key={p.post_id}
              post={p}
              onOpen={(x) => setOpenPostId(x.post_id)}
              onChanged={onChanged}
              onRemoved={onRemoved}
            />
          ))}
        </div>
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
