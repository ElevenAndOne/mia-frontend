import { ChevronRight } from '../../../components/icon/chevron-right'
import { Edit03 } from '../../../components/icon/edit-03'
import type { BestPost } from '../types'

interface BestPostCanvasProps {
  post: BestPost
  windowLabel: string
  brandName?: string
  onClose: () => void
  onMakeAnother?: () => void
  /** Phone sheet: no Close chevron (the sheet has its own), tighter padding. */
  compact?: boolean
}

const PLATFORM: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram' }

function formatWhen(post: BestPost): string {
  if (!post.published_at) return ''
  const d = new Date(post.published_at)
  const day = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
  return post.time ? `${day}, ${post.time}` : day
}

/**
 * The canvas at rest: the workspace's best recent post on "paper" (the inverse of the shell
 * theme, with a faded dot grid), a Top Performer stamp, one line saying by how much it beat
 * the usual, the post itself, and three plain tiles explaining why. The one action is
 * "Make another like it".
 */
export const BestPostCanvas = ({
  post,
  windowLabel,
  brandName,
  onClose,
  onMakeAnother,
  compact,
}: BestPostCanvasProps) => {
  const platform = PLATFORM[post.platform] ?? post.platform
  const lift = post.lift >= 2 ? `${Math.round(post.lift)}×` : `${post.lift.toFixed(1)}×`
  return (
    <section
      className={`relative h-full w-full overflow-y-auto overflow-x-hidden bg-paper-bg text-paper-ink paper-dots mia-sans ${compact ? 'px-4 pb-8 pt-12' : 'pl-16 pr-10 pb-10 pt-16'}`}
      aria-label="Your best post"
    >
      {/* Decorative stickers from the Figma design (paper only, desktop only). */}
      {!compact && (
        <>
          <img
            src="/images/stickers/dotted-circle.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute -top-0.5 right-[3.75rem] w-[10.625rem] opacity-90 select-none"
          />
          <img
            src="/images/stickers/hand-pointing.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute -right-2 top-[28.125rem] w-[8.75rem] select-none"
          />
          <img
            src="/images/stickers/squiggle-pencil.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute -bottom-3.5 right-3.5 w-[11.25rem] select-none"
          />
        </>
      )}
      {!compact && (
        <button
          type="button"
          onClick={onClose}
          className="absolute left-9 top-5 inline-flex items-center gap-1.5 mia-mono text-paper-ink hover:opacity-70"
        >
          <span>Close</span>
          <ChevronRight size={11} />
        </button>
      )}
      {onMakeAnother && (
        <button
          type="button"
          onClick={onMakeAnother}
          className="absolute right-5 top-3.5 inline-flex items-center gap-2 rounded-md border border-paper-cta-border bg-paper-cta-bg px-3 py-2 paragraph-xs font-semibold text-paper-cta-ink hover:opacity-80"
        >
          <Edit03 size={14} />
          <span>Make another like it</span>
        </button>
      )}

      <div className={`flex flex-col gap-3.5 ${compact ? 'max-w-full' : 'max-w-[26.875rem]'}`}>
        {/* stamp — the Figma sticker. The wrapper owns the rotation and the shine so the
            highlight can be masked to the sticker's own shape (see .mia-sticker). */}
        <span
          className="mia-sticker -ml-1 w-[9.125rem] select-none"
          style={
            {
              '--mia-sticker-src': "url('/images/stickers/sticker-top-performer.png')",
            } as React.CSSProperties
          }
        >
          <img
            src="/images/stickers/sticker-top-performer.png"
            alt="Top performer"
            draggable={false}
          />
        </span>

        <p className="mia-mono font-normal text-paper-ink">
          This post outperformed your usual by{' '}
          <mark className="rounded-sm bg-[#F4C247] px-1 font-bold text-[#040B1D]">{lift}</mark>
        </p>

        <article className="w-full overflow-hidden rounded border border-paper-tile-border bg-paper-tile">
          {post.image_url ? (
            <img
              src={post.image_url}
              alt=""
              className="block w-full max-h-[26.25rem] object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-56 w-full items-end bg-gradient-to-br from-utility-success-600 to-utility-success-200 p-3">
              <span className="mia-mono text-[0.5625rem] font-normal text-white/80">
                {brandName ?? platform} post
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1.5 px-3.5 py-3">
            <p className="paragraph-sm text-paper-ink leading-relaxed">{post.text}</p>
            <p className="paragraph-xs text-paper-sub">
              {platform} · {formatWhen(post)}
              {post.permalink && (
                <>
                  {' · '}
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:opacity-70"
                  >
                    open
                  </a>
                </>
              )}
            </p>
          </div>
        </article>

        {post.tiles.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {post.tiles.map((t) => (
              <div
                key={t.head}
                className="flex flex-col gap-1.5 rounded border border-paper-tile-border bg-paper-tile p-2.5"
              >
                <span className="mia-mono text-paper-ink">{t.head}</span>
                <span className="text-[0.625rem] leading-snug text-paper-sub">{t.body}</span>
              </div>
            ))}
          </div>
        )}

        <p className="paragraph-xs text-paper-sub">
          Compared against your other {post.compared_against} {platform} posts from {windowLabel}.
        </p>
      </div>
    </section>
  )
}
