import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useBuild } from './use-build'
import { chatCards, type Pending } from './pending'

/** Mia's waiting changes, each with Apply / Not now. The campaign page's chat and the home chat (with a builder
 *  campaign picked in the KPI table, 27 Nov) show the same cards. */
export function PendingCardList({
  pending,
  busy,
  cardError,
  onApply,
  onDrop,
  onPress,
  campaignName,
}: {
  pending: Pending[]
  busy: string | null
  cardError: (id: string) => string | null
  onApply?: (id: string) => unknown
  onDrop?: (id: string) => unknown
  onPress?: () => void
  // said on each card in the home chat, where the campaign isn't on screen
  campaignName?: string
}) {
  return (
    <>
      {pending.map((p) => (
        <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-brand bg-brand-primary px-3 py-2">
          <p className="label-xs text-brand-secondary">
            Mia proposes{campaignName ? ` · ${campaignName}` : ''}
            {p.about ? ` · for ${p.about}` : ''}
          </p>
          <ul className="flex flex-col gap-1 paragraph-sm text-primary">
            {p.summary.map((line, k) => (
              <li key={k} className="[overflow-wrap:anywhere]">{line}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!busy}
              className="rounded-lg bg-brand-solid px-3 py-1.5 paragraph-sm text-primary-onbrand disabled:opacity-50"
              onClick={() => {
                onPress?.()
                void onApply?.(p.id)
              }}
            >
              Apply
            </button>
            <button
              type="button"
              disabled={!!busy}
              className="rounded-lg border border-secondary px-3 py-1.5 paragraph-sm text-primary disabled:opacity-50"
              onClick={() => {
                onPress?.()
                void onDrop?.(p.id)
              }}
            >
              Not now
            </button>
          </div>
          {cardError(p.id) ? (
            <p role="alert" className="rounded-lg border border-error bg-error-primary px-3 py-2 paragraph-sm text-error">
              {cardError(p.id)}
            </p>
          ) : null}
        </div>
      ))}
    </>
  )
}

/** The home chat with a builder campaign picked: that campaign's waiting cards under the replies, read again after
 *  each reply (the reply may have made one), and a link to its page. Nothing shows while nothing waits. */
export function HomeCampaignCards({
  campaignId,
  campaignName,
  replies,
}: {
  campaignId: string
  campaignName: string
  // the chat's message count: a new reply reads the cards again
  replies: number
}) {
  const build = useBuild(campaignId, { kpis: false })
  const { refetch } = build
  useEffect(() => {
    if (replies > 0) void refetch()
  }, [replies, refetch])

  const cards = chatCards(build.state?.pending ?? [])
  const cardError = (id: string) =>
    build.error && (build.errorAt === `apply:${id}` || build.errorAt === `drop:${id}`) ? build.error : null
  // a card refused and gone from the list still says why
  const orphanError =
    build.error && /^(apply|drop):/.test(build.errorAt ?? '') && !cards.some((p) => build.errorAt?.endsWith(`:${p.id}`))
      ? build.error
      : null
  if (!cards.length && !orphanError) return null
  return (
    <div className="mb-6 flex flex-col gap-3">
      <PendingCardList
        pending={cards}
        busy={build.busy}
        cardError={cardError}
        onApply={build.applyChange}
        onDrop={build.dropChange}
        campaignName={campaignName}
      />
      {orphanError ? (
        <p role="alert" className="rounded-lg border border-error bg-error-primary px-3 py-2 paragraph-sm text-error">
          {orphanError}
        </p>
      ) : null}
      <Link to={`/campaign-builder/${campaignId}`} className="paragraph-xs text-tertiary underline">
        Open {campaignName}
      </Link>
    </div>
  )
}
