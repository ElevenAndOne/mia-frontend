import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus01 } from '../../../components/icon/calendar-plus-01'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { confirmAction, type CanvasDocument } from '../services/chat-service'
import type { CreativeSpec } from './previews/creative-spec'
import { CropAdjuster } from './crop-adjuster'
import { IG_MAX_RATIO, IG_MIN_RATIO, type CropBox } from './crop-utils'
import {
  deletePost,
  fetchBookingsForDocument,
  reschedulePost,
} from '../../posts/services/posts-api'
import type { ScheduledPost } from '../../posts/types'

interface SchedulePostProps {
  doc: CanvasDocument
  spec: CreativeSpec | null
  conversationId: string | null
  /** 'icon' is the header affordance. 'button' is the labelled one in the post actions:
   *  scheduling is the whole point of drafting a post, and as a 16px calendar glyph in the
   *  top corner nobody found it (28 Sep 2026). */
  variant?: 'icon' | 'button'
  /** "Done" after a booking: close the canvas and go back to where they were. */
  onDone?: () => void
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** "Wed 1 Oct, 13:50" in their own clock. */
const whenLabel = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** The date + time inputs for an ISO time, in local time. */
const toInputs = (iso: string): { date: string; time: string } => {
  const d = new Date(iso)
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  }
}

const platformName = (p: string) => (p === 'instagram' ? 'Instagram' : 'Facebook')

/** Tomorrow 10:00 local — a sane default when Mia didn't suggest a time. */
const defaultSchedule = (): { date: string; time: string } => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: '10:00',
  }
}

/**
 * "Schedule" on the chat canvas (Quick Posts): freezes the post's copy + image and
 * hands it to the organic scheduling rail — no campaign, phase or calendar concepts.
 * Facebook posts land in the Page's native scheduled queue; Instagram is published
 * by Mia at the chosen time. Out-of-range images are padded server-side by default;
 * the crop adjuster here lets the user choose a fill-crop instead.
 */
export const SchedulePost = ({
  doc,
  spec,
  conversationId,
  variant = 'icon',
  onDone,
}: SchedulePostProps) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const tenantId = activeWorkspace?.tenant_id

  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<'facebook' | 'instagram'>('facebook')
  const [{ date, time }, setWhen] = useState(defaultSchedule)
  const [submitting, setSubmitting] = useState(false)
  const [imgRatio, setImgRatio] = useState<number | null>(null)
  const [crop, setCrop] = useState<CropBox | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  // Shown in the panel after a booking succeeds: a toast alone was missed on a phone, the
  // button still said "Schedule post", and the same post was booked three times (1 Oct 2026).
  const [confirmed, setConfirmed] = useState<{
    platform: string
    at: string
    message?: string
  } | null>(null)
  const [changing, setChanging] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Is this post already booked? Then the button says when, and opens Change time / Unschedule.
  const bookingsQuery = useQuery({
    queryKey: ['posts', 'document', tenantId, doc.id],
    queryFn: () => fetchBookingsForDocument(sessionId!, tenantId!, doc.id),
    enabled: Boolean(sessionId && tenantId && doc.id),
    staleTime: 15_000,
  })
  const bookings: ScheduledPost[] = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data])
  const booking: ScheduledPost | null =
    bookings.find((b) => b.platform === platform) ?? bookings[0] ?? null

  // Only offer scheduling for organic Facebook/Instagram deliverables — ads and
  // other platforms keep their existing campaign/push flows.
  const eligible =
    !spec || (!spec.isPaid && (spec.platform === 'facebook' || spec.platform === 'instagram'))

  useEffect(() => {
    if (spec?.platform === 'instagram') setPlatform('instagram')
    else setPlatform('facebook')
  }, [spec?.platform])

  // Reopening a booked post shows ITS time and platform, not tomorrow 10:00.
  useEffect(() => {
    if (!open || !booking || confirmed) return
    setWhen(toInputs(booking.scheduled_at))
    if (booking.platform === 'facebook' || booking.platform === 'instagram')
      setPlatform(booking.platform)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the panel opens
  }, [open, booking?.post_id])

  useEffect(() => {
    if (!open) {
      setConfirmed(null)
      setChanging(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || cropOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, cropOpen])

  const media = useMemo(() => spec?.media ?? [], [spec])
  const firstImage = media.find((u) => !/\.(mp4|mov|webm|m4v)(\?|$)/i.test(u)) ?? null

  // Natural dimensions of the first image — drives the fit note + crop adjuster.
  useEffect(() => {
    setImgRatio(null)
    setCrop(null)
    if (!firstImage) return
    const img = new Image()
    img.onload = () => setImgRatio(img.naturalWidth / img.naturalHeight)
    img.src = firstImage
  }, [firstImage])

  const bestTime = useMemo(
    () => spec?.notes.find((n) => /best time/i.test(n.label))?.value ?? null,
    [spec]
  )

  const scheduledDate = useMemo(() => {
    if (!date || !time) return null
    const d = new Date(`${date}T${time}`)
    return Number.isNaN(d.getTime()) ? null : d
  }, [date, time])

  const effectiveRatio = crop && imgRatio ? (imgRatio * crop.w) / crop.h : imgRatio
  const igOutOfRange =
    platform === 'instagram' &&
    effectiveRatio !== null &&
    (effectiveRatio < IG_MIN_RATIO - 0.005 || effectiveRatio > IG_MAX_RATIO + 0.005)
  const targetRatio = imgRatio !== null && imgRatio < IG_MIN_RATIO ? IG_MIN_RATIO : IG_MAX_RATIO

  const tooSoon = scheduledDate !== null && scheduledDate.getTime() - Date.now() < 10 * 60 * 1000
  const igNeedsImage = platform === 'instagram' && media.length === 0
  // Publishing handles images only for now — video upload to FB/IG is a later phase.
  const hasVideo = media.some((u) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u))
  const canSubmit = !!scheduledDate && !tooSoon && !igNeedsImage && !hasVideo && !submitting

  const submit = useCallback(async () => {
    if (!sessionId || !scheduledDate || submitting) return
    setSubmitting(true)
    const copyText = spec
      ? [spec.primaryText, spec.hashtags].filter(Boolean).join('\n\n')
      : doc.content
    try {
      const result = await confirmAction(sessionId, {
        action_type: 'schedule_post',
        platform: 'organic',
        summary: `Schedule "${doc.title}" to ${platform}`,
        params: {
          platform,
          copy: copyText,
          media_urls: media,
          ...(crop && firstImage ? { media_crops: { [firstImage]: crop } } : {}),
          scheduled_at: scheduledDate.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          title: doc.title || 'Chat canvas post',
          source_document_id: doc.id,
          ...(conversationId ? { source_conversation_id: conversationId } : {}),
        },
      })
      if (!result.success) throw new Error(result.error || 'Failed')
      const message = (result as { message?: string }).message
      showToast('success', message || 'Post scheduled — find it on the Posts page')
      setConfirmed({ platform, at: scheduledDate.toISOString(), message })
      // The Posts page list is cached (React Query) — invalidate so the new
      // post is there the moment the user goes looking for it.
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      // Home (Basic) turns its card over and blinks Posts when it hears this.
      window.dispatchEvent(
        new CustomEvent('mia:post-scheduled', {
          detail: { platform, scheduled_at: scheduledDate.toISOString(), title: doc.title },
        })
      )
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to schedule the post')
    } finally {
      setSubmitting(false)
    }
  }, [
    sessionId,
    scheduledDate,
    submitting,
    spec,
    doc,
    platform,
    media,
    crop,
    firstImage,
    conversationId,
    showToast,
    queryClient,
  ])

  const changeTime = async () => {
    if (!sessionId || !tenantId || !booking || !scheduledDate || submitting) return
    setSubmitting(true)
    try {
      const post = await reschedulePost(
        sessionId,
        tenantId,
        booking.post_id,
        scheduledDate.toISOString()
      )
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      setConfirmed({ platform: post.platform, at: post.scheduled_at, message: 'Time changed.' })
      setChanging(false)
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : "Couldn't change the time")
    } finally {
      setSubmitting(false)
    }
  }

  const unschedule = async () => {
    if (!sessionId || !tenantId || !booking || submitting) return
    setSubmitting(true)
    try {
      await deletePost(sessionId, tenantId, booking.post_id)
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      showToast('success', "Unscheduled. It won't go out.")
      setOpen(false)
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : "Couldn't unschedule it")
    } finally {
      setSubmitting(false)
    }
  }

  if (!tenantId || !eligible) return null

  const inputCls =
    'w-full px-2 py-1.5 border border-tertiary rounded-lg paragraph-sm bg-primary text-primary outline-none focus:border-utility-brand-400'

  const imageLine = () => {
    if (media.length === 0) {
      return igNeedsImage
        ? 'Instagram needs an image — add one to the post first.'
        : 'No image — this will be a text-only post.'
    }
    if (crop) return null // custom-crop row renders instead
    if (igOutOfRange) return null // fit note renders instead
    return `Image: ${media.length === 1 ? 'attached' : `${media.length} attached`} ✓`
  }

  const asButton = variant === 'button'

  return (
    <div className={asButton ? 'relative flex-1 basis-32' : 'relative'} ref={menuRef}>
      {asButton ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          title="Schedule this post to Facebook or Instagram"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-transparent bg-brand-solid px-3 py-2 paragraph-sm font-medium text-white whitespace-nowrap hover:opacity-90 transition-opacity"
        >
          <CalendarPlus01 size={15} />
          {booking ? `Scheduled · ${whenLabel(booking.scheduled_at)}` : 'Schedule post'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={
            booking ? `Scheduled for ${whenLabel(booking.scheduled_at)}` : 'Schedule post'
          }
          aria-expanded={open}
          title={
            booking
              ? `Scheduled for ${whenLabel(booking.scheduled_at)} on ${platformName(booking.platform)}`
              : 'Schedule this post to Facebook or Instagram'
          }
          className="w-8 h-8 max-md:w-10 max-md:h-10 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
        >
          <CalendarPlus01 size={16} />
        </button>
      )}

      {open && (
        <div
          className={`absolute z-40 w-72 rounded-xl border border-tertiary bg-primary shadow-lg p-3 flex flex-col gap-2.5 ${
            asButton ? 'bottom-full left-0 mb-1' : 'top-full right-0 mt-1'
          }`}
        >
          {confirmed ? (
            <div className="flex flex-col gap-2.5" role="status">
              <p className="paragraph-sm font-semibold text-primary">
                Scheduled for {whenLabel(confirmed.at)} on {platformName(confirmed.platform)} ✓
              </p>
              {confirmed.message && confirmed.message.startsWith('Moved') && (
                <p className="paragraph-xs text-quaternary">
                  It was already booked, so the booking moved. Still one post.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate('/posts')
                  }}
                  className="flex-1 py-1.5 rounded-lg border border-primary paragraph-sm text-secondary hover:bg-tertiary"
                >
                  View in Posts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onDone?.()
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          ) : booking && !changing ? (
            <div className="flex flex-col gap-2.5">
              <p className="paragraph-sm font-semibold text-primary">
                Scheduled for {whenLabel(booking.scheduled_at)} on {platformName(booking.platform)}
              </p>
              {booking.status === 'publishing' ? (
                <p className="paragraph-xs text-quaternary">It's going out right now.</p>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setChanging(true)}
                    className="flex-1 py-1.5 rounded-lg border border-primary paragraph-sm text-secondary hover:bg-tertiary"
                  >
                    Change time
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void unschedule()}
                    className="flex-1 py-1.5 rounded-lg border border-error paragraph-sm text-error hover:bg-error hover:text-white disabled:opacity-50"
                  >
                    Unschedule
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/posts')
                }}
                className="paragraph-xs text-utility-brand-600 hover:underline text-left"
              >
                View in Posts
              </button>
            </div>
          ) : (
            <>
              <p className="paragraph-sm font-semibold text-primary">
                {changing ? 'Change the time' : 'Schedule post'}
              </p>

              <div>
                <p className="label-xs text-tertiary mb-0.5">Publish to</p>
                <select
                  value={platform}
                  disabled={changing}
                  onChange={(e) => setPlatform(e.target.value as 'facebook' | 'instagram')}
                  className={inputCls}
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              {/* Wrap rather than squeeze: a fixed 96px time box showed "10:00 A" on a
                  390px phone (2 Oct 2026). Each field keeps a usable minimum and the pair
                  stacks when the panel is narrow. */}
              <div className="flex flex-wrap gap-2">
                <div className="flex-1 min-w-[150px]">
                  <p className="label-xs text-tertiary mb-0.5">Date</p>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setWhen((w) => ({ ...w, date: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <p className="label-xs text-tertiary mb-0.5">Time</p>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setWhen((w) => ({ ...w, time: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              {bestTime && (
                <p className="paragraph-xs text-quaternary">✦ Mia suggests: {bestTime}</p>
              )}
              {tooSoon && (
                <p className="paragraph-xs text-utility-warning-600">
                  Pick a time at least 10 minutes from now.
                </p>
              )}
              {hasVideo && (
                <p className="paragraph-xs text-utility-warning-600">
                  Video posts can’t be scheduled yet — images only for now.
                </p>
              )}

              {imageLine() && <p className="paragraph-xs text-quaternary">{imageLine()}</p>}

              {crop && (
                <p className="paragraph-xs text-quaternary">
                  Custom crop ✓{' '}
                  <button
                    type="button"
                    onClick={() => setCrop(null)}
                    className="text-utility-brand-600 hover:underline"
                  >
                    Reset
                  </button>
                </p>
              )}

              {igOutOfRange && !crop && (
                <p className="paragraph-xs text-quaternary">
                  This image doesn’t fit Instagram’s shape — it’ll get white borders added, or{' '}
                  <button
                    type="button"
                    onClick={() => setCropOpen(true)}
                    className="text-utility-brand-600 hover:underline"
                  >
                    crop it instead
                  </button>
                  .
                </p>
              )}

              <button
                type="button"
                disabled={changing ? !scheduledDate || tooSoon || submitting : !canSubmit}
                onClick={() => void (changing ? changeTime() : submit())}
                className="w-full py-1.5 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium disabled:opacity-40 transition-opacity"
              >
                {submitting
                  ? changing
                    ? 'Saving…'
                    : 'Scheduling…'
                  : changing
                    ? 'Save new time'
                    : 'Schedule post'}
              </button>
              {changing ? (
                <button
                  type="button"
                  onClick={() => setChanging(false)}
                  className="paragraph-xs text-quaternary hover:underline text-left"
                >
                  Back
                </button>
              ) : (
                <p className="paragraph-xs text-quaternary">
                  Copy and image are locked in as they are now. Manage it on the Posts page.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {cropOpen && firstImage && imgRatio !== null && (
        <CropAdjuster
          url={firstImage}
          imgRatio={imgRatio}
          targetRatio={targetRatio}
          onSave={(c) => {
            setCrop(c)
            setCropOpen(false)
          }}
          onClose={() => setCropOpen(false)}
        />
      )}
    </div>
  )
}
