import { AlertTriangle } from '../../../components/icon/alert-triangle'
import { CheckCircle } from '../../../components/icon/check-circle'
import { Clock } from '../../../components/icon/clock'
import { Link01 } from '../../../components/icon/link-01'
import { TrendUp01 } from '../../../components/icon/trend-up-01'
import { XClose } from '../../../components/icon/x-close'
import type { BriefCard } from '../types'

interface DoThisNextProps {
  cards: BriefCard[]
  stamp: string
  onCta: (card: BriefCard) => void
  onDismiss?: (card: BriefCard) => void
  busyCardId?: string | null
}

/**
 * "Do this next" — one to three cards, each with a single button. Blockers (a dead
 * connection, a failed post) get a red ring and can't be hidden; a card that's been acted on
 * gets a green ring and its button becomes a way to the result.
 */
export const DoThisNext = ({ cards, stamp, onCta, onDismiss, busyCardId }: DoThisNextProps) => {
  if (cards.length === 0) return null
  return (
    <section className="w-full flex flex-col gap-2.5" aria-label="Do this next">
      <div className="flex items-center justify-between">
        <span className="mia-mono text-primary">Do this next</span>
        <span className="mia-mono text-[0.625rem] font-normal text-placeholder">{stamp}</span>
      </div>
      {cards.map((card) => {
        const done = card.state === 'scheduled' || card.state === 'done'
        const blocker = card.severity === 'blocker'
        const ring = blocker
          ? 'ring-1 ring-inset ring-utility-error-400'
          : done
            ? 'ring-1 ring-inset ring-utility-success-400'
            : ''
        const win = card.kind === 'make_another' || card.kind === 'post_published'
        const quiet = card.kind === 'quiet'
        const Icon = blocker
          ? AlertTriangle
          : done
            ? CheckCircle
            : quiet
              ? Clock
              : win
                ? TrendUp01
                : Link01
        const iconTone = blocker
          ? 'text-utility-error-500 bg-utility-error-100'
          : done || win
            ? 'text-utility-success-600 bg-utility-success-100'
            : quiet
              ? 'text-utility-warning-600 bg-utility-warning-100'
              : 'text-secondary bg-tertiary'
        const primary = card.primary && !done && !blocker
        return (
          <div
            key={card.id}
            // Wraps rather than squeezes. With the phone's text size turned up the button kept
            // its full width and the title was left a one-word-wide column (15 Oct 2026); the
            // rem floor on the text means bigger text drops the button onto its own line.
            className={`group relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-secondary p-3 ${ring}`}
          >
            <div className="flex flex-1 basis-[12rem] items-start gap-3 min-w-0">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconTone}`}
              >
                <Icon size={15} />
              </span>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="paragraph-sm text-primary break-words">{card.title}</span>
                <span className="paragraph-xs text-quaternary break-words">{card.sub}</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onCta(card)}
                disabled={busyCardId === card.id}
                className={
                  primary
                    ? 'rounded-md bg-brand-solid px-3 py-1.5 paragraph-xs font-semibold text-primary-onbrand hover:bg-brand-solid-hover disabled:opacity-60'
                    : 'rounded-md border border-primary px-2.5 py-1.5 paragraph-xs text-primary hover:bg-tertiary disabled:opacity-60'
                }
              >
                {card.cta.label}
              </button>
              {card.dismissible && onDismiss && !done && (
                <button
                  type="button"
                  aria-label="Hide this for a week"
                  title="Hide this for a week"
                  onClick={() => onDismiss(card)}
                  // Hover-only reveal left it invisible on a phone, where nothing hovers.
                  className="rounded-full p-1 text-quaternary transition-opacity hover:bg-tertiary hover:text-secondary [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <XClose size={14} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
