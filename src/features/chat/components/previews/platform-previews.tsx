import type { CreativeSpec } from './creative-spec'
import { displayDomain } from './creative-spec'
import {
  BookmarkIcon,
  BrandAvatar,
  CommentIcon,
  HeartIcon,
  MediaSlot,
  SendIcon,
  ShareIcon,
  ThumbsUpIcon,
  type MediaHandlers,
} from './preview-bits'

/**
 * Platform-native mock renderers. Each uses the platform's REAL light/dark
 * palette (Facebook white ↔ #242526, Instagram white ↔ black, Google light ↔
 * dark SERP) keyed off the app theme via the `dark:` variant — so the preview
 * is a faithful mock of the platform in either app theme.
 *
 * Copy is rendered in full (it's an editing surface — highlight-to-edit needs
 * the whole text selectable); the fold char-chip communicates truncation.
 */

interface PreviewProps extends MediaHandlers {
  spec: CreativeSpec
  brandName?: string
}

const igHandle = (name?: string) =>
  (name ?? 'yourbrand').toLowerCase().replace(/[^a-z0-9._]/g, '') || 'yourbrand'

/** Video-ish formats get the play-button overlay; animation also gets a chip. */
const isMotion = (spec: CreativeSpec) => spec.format === 'video' || spec.format === 'animation'
const motionBadge = (spec: CreativeSpec) => (spec.format === 'animation' ? 'Animation' : undefined)

const Hashtags = ({ tags, className }: { tags: string; className: string }) =>
  tags ? <span className={className}> {tags}</span> : null

/* ---------------------------------- Facebook ---------------------------------- */

export const FacebookPreview = ({ spec, brandName, ...media }: PreviewProps) => {
  const showLinkCard = spec.isPaid && (spec.headline || spec.cta || spec.linkUrl)
  return (
    <div className="w-full max-w-[400px] rounded-xl overflow-hidden bg-white text-[#050505] border border-[#E4E6EB] shadow-sm dark:bg-[#242526] dark:text-[#E4E6EB] dark:border-transparent">
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <BrandAvatar name={brandName} size={38} />
        <div className="leading-tight">
          <p className="text-[14px] font-semibold">{brandName || 'Your Page'}</p>
          <p className="text-[12px] text-[#65676B] dark:text-[#B0B3B8]">
            {spec.isPaid ? 'Sponsored' : 'Just now'}
          </p>
        </div>
      </div>

      {spec.primaryText && (
        <p className="px-3.5 py-2.5 text-[13.5px] leading-[1.45] whitespace-pre-line">
          {spec.primaryText}
          <Hashtags tags={spec.hashtags} className="text-[#216FDB] dark:text-[#4599FF]" />
        </p>
      )}

      <MediaSlot
        visuals={spec.visuals}
        media={spec.media}
        aspect={spec.format === 'carousel' ? 'aspect-square' : 'aspect-[1.91/1]'}
        carousel={spec.format === 'carousel'}
        play={isMotion(spec)}
        badge={motionBadge(spec)}
        className="bg-[#F0F2F5] text-[#65676B] dark:bg-[#18191A] dark:text-[#B0B3B8]"
        {...media}
      />

      {showLinkCard && (
        <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[#F0F2F5] dark:bg-[#3A3B3C]">
          <div className="flex-1 min-w-0 leading-tight">
            <p className="text-[11px] uppercase tracking-wide text-[#65676B] dark:text-[#B0B3B8]">
              {displayDomain(spec.linkUrl)}
            </p>
            {spec.headline && <p className="text-[13.5px] font-semibold truncate">{spec.headline}</p>}
            {spec.description && (
              <p className="text-[12px] text-[#65676B] dark:text-[#B0B3B8] truncate">
                {spec.description}
              </p>
            )}
          </div>
          {spec.cta && (
            <span className="shrink-0 rounded-md bg-[#E4E6EB] dark:bg-[#4E4F50] px-3 py-1.5 text-[13px] font-semibold">
              {spec.cta}
            </span>
          )}
        </div>
      )}

      <div className="mx-3.5 mt-1 flex justify-around border-t border-[#CED0D4]/70 dark:border-[#3E4042] py-1.5 text-[13px] font-medium text-[#65676B] dark:text-[#B0B3B8]">
        <span className="flex items-center gap-1.5">
          <ThumbsUpIcon size={16} /> Like
        </span>
        <span className="flex items-center gap-1.5">
          <CommentIcon size={16} /> Comment
        </span>
        <span className="flex items-center gap-1.5">
          <ShareIcon size={16} /> Share
        </span>
      </div>
    </div>
  )
}

/* ---------------------------------- Instagram feed ---------------------------------- */

export const InstagramPreview = ({ spec, brandName, ...media }: PreviewProps) => (
  <div className="w-full max-w-[360px] rounded-xl overflow-hidden bg-white text-[#262626] border border-[#DBDBDB] dark:bg-black dark:text-[#F5F5F5] dark:border-[#262626]">
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <BrandAvatar name={brandName} size={32} />
      <div className="leading-tight">
        <p className="text-[13px] font-semibold">{igHandle(brandName)}</p>
        {spec.isPaid && <p className="text-[11px] text-[#737373] dark:text-[#A8A8A8]">Sponsored</p>}
      </div>
    </div>

    <MediaSlot
      visuals={spec.visuals}
      media={spec.media}
      aspect="aspect-square"
      carousel={spec.format === 'carousel'}
      play={isMotion(spec)}
      badge={motionBadge(spec)}
      className="bg-[#FAFAFA] text-[#737373] border-y border-[#EFEFEF] dark:bg-[#111111] dark:text-[#A8A8A8] dark:border-[#1C1C1C]"
      {...media}
    />

    {spec.isPaid && spec.cta && (
      <p className="px-3 py-2 text-[13px] font-semibold text-[#0095F6] border-b border-[#EFEFEF] dark:border-[#1C1C1C]">
        {spec.cta} ›
      </p>
    )}

    <div className="flex items-center gap-4 px-3 pt-2.5">
      <HeartIcon size={22} />
      <CommentIcon size={21} />
      <SendIcon size={20} />
      <span className="ml-auto">
        <BookmarkIcon size={21} />
      </span>
    </div>

    {spec.primaryText && (
      <p className="px-3 pt-2 pb-3 text-[12.5px] leading-[1.45] whitespace-pre-line">
        <span className="font-semibold">{igHandle(brandName)}</span> {spec.primaryText}
        <Hashtags tags={spec.hashtags} className="text-[#00376B] dark:text-[#B3C7F9]" />
      </p>
    )}
  </div>
)

/* ---------------------------------- Instagram Reel / Story ---------------------------------- */

export const InstagramReelPreview = ({ spec, brandName, ...media }: PreviewProps) => {
  const isStory = spec.format === 'story'
  return (
    <div className="w-[250px] max-w-full aspect-[9/16] rounded-2xl overflow-hidden relative text-white bg-gradient-to-b from-[#3B3B3F] via-[#232326] to-[#111113] ring-1 ring-[#DBDBDB] dark:ring-[#262626]">
      <MediaSlot
        visuals={spec.visuals}
        media={spec.media}
        cover
        className="text-white/80"
        {...media}
      />

      {isStory ? (
        <>
          {/* Story chrome: segmented progress bars + identity at the top. */}
          <div className="absolute top-2 left-2 right-2 flex gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-[2.5px] flex-1 rounded-full ${i === 0 ? 'bg-white/90' : 'bg-white/35'}`}
              />
            ))}
          </div>
          <div className="absolute top-4 left-3 right-3 flex items-center gap-2 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
            <BrandAvatar name={brandName} size={24} />
            <p className="text-[12.5px] font-semibold truncate">{igHandle(brandName)}</p>
            <p className="text-[11px] text-white/70">{spec.isPaid ? 'Sponsored' : '2h'}</p>
          </div>
        </>
      ) : (
        <>
          <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.12em] text-white/70 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
            Reel{spec.isPaid ? ' · Sponsored' : ''}
          </span>
          <div className="absolute right-2.5 bottom-20 flex flex-col items-center gap-4 text-white pointer-events-none">
            <HeartIcon size={22} />
            <CommentIcon size={21} />
            <SendIcon size={20} />
          </div>
        </>
      )}

      <div
        className={`absolute left-3 bottom-3.5 [text-shadow:0_1px_6px_rgba(0,0,0,0.7)] ${
          isStory ? 'right-3' : 'right-12'
        }`}
      >
        {!isStory && (
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold mb-1">
            <BrandAvatar name={brandName} size={22} /> {igHandle(brandName)}
          </p>
        )}
        {spec.primaryText && (
          <p className="text-[12px] leading-[1.4] whitespace-pre-line line-clamp-4">
            {spec.primaryText}
            <Hashtags tags={spec.hashtags} className="text-white/80" />
          </p>
        )}
        {spec.isPaid && spec.cta ? (
          <p className="mt-2 rounded-md bg-white/90 text-[#111] text-center text-[12.5px] font-semibold py-1.5">
            {spec.cta}
          </p>
        ) : (
          isStory && (
            /* Organic story: the reply bar, not a CTA. */
            <div className="mt-2 flex items-center gap-2.5">
              <span className="flex-1 rounded-full border border-white/50 px-3 py-1.5 text-[12px] text-white/70">
                Send message
              </span>
              <HeartIcon size={20} />
              <SendIcon size={19} />
            </div>
          )
        )}
      </div>
    </div>
  )
}

/* ---------------------------------- Document / PDF post ---------------------------------- */

/** LinkedIn-style document post (document ads / PDF carousels / lead magnets). */
export const DocumentPreview = ({ spec, brandName, ...media }: PreviewProps) => {
  const pages = Math.max(spec.visuals.length, spec.media.length, 1)
  return (
    <div className="w-full max-w-[400px] rounded-xl overflow-hidden bg-white text-[#191919] border border-[#E8E8E8] shadow-sm dark:bg-[#1B1F23] dark:text-[#E9E9EA] dark:border-transparent">
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <BrandAvatar name={brandName} size={38} />
        <div className="leading-tight">
          <p className="text-[14px] font-semibold">{brandName || 'Your Company'}</p>
          <p className="text-[12px] text-[#666666] dark:text-[#B0B3B8]">
            {spec.isPaid ? 'Promoted' : 'Just now'}
          </p>
        </div>
      </div>

      {spec.primaryText && (
        <p className="px-3.5 py-2.5 text-[13.5px] leading-[1.45] whitespace-pre-line">
          {spec.primaryText}
          <Hashtags tags={spec.hashtags} className="text-[#0A66C2] dark:text-[#70B5F9]" />
        </p>
      )}

      <div className="relative">
        <MediaSlot
          visuals={spec.visuals}
          media={spec.media}
          aspect="aspect-[4/3]"
          className="bg-[#F3F2EF] text-[#666666] dark:bg-[#111417] dark:text-[#B0B3B8]"
          {...media}
        />
        <span className="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] px-1.5 py-0.5 pointer-events-none">
          1 / {pages}
        </span>
      </div>

      <div className="px-3.5 py-2.5 border-t border-[#E8E8E8] dark:border-[#2C3237] flex items-center justify-between gap-3">
        <div className="min-w-0 leading-tight">
          <p className="text-[13px] font-semibold truncate">{spec.headline ?? 'Document'}</p>
          <p className="text-[11px] text-[#666666] dark:text-[#B0B3B8]">
            {pages}-page document · PDF
          </p>
        </div>
        {spec.isPaid && spec.cta && (
          <span className="shrink-0 rounded-full border border-[#0A66C2] text-[#0A66C2] dark:border-[#70B5F9] dark:text-[#70B5F9] px-3 py-1 text-[13px] font-semibold">
            {spec.cta}
          </span>
        )}
      </div>

      <div className="mx-3.5 flex justify-around border-t border-[#E8E8E8] dark:border-[#2C3237] py-1.5 text-[12.5px] font-medium text-[#666666] dark:text-[#B0B3B8]">
        <span className="flex items-center gap-1.5">
          <ThumbsUpIcon size={15} /> Like
        </span>
        <span className="flex items-center gap-1.5">
          <CommentIcon size={15} /> Comment
        </span>
        <span className="flex items-center gap-1.5">
          <ShareIcon size={15} /> Repost
        </span>
        <span className="flex items-center gap-1.5">
          <SendIcon size={15} /> Send
        </span>
      </div>
    </div>
  )
}

/* ---------------------------------- Post series ---------------------------------- */

/** A series of connected posts: the lead post on a stacked deck + series count. */
export const PostSeriesPreview = ({ spec, brandName, ...media }: PreviewProps) => {
  const count = Math.max(spec.visuals.length, spec.media.length, 3)
  const Card = spec.platform === 'instagram' ? InstagramPreview : FacebookPreview
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-fit max-w-full">
        <div
          aria-hidden="true"
          className="absolute inset-x-4 -bottom-2.5 h-16 rounded-xl bg-white/70 border border-[#E4E6EB] dark:bg-[#242526]/70 dark:border-[#3E4042]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-2 -bottom-1.5 h-16 rounded-xl bg-white border border-[#E4E6EB] dark:bg-[#242526] dark:border-[#3E4042]"
        />
        <div className="relative">
          <Card spec={spec} brandName={brandName} {...media} />
        </div>
      </div>
      <p className="mt-4 text-[10.5px] uppercase tracking-[0.12em] text-quaternary">
        Post series · {count} posts
      </p>
    </div>
  )
}

/* ---------------------------------- Google search ad ---------------------------------- */

export const GoogleSearchPreview = ({ spec, brandName }: PreviewProps) => (
  <div
    className="w-full max-w-[400px] rounded-xl border bg-white border-[#DADCE0] text-[#202124] px-4 py-3.5 dark:bg-[#202124] dark:border-[#3C4043] dark:text-[#E8EAED]"
    style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
  >
    <p className="text-[12px] font-bold mb-1.5">Sponsored</p>
    <div className="flex items-center gap-2">
      <div className="w-[26px] h-[26px] rounded-full bg-[#E8F0FE] dark:bg-[#3C4043] flex items-center justify-center text-[11px] font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
        {(brandName?.trim()[0] ?? 'M').toUpperCase()}
      </div>
      <div className="leading-tight">
        <p className="text-[13px]">{brandName || 'Your Business'}</p>
        <p className="text-[12px] text-[#4D5156] dark:text-[#BDC1C6]">
          {displayDomain(spec.linkUrl)}
        </p>
      </div>
    </div>
    <h4 className="mt-2 mb-1 text-[17px] leading-[1.3] font-normal text-[#1A0DAB] dark:text-[#8AB4F8]">
      {spec.headline ?? spec.primaryText.split('\n')[0]}
    </h4>
    <p className="text-[13px] leading-[1.5] text-[#4D5156] dark:text-[#BDC1C6] whitespace-pre-line">
      {spec.description ?? spec.primaryText}
    </p>
  </div>
)
