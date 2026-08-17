import { useCallback, useEffect, useRef, useState } from 'react'
import { miaCreateApi, type MiaAsset } from '../../creative-studio/creative-studio-api'
import { useSession } from '../../../contexts/session-context'
import { Pencil01 } from '../../../components/icon/pencil-01'
import { Maximize01 } from '../../../components/icon/maximize-01'
import { XClose } from '../../../components/icon/x-close'
import { Stars01 } from '../../../components/icon/stars-01'
import { ImagePlus } from '../../../components/icon/image-plus'
import { Skeleton } from '../../../components/skeleton'
import { MIA_ASSET_DRAG_TYPE } from './previews/preview-bits'
import type { ImageJobEvent } from '../services/chat-service'

const POLL_MS = 3000
/** ~2.5 min — generation is 30–60s; a stuck job stops polling instead of forever. */
const MAX_TICKS = 50

/**
 * A live event carries only job ids (the card polls for the images); a card restored
 * from a reopened conversation carries its assets directly — nothing left to poll.
 */
export type ChatImageJob = ImageJobEvent & { assets?: MiaAsset[] }

interface Props {
  event: ChatImageJob
  /** Asset currently pinned as the edit target (across the whole thread). */
  pinnedAssetId?: string | null
  onPin?: (asset: MiaAsset | null) => void
  /** "Use in post": pin the asset and ask Mia to put it in a post document. */
  onUseInPost?: (asset: MiaAsset) => void
}

/**
 * Images generated in chat. `generate_creative` returns immediately with job ids, so the
 * card polls the Mia Create job/set endpoints until the assets exist, then renders them
 * with their Vision scores. Sync tools (composite / placement set) arrive already done.
 *
 * Polling (rather than streaming the images) reuses the endpoints the Mia Create page
 * already depends on — see docs/CHAT_IMAGE_GEN_SCOPE.md D2.
 */
export function ChatImageCard({ event, pinnedAssetId, onPin, onUseInPost }: Props) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id || ''
  const [assets, setAssets] = useState<MiaAsset[]>(event.assets ?? [])
  const [failed, setFailed] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ticksRef = useRef(0)
  // Vision scoring (finalize_set) lands just AFTER every job reports complete, so keep
  // polling a few extra ticks once images are up to catch the scores + best-of-N pick.
  const graceRef = useRef(0)

  const expected = Math.max(1, event.num_images || 1)
  // A finished set/composite is authoritative; otherwise we're still waiting.
  const settled = assets.length >= expected || failed !== null || timedOut

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }, [])

  useEffect(() => {
    // Restored from a reopened conversation — the assets came with the event.
    if (event.assets?.length) return
    // Sync tools hand us the finished URLs — nothing to poll.
    if (event.status === 'done' && event.cdn_urls?.length) {
      setAssets(
        event.cdn_urls.map((url, i) => ({
          asset_id: `inline-${i}-${url}`,
          cdn_url: url,
          media_type: 'image' as const,
        }))
      )
      return
    }
    if (!tenantId || !sessionId) return

    const poll = async () => {
      ticksRef.current += 1
      if (ticksRef.current > MAX_TICKS) {
        setTimedOut(true)
        stop()
        return
      }
      try {
        if (event.variant_group) {
          const set = await miaCreateApi.getSet(sessionId, tenantId, event.variant_group)
          if (set.assets.length) setAssets(set.assets)
          // `complete` means every job settled — some may have failed, so a short set is
          // the real answer, not a reason to keep polling for the missing ones.
          if (set.complete) {
            const errored = set.jobs.filter((j) => j.status === 'failed')
            if (errored.length && !set.assets.length) {
              setFailed(errored[0].error_message || 'Generation failed.')
              stop()
              return
            }
            const scored = set.assets.some((a) => a.vision_score)
            graceRef.current += 1
            // Scoring 3 images + the diversity pass takes ~20-40s after the last job
            // completes — 15 ticks (45s) covers it; stop early the moment scores land.
            if (scored || graceRef.current > 15) stop()
          }
          return
        }
        if (event.job_id) {
          const job = await miaCreateApi.getJob(sessionId, tenantId, event.job_id)
          if (job.status === 'completed') {
            const { assets: jobAssets } = await miaCreateApi.listJobAssets(
              sessionId,
              tenantId,
              event.job_id
            )
            // Fall back to the job's own output_urls if the asset rows aren't visible yet.
            setAssets(
              jobAssets.length
                ? jobAssets
                : job.output_urls.map((url, i) => ({
                    asset_id: `job-${event.job_id}-${i}`,
                    cdn_url: url,
                    media_type: 'image' as const,
                  }))
            )
            stop()
          } else if (job.status === 'failed') {
            setFailed(job.error_message || 'Generation failed.')
            stop()
          }
        }
      } catch {
        // Transient poll failures are expected (job row not yet visible); keep ticking
        // until MAX_TICKS rather than showing an error on the first miss.
      }
    }

    void poll()
    timerRef.current = setInterval(poll, POLL_MS)
    return stop
  }, [event, tenantId, sessionId, stop])

  if (failed) {
    return (
      <div className="mt-3 rounded-lg border border-secondary bg-secondary p-3">
        <p className="paragraph-sm text-secondary">Couldn't generate that image. {failed}</p>
      </div>
    )
  }

  const label =
    event.tool === 'make_placement_set'
      ? 'Placement sizes'
      : event.tool === 'composite_creative'
        ? 'Finished creative'
        : expected > 1
          ? `${expected} options`
          : 'Generated image'

  // A one-image card takes its natural width so sibling cards in the same turn sit
  // side by side (Mia sometimes generates one image per concept) instead of stacking.
  const single = expected === 1
  return (
    <div className={single ? 'mt-3 w-44 shrink-0' : 'mt-3 w-full'}>
      <div className="flex items-center gap-1.5 mb-2">
        <Stars01 size={13} className="text-brand-secondary" />
        <span className="paragraph-xs text-quaternary">
          {settled ? label : `${label} — generating…`}
        </span>
        {event.aspect_ratio && (
          <span className="paragraph-xs text-quaternary">· {event.aspect_ratio}</span>
        )}
      </div>

      <div
        className={`items-start ${
          single ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2'
        }`}
      >
        {assets.map((asset) => (
          <ImageTile
            key={asset.asset_id}
            asset={asset}
            isPinned={!!pinnedAssetId && asset.asset_id === pinnedAssetId}
            canPin={!!onPin && !asset.asset_id.startsWith('inline-')}
            onPin={onPin}
            onZoom={setZoom}
            onUseInPost={
              onUseInPost && !asset.asset_id.startsWith('inline-') ? onUseInPost : undefined
            }
          />
        ))}
        {!settled &&
          Array.from({ length: Math.max(0, expected - assets.length) }, (_, i) => (
            <div
              key={`ph-${i}`}
              className="rounded-lg border border-secondary overflow-hidden animate-pulse"
            >
              <Skeleton className="w-full aspect-square rounded-none" />
            </div>
          ))}
      </div>

      {timedOut && !assets.length && (
        <p className="paragraph-xs text-quaternary mt-2">
          Still generating — check Mia Create → Library in a moment.
        </p>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setZoom(null)}
          role="button"
          tabIndex={-1}
        >
          <img src={zoom} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
          <button
            onClick={() => setZoom(null)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70"
            aria-label="Close preview"
          >
            <XClose size={20} />
          </button>
        </div>
      )}
    </div>
  )
}

function ImageTile({
  asset,
  isPinned,
  canPin,
  onPin,
  onZoom,
  onUseInPost,
}: {
  asset: MiaAsset
  isPinned: boolean
  canPin: boolean
  onPin?: (asset: MiaAsset | null) => void
  onZoom: (url: string) => void
  onUseInPost?: (asset: MiaAsset) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        // Draggable into the canvas media slot (preview-bits MediaSlot reads this).
        e.dataTransfer.setData(
          MIA_ASSET_DRAG_TYPE,
          JSON.stringify({
            asset_id: asset.asset_id,
            cdn_url: asset.cdn_url,
            ratio: asset.ratio ?? null,
          })
        )
        e.dataTransfer.setData('text/plain', asset.cdn_url)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className={[
        'relative rounded-lg overflow-hidden border bg-secondary group cursor-grab active:cursor-grabbing',
        isPinned ? 'border-brand-solid ring-2 ring-brand-solid/50' : 'border-secondary',
      ].join(' ')}
    >
      {asset.ratio && (
        <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-black/60 text-white paragraph-xs font-semibold">
          {asset.ratio}
        </span>
      )}
      {asset.selected && !asset.ratio && (
        <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-success-solid text-primary-onbrand paragraph-xs font-semibold">
          pick
        </span>
      )}
      {isPinned && (
        <span className="absolute bottom-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-brand-solid text-primary-onbrand paragraph-xs font-semibold">
          editing this
        </span>
      )}

      {/* Full image, its own aspect — a fixed square crop clipped the composited
          headline on every non-square placement (4:5, 9:16, 16:9), which read as a
          broken render even though the stored asset was correct. */}
      <img
        src={asset.cdn_url}
        alt={asset.prompt || 'Generated creative'}
        loading="lazy"
        className="w-full h-auto block"
      />

      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {canPin && (
          <button
            onClick={() => onPin?.(isPinned ? null : asset)}
            title={isPinned ? 'Stop editing this image' : 'Edit this image — your next message changes it'}
            className={[
              'p-1.5 rounded',
              isPinned
                ? 'bg-brand-solid text-primary-onbrand'
                : 'bg-black/60 text-white hover:bg-brand-solid',
            ].join(' ')}
          >
            <Pencil01 size={14} />
          </button>
        )}
        {onUseInPost && (
          <button
            onClick={() => onUseInPost(asset)}
            title="Use in post — Mia drafts the post with this image in the canvas"
            className="p-1.5 rounded bg-black/60 text-white hover:bg-brand-solid"
          >
            <ImagePlus size={14} />
          </button>
        )}
        <button
          onClick={() => onZoom(asset.cdn_url)}
          title="View full size"
          className="p-1.5 rounded bg-black/60 text-white hover:bg-black/80"
        >
          <Maximize01 size={14} />
        </button>
      </div>

      {asset.vision_score && (
        <div className="px-2 py-1.5">
          <span className="paragraph-xs text-quaternary">
            on-brand {asset.vision_score.on_brand}/10 · overall {asset.vision_score.overall}/10
          </span>
        </div>
      )}
    </div>
  )
}

export default ChatImageCard
