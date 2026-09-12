import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarPlus01 } from '../../../components/icon/calendar-plus-01'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { confirmAction, type CanvasDocument } from '../services/chat-service'
import type { CreativeSpec } from './previews/creative-spec'
import { CropAdjuster } from './crop-adjuster'
import { IG_MAX_RATIO, IG_MIN_RATIO, type CropBox } from './crop-utils'

interface SchedulePostProps {
  doc: CanvasDocument
  spec: CreativeSpec | null
  conversationId: string | null
}

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
export const SchedulePost = ({ doc, spec, conversationId }: SchedulePostProps) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const tenantId = activeWorkspace?.tenant_id

  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<'facebook' | 'instagram'>('facebook')
  const [{ date, time }, setWhen] = useState(defaultSchedule)
  const [submitting, setSubmitting] = useState(false)
  const [imgRatio, setImgRatio] = useState<number | null>(null)
  const [crop, setCrop] = useState<CropBox | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Only offer scheduling for organic Facebook/Instagram deliverables — ads and
  // other platforms keep their existing campaign/push flows.
  const eligible =
    !spec || (!spec.isPaid && (spec.platform === 'facebook' || spec.platform === 'instagram'))

  useEffect(() => {
    if (spec?.platform === 'instagram') setPlatform('instagram')
    else setPlatform('facebook')
  }, [spec?.platform])

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
      // The Posts page list is cached (React Query) — invalidate so the new
      // post is there the moment the user goes looking for it.
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      // Home (Basic) turns its card over and blinks Posts when it hears this.
      window.dispatchEvent(
        new CustomEvent('mia:post-scheduled', {
          detail: { platform, scheduled_at: scheduledDate.toISOString(), title: doc.title },
        })
      )
      setOpen(false)
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Schedule post"
        aria-expanded={open}
        title="Schedule this post to Facebook or Instagram"
        className="w-8 h-8 max-md:w-10 max-md:h-10 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
      >
        <CalendarPlus01 size={16} />
      </button>

      {open && (
        <div className="absolute z-40 top-full right-0 mt-1 w-72 rounded-xl border border-tertiary bg-primary shadow-lg p-3 flex flex-col gap-2.5">
          <p className="paragraph-sm font-semibold text-primary">Schedule post</p>

          <div>
            <p className="label-xs text-tertiary mb-0.5">Publish to</p>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'facebook' | 'instagram')}
              className={inputCls}
            >
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <p className="label-xs text-tertiary mb-0.5">Date</p>
              <input
                type="date"
                value={date}
                onChange={(e) => setWhen((w) => ({ ...w, date: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="w-24">
              <p className="label-xs text-tertiary mb-0.5">Time</p>
              <input
                type="time"
                value={time}
                onChange={(e) => setWhen((w) => ({ ...w, time: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          {bestTime && <p className="paragraph-xs text-quaternary">✦ Mia suggests: {bestTime}</p>}
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
            disabled={!canSubmit}
            onClick={() => void submit()}
            className="w-full py-1.5 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium disabled:opacity-40 transition-opacity"
          >
            {submitting ? 'Scheduling…' : 'Schedule post'}
          </button>
          <p className="paragraph-xs text-quaternary">
            Copy and image are locked in as they are now. Manage it on the Posts page.
          </p>
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
