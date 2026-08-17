import { useEffect, useRef, useState, type DragEvent } from 'react'
import type { CharCheck, CreativeSpec } from './creative-spec'

export interface MediaHandlers {
  /** Upload image/video files into this document's media slot — multi-drop = one slide each, in order. */
  onUploadMedia?: (files: File[]) => void
  /** Remove an uploaded media item (by URL). */
  onRemoveMedia?: (url: string) => void
  isUploadingMedia?: boolean
  /** Open the "From Canva" design browser (present only when the workspace has Canva connected). */
  onOpenCanvaPicker?: () => void
  /** Add an already-hosted image URL as a new slide (e.g. an image dragged in from chat). */
  onAddMediaUrl?: (url: string) => void
  /** Swap one existing media URL for another (drag-drop "Replace" on an occupied slot). */
  onReplaceMediaUrl?: (oldUrl: string, newUrl: string) => void
  /** Dropped image's format doesn't fit this post — pin it and ask Mia for a matching post. */
  onDraftSeparatePost?: (asset: { asset_id?: string; cdn_url: string }) => void
}

/** Drag payload type set by chat image tiles (see chat-image-card.tsx). */
export const MIA_ASSET_DRAG_TYPE = 'application/x-mia-asset'

/** `Media:` URLs keep their uploaded filename, so the extension tells image from video. */
const isVideoUrl = (url: string) => /\.(mp4|mov|m4v|webm|avi|mkv)([?#]|$)/i.test(url)

/**
 * Shared pieces for the platform previews. Platform components use each
 * platform's real light/dark palette (hardcoded hexes behind the `dark:`
 * variant); everything Mia-chrome (notes, chips) uses the semantic tokens.
 */

export const BrandAvatar = ({ name, size = 38 }: { name?: string; size?: number }) => (
  <div
    aria-hidden="true"
    className="rounded-full bg-utility-brand-600 flex items-center justify-center shrink-0 text-white font-semibold"
    style={{ width: size, height: size, fontSize: size * 0.42 }}
  >
    {(name?.trim()[0] ?? 'M').toUpperCase()}
  </div>
)

interface MediaSlotProps extends MediaHandlers {
  visuals: string[]
  /** Uploaded creative URLs — when present, rendered instead of the placeholder. */
  media: string[]
  /** Platform-appropriate frame colors, e.g. FB grey vs IG near-white. */
  className?: string
  /** Tailwind aspect class used for the empty placeholder (and cover mode). */
  aspect?: string
  carousel?: boolean
  /** Fill the parent frame (Reel/Story): absolute-positioned, object-cover images. */
  cover?: boolean
  /** Video/animation formats: centered play-button overlay. */
  play?: boolean
  /** Small corner chip over the media, e.g. "Animation". */
  badge?: string
  /**
   * Honest-feed clamp: images taller (narrower) than this width/height ratio are
   * shown center-cropped AT this ratio — matching how the platform's feed actually
   * displays them (FB/IG cap portrait display around 4:5). Without it a tall poster
   * stretches the whole preview, which the real feed would never do.
   */
  clampPortrait?: number
}

/**
 * The media slot: renders uploaded creative at its natural ratio (multiple
 * images = swipeable slides), or Mia's suggested-visual brief until one
 * exists. Upload = click the + button or drop an image file onto the slot.
 */
export const MediaSlot = ({
  visuals,
  media,
  className = '',
  aspect = 'aspect-[1.91/1]',
  carousel = false,
  cover = false,
  play = false,
  badge,
  clampPortrait,
  onUploadMedia,
  onRemoveMedia,
  isUploadingMedia = false,
  onOpenCanvaPicker,
  onAddMediaUrl,
  onReplaceMediaUrl,
  onDraftSeparatePost,
}: MediaSlotProps) => {
  const [slide, setSlide] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [ratios, setRatios] = useState<Record<string, number>>({})
  // An image dragged in from chat while the slot already has media — the user
  // chooses Replace (swap the current slide) or Add (new carousel slide). `warn`
  // carries a format-mismatch caution (e.g. a square image onto a Story post).
  const [pendingDrop, setPendingDrop] = useState<{
    url: string
    assetId?: string
    warn?: string
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const count = media.length

  const readAssetDrop = (
    e: DragEvent
  ): { url: string; assetId?: string; ratio?: string | null } | null => {
    try {
      const raw = e.dataTransfer.getData(MIA_ASSET_DRAG_TYPE)
      if (raw) {
        const parsed = JSON.parse(raw) as {
          cdn_url?: string
          asset_id?: string
          ratio?: string | null
        }
        if (parsed.cdn_url)
          return { url: parsed.cdn_url, assetId: parsed.asset_id, ratio: parsed.ratio }
      }
    } catch {
      /* fall through to plain text */
    }
    const text = e.dataTransfer.getData('text/plain')
    return text && /^https?:\/\//.test(text) ? { url: text } : null
  }

  /** Story slots (cover mode) want ~9:16; feed slots don't. Known-ratio drops that
   * conflict get a caution in the chooser — never a hard block. */
  const formatWarning = (ratio: string | null | undefined): string | undefined => {
    if (!ratio) return undefined
    if (cover && ratio !== '9:16') return `This is a ${ratio} image — this post is a Story/Reel (9:16).`
    if (!cover && ratio === '9:16') return `This is a 9:16 Story image — this post is a feed format.`
    return undefined
  }

  useEffect(() => {
    if (slide >= count) setSlide(Math.max(0, count - 1))
  }, [count, slide])

  const pickFiles = (files: FileList | null) => {
    // Videos are first-class here (reel/video/story deliverables) — silently
    // filtering them out was exactly the "I added it but nothing loads" bug.
    const accepted = Array.from(files ?? []).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    )
    if (accepted.length > 0) onUploadMedia?.(accepted)
  }

  const hasImage = count > 0
  // Cover mode must stay position:absolute — adding `relative` alongside it lets
  // `position:relative` win in the emitted CSS and collapses the slot to the top
  // of the 9:16 frame (visual brief overlapping the story/reel chrome).
  const frame = cover ? 'absolute inset-0' : `relative ${hasImage ? '' : aspect}`

  return (
    <div
      className={`${frame} ${className} group/media overflow-hidden ${
        dragging ? 'ring-2 ring-inset ring-utility-brand-600' : ''
      }`}
      onDragOver={(e) => {
        const isAssetDrag = e.dataTransfer.types.includes(MIA_ASSET_DRAG_TYPE)
        if (!onUploadMedia && !(isAssetDrag && onAddMediaUrl)) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        const dropped = readAssetDrop(e)
        if (dropped && onAddMediaUrl) {
          // Image dragged in from the chat thread — already hosted, no upload.
          e.preventDefault()
          setDragging(false)
          const warn = formatWarning(dropped.ratio)
          if ((count === 0 || !onReplaceMediaUrl) && !warn) {
            onAddMediaUrl(dropped.url)
          } else {
            // Occupied slot OR format mismatch → the user picks what happens.
            setPendingDrop({ url: dropped.url, assetId: dropped.assetId, warn })
          }
          return
        }
        if (!onUploadMedia) return
        e.preventDefault()
        setDragging(false)
        pickFiles(e.dataTransfer.files)
      }}
    >
      {pendingDrop && (
        <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center gap-2 px-3 text-center">
          <span className="paragraph-xs text-white font-medium">
            {pendingDrop.warn ?? 'Use dragged image how?'}
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {count > 0 && onReplaceMediaUrl && (
              <button
                type="button"
                onClick={() => {
                  onReplaceMediaUrl(media[slide], pendingDrop.url)
                  setPendingDrop(null)
                }}
                className="px-3 py-1.5 rounded-lg bg-white text-black paragraph-xs font-semibold"
              >
                Replace this slide
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onAddMediaUrl?.(pendingDrop.url)
                setPendingDrop(null)
              }}
              className="px-3 py-1.5 rounded-lg bg-utility-brand-600 text-white paragraph-xs font-semibold"
            >
              {count > 0 ? 'Add as slide' : 'Use anyway'}
            </button>
            {pendingDrop.warn && pendingDrop.assetId && onDraftSeparatePost && (
              <button
                type="button"
                onClick={() => {
                  onDraftSeparatePost({ asset_id: pendingDrop.assetId, cdn_url: pendingDrop.url })
                  setPendingDrop(null)
                }}
                className="px-3 py-1.5 rounded-lg bg-black/70 border border-white/40 text-white paragraph-xs font-semibold"
              >
                New post for this size
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPendingDrop(null)}
            className="paragraph-xs text-white/70 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
      {hasImage ? (
        isVideoUrl(media[slide]) ? (
          <video
            key={media[slide]}
            src={media[slide]}
            controls
            muted
            playsInline
            preload="metadata"
            // contain, not cover: a non-9:16 video (e.g. a landscape clip in the reel
            // frame) letterboxes on black so the WHOLE frame is reviewable — cover
            // crops it to a middle strip. A true vertical reel still fills edge-to-edge.
            className={
              cover ? 'w-full h-full object-contain bg-black' : 'w-full h-auto block bg-black'
            }
          />
        ) : (
          (() => {
            const naturalRatio = ratios[media[slide]]
            const clamped =
              !cover &&
              clampPortrait != null &&
              naturalRatio != null &&
              naturalRatio < clampPortrait
            // Story/Reel frames are 9:16 (0.5625). A squarer or wider image cover-cropped
            // into them is scaled ~1.8× and sliced at both edges — which mangles any
            // composited headline (it reads as a rendering bug, and is how a 1:1 dropped
            // into a Story looked). Letterbox it instead, same as the video branch above,
            // which also matches what Instagram itself does with a square Story upload.
            const containInStory = cover && naturalRatio != null && naturalRatio > 0.62
            return (
              <img
                src={media[slide]}
                alt={`Creative slide ${slide + 1} of ${count}`}
                title={clamped ? 'Shown as the feed will crop it — the full image is kept' : undefined}
                onLoad={(e) => {
                  const el = e.currentTarget
                  if (el.naturalWidth && el.naturalHeight) {
                    setRatios((r) => ({ ...r, [el.src]: el.naturalWidth / el.naturalHeight }))
                  }
                }}
                className={`${
                  cover
                    ? containInStory
                      ? 'w-full h-full object-contain bg-black'
                      : 'w-full h-full object-cover'
                    : clamped
                      ? 'w-full block object-cover'
                      : 'w-full h-auto block'
                } ${count > 1 ? 'cursor-pointer' : ''}`}
                style={clamped ? { aspectRatio: String(clampPortrait) } : undefined}
                draggable={false}
                // Instagram behavior: tapping the creative advances the carousel.
                onClick={() => count > 1 && setSlide((s) => (s + 1) % count)}
              />
            )
          })()
        )
      ) : (
        <div
          className={`${cover ? 'h-full' : aspect} flex flex-col items-center justify-center gap-1.5 px-8 text-center`}
        >
          <span className="text-[10px] uppercase tracking-[0.12em] opacity-60">
            Suggested visual
          </span>
          {visuals.length > 0 ? (
            <span className="text-[12.5px] italic opacity-90 max-w-[36ch] leading-snug">
              {visuals[0]}
              {visuals.length > 1 && (
                <span className="opacity-60"> +{visuals.length - 1} more slides</span>
              )}
            </span>
          ) : (
            <span className="text-[12.5px] italic opacity-60">No visual brief yet</span>
          )}
          {onUploadMedia && (
            <span className="text-[10.5px] opacity-50">Drop an image or video here or click +</span>
          )}
        </div>
      )}

      {play && hasImage && !isVideoUrl(media[slide]) && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-12 h-12 rounded-full bg-black/45 backdrop-blur-[2px] flex items-center justify-center">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          </span>
        </span>
      )}
      {badge && (
        <span className="absolute top-2 left-2 rounded bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 uppercase tracking-[0.08em] pointer-events-none">
          {badge}
        </span>
      )}

      {/* Slide arrows + dots (only with multiple images) */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={(e) => {
              e.stopPropagation()
              setSlide((s) => (s - 1 + count) % count)
            }}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-60 hover:opacity-100 group-hover/media:opacity-100 transition-opacity"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={(e) => {
              e.stopPropagation()
              setSlide((s) => (s + 1) % count)
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-60 hover:opacity-100 group-hover/media:opacity-100 transition-opacity"
          >
            ›
          </button>
        </>
      )}
      {count > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex">
          {media.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={(e) => {
                e.stopPropagation()
                setSlide(i)
              }}
              className="p-1"
            >
              <span
                className={`block w-1.5 h-1.5 rounded-full bg-white drop-shadow transition-opacity ${
                  i === slide ? 'opacity-95' : 'opacity-40'
                }`}
              />
            </button>
          ))}
        </div>
      )}
      {carousel && !hasImage && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full bg-current ${i === 0 ? 'opacity-90' : 'opacity-30'}`}
            />
          ))}
        </div>
      )}

      {/* Upload / remove controls */}
      {onUploadMedia && (
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            pickFiles(e.target.files)
            e.target.value = ''
          }}
        />
      )}
      {(onUploadMedia || onOpenCanvaPicker) && (
        <div
          className={`absolute ${
            // Cover frames (reel/story) keep their bottom edge for captions,
            // reply bar and CTAs — park the controls top-right, below the
            // story progress bars.
            cover ? 'top-8 right-2' : 'bottom-2 right-2'
          } flex gap-1.5`}
        >
          {onOpenCanvaPicker && (
            <button
              type="button"
              aria-label="Import a design from Canva"
              disabled={isUploadingMedia}
              onClick={(e) => {
                e.stopPropagation()
                onOpenCanvaPicker()
              }}
              className={`h-7 rounded-full bg-black/45 text-white text-[12px] font-medium flex items-center gap-1 px-2.5 transition-opacity ${
                hasImage ? 'opacity-0 group-hover/media:opacity-100' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <span
                aria-hidden="true"
                className="w-3.5 h-3.5 rounded-[4px] flex items-center justify-center text-[9px] font-bold font-serif"
                style={{ background: 'linear-gradient(135deg,#00C4CC,#7D2AE8)' }}
              >
                C
              </span>
              Canva
            </button>
          )}
          {onUploadMedia && (
            <button
              type="button"
              aria-label="Upload image or video"
              disabled={isUploadingMedia}
              onClick={(e) => {
                e.stopPropagation()
                fileRef.current?.click()
              }}
              className={`h-7 rounded-full bg-black/45 text-white text-[12px] font-medium flex items-center justify-center px-2.5 transition-opacity ${
                hasImage ? 'opacity-0 group-hover/media:opacity-100' : 'opacity-80 hover:opacity-100'
              }`}
            >
              {isUploadingMedia ? 'Uploading…' : hasImage ? '+ Add' : '+ Media'}
            </button>
          )}
        </div>
      )}
      {onRemoveMedia && hasImage && (
        <button
          type="button"
          aria-label="Remove this image"
          onClick={(e) => {
            e.stopPropagation()
            onRemoveMedia(media[slide])
          }}
          className={`absolute ${
            cover ? 'top-[68px] right-2' : 'top-2 right-2'
          } w-6 h-6 rounded-full bg-black/45 text-white text-[12px] flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity`}
        >
          ✕
        </button>
      )}
    </div>
  )
}

/** Character-limit chips (Mia chrome — semantic tokens). */
export const CharCountChips = ({ checks }: { checks: CharCheck[] }) => {
  if (checks.length === 0) return null
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {checks.map((c) => (
        <span
          key={c.label}
          className={`paragraph-sm px-2 py-0.5 rounded-md border tabular-nums ${
            c.over
              ? 'border-utility-warning-300 text-utility-warning-600'
              : 'border-tertiary text-quaternary'
          }`}
          title={c.over ? `Over the ${c.limit}-character limit` : undefined}
        >
          {c.label} · {c.count}/{c.limit}
        </span>
      ))}
    </div>
  )
}

/** Visual-brief notes — redundant once real creative is uploaded (they still show in Text view). */
const VISUAL_BRIEF_NOTE = /text on (the )?image|on-image text|suggested visual/i

/** Production notes strip below the preview (Format, Best time, Why this works…). */
export const ProductionNotes = ({ spec }: { spec: CreativeSpec }) => {
  const hasMedia = spec.media.length > 0
  const notes = hasMedia ? spec.notes.filter((n) => !VISUAL_BRIEF_NOTE.test(n.label)) : spec.notes
  const showVisuals = !hasMedia && spec.visuals.length > 1
  if (notes.length === 0 && !showVisuals) return null
  return (
    <div className="w-full max-w-[420px] rounded-xl border border-tertiary bg-secondary/40 px-4 py-3 flex flex-col gap-1.5">
      {notes.map((n, i) => (
        <p key={`${n.label}-${i}`} className="paragraph-sm text-tertiary">
          <span className="font-semibold text-secondary">{n.label}:</span> {n.value}
        </p>
      ))}
      {showVisuals && (
        <div className="paragraph-sm text-tertiary">
          <span className="font-semibold text-secondary">Suggested visuals:</span>
          <ul className="mt-0.5 list-disc pl-4 flex flex-col gap-0.5">
            {spec.visuals.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* --- tiny inline platform-look icons (kept local so previews don't depend on the app icon set) --- */

const icon = (path: string, filled = false) =>
  function PreviewIcon({ size = 20 }: { size?: number }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
    )
  }

export const HeartIcon = icon(
  'M20.4 4.6a5.5 5.5 0 0 0-7.8 0L12 5.2l-.6-.6a5.5 5.5 0 0 0-7.8 7.8l.6.6L12 20.8 19.8 13l.6-.6a5.5 5.5 0 0 0 0-7.8Z'
)
export const CommentIcon = icon('M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1L3 20l1-5.3A8.5 8.5 0 1 1 21 11.5Z')
export const SendIcon = icon('M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z')
export const BookmarkIcon = icon('M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z')
export const ThumbsUpIcon = icon(
  'M7 10v12M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 7A2 2 0 0 1 17.5 21H7V10l4.4-7.2A2 2 0 0 1 15 5.9Z'
)
export const ShareIcon = icon('M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13')
