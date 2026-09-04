import { Badge } from './badges'
import { CollapsibleRow } from './collapsible-row'
import { InlineMd } from './inline-md'
import type { GoldDeliverable, GoldInsight, GoldRecommendation } from './types'

// Compact disclosure rows for the three long-form sections. Each closed row
// carries the finding and its key number; the prose lives inside.

/** The stat worth showing on a closed row — the first callout figure. */
const leadStat = (insight: GoldInsight): string | null => {
  const first = insight.stat_callout?.stats?.[0]
  return first ? first.value : null
}

const Rank = ({ rank }: { rank: number | null }) =>
  rank == null ? (
    <span className="shrink-0 w-5 text-center" style={{ color: 'var(--gr-muted)' }}>
      ·
    </span>
  ) : (
    <span
      className="shrink-0 w-5 h-5 rounded-md grid place-items-center text-[10.5px] font-bold"
      style={{
        fontFamily: 'var(--gr-mono)',
        color: 'var(--gr-purple-text)',
        backgroundColor: 'var(--gr-purple-tint)',
      }}
    >
      {rank}
    </span>
  )

export const InsightRows = ({
  insights,
  forceOpen,
}: {
  insights: GoldInsight[]
  forceOpen?: boolean
}) => (
  <div className="gr-card overflow-hidden">
    {insights.map((insight, i) => (
      <CollapsibleRow
        key={i}
        lead={<Rank rank={insight.driver_rank} />}
        title={insight.title}
        stat={leadStat(insight)}
        forceOpen={forceOpen}
      >
        <div className="space-y-2.5">
          <Badge label={insight.category} />
          <p className="text-[13.5px] leading-5" style={{ color: 'var(--gr-body)' }}>
            <InlineMd text={insight.body} />
          </p>
          {insight.aside && (
            <p className="text-xs leading-[18px] italic" style={{ color: 'var(--gr-muted)' }}>
              {insight.aside}
            </p>
          )}
          {insight.stat_callout && (
            <div className="gr-inner rounded-[10px] p-3">
              <p
                className="text-[10.5px] font-bold tracking-[0.06em] uppercase mb-1.5"
                style={{ color: 'var(--gr-muted)' }}
              >
                {insight.stat_callout.label}
              </p>
              {insight.stat_callout.stats.map((s, j) => (
                <p key={j} style={{ fontFamily: 'var(--gr-mono)' }}>
                  <span
                    className="text-[17px] leading-6 font-bold"
                    style={{ color: 'var(--gr-green)' }}
                  >
                    {s.value}
                  </span>
                  {s.comparison && (
                    <span className="text-xs" style={{ color: 'var(--gr-muted)' }}>
                      {' '}
                      vs {s.comparison}
                    </span>
                  )}
                </p>
              ))}
            </div>
          )}
          {insight.kpis.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {insight.kpis.map((kpi) => (
                <span key={kpi} className="gr-inner gr-chip uppercase">
                  {kpi}
                </span>
              ))}
            </div>
          )}
        </div>
      </CollapsibleRow>
    ))}
  </div>
)

export const RecommendationRows = ({
  recommendations,
  forceOpen,
}: {
  recommendations: GoldRecommendation[]
  forceOpen?: boolean
}) => (
  <div className="gr-card overflow-hidden">
    {recommendations.map((rec) => (
      <CollapsibleRow
        key={rec.id}
        lead={<Badge label={rec.tag} />}
        title={rec.title}
        forceOpen={forceOpen}
      >
        <div className="space-y-2.5">
          <p className="text-[13.5px] leading-5" style={{ color: 'var(--gr-body)' }}>
            <InlineMd text={rec.body} />
          </p>
          {rec.prediction && (
            <div className="gr-predict py-2.5 px-3">
              <p
                className="text-[10.5px] font-bold tracking-[0.06em] uppercase mb-0.5"
                style={{ color: 'var(--gr-green)' }}
              >
                Predicted
              </p>
              <p className="text-[13px] leading-[19px]" style={{ color: 'var(--gr-body)' }}>
                <InlineMd text={rec.prediction} />
              </p>
            </div>
          )}
        </div>
      </CollapsibleRow>
    ))}
  </div>
)

const ImpactArrow = ({ direction }: { direction: 'up' | 'down' }) => (
  <svg
    viewBox="0 0 12 12"
    fill="none"
    className="w-3 h-3 shrink-0 mt-1"
    style={{ color: 'var(--gr-green)' }}
    aria-label={direction === 'up' ? 'increase' : 'decrease'}
  >
    <path
      d={direction === 'up' ? 'M6 10V2M6 2L2.5 5.5M6 2L9.5 5.5' : 'M6 2v8M6 10L2.5 6.5M6 10l3.5-3.5'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const DeliverableRows = ({
  deliverables,
  forceOpen,
}: {
  deliverables: GoldDeliverable[]
  forceOpen?: boolean
}) => (
  <div className="gr-card overflow-hidden">
    {deliverables.map((d, i) => (
      <CollapsibleRow
        key={i}
        lead={
          <span
            className="shrink-0 w-5 h-5 rounded-md grid place-items-center text-[10.5px] font-bold"
            style={{
              fontFamily: 'var(--gr-mono)',
              color: 'var(--gr-purple-text)',
              backgroundColor: 'var(--gr-purple-tint)',
            }}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
        }
        title={d.name}
        subtitle={d.objective}
        forceOpen={forceOpen}
      >
        <div className="space-y-3">
          <p className="text-[14px] leading-5 font-semibold" style={{ color: 'var(--gr-heading)' }}>
            <InlineMd text={d.title} />
          </p>

          {d.creative_direction.length > 0 && (
            <div>
              <p className="gr-eyebrow mb-1.5">Creative direction</p>
              <ul className="space-y-1.5">
                {d.creative_direction.map((point, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span
                      className="shrink-0 w-1 h-1 mt-2 rounded-full"
                      style={{ backgroundColor: 'var(--gr-muted)' }}
                    />
                    <span className="text-[13.3px] leading-5" style={{ color: 'var(--gr-body)' }}>
                      <InlineMd text={point} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {d.strategy && (
            <div>
              <p className="gr-eyebrow mb-1.5">How to run it</p>
              <p className="text-[13.3px] leading-5" style={{ color: 'var(--gr-body)' }}>
                <InlineMd text={d.strategy} />
              </p>
            </div>
          )}

          {d.grounded_in && d.grounded_in.basis !== 'unknown' && (
            <div>
              <p className="gr-eyebrow mb-1.5">Grounded in</p>
              {d.grounded_in.basis === 'campaign_copy' ? (
                <div className="gr-inner rounded-[10px] p-3 space-y-1.5">
                  {d.grounded_in.evidence && (
                    <p
                      className="text-[13px] leading-[19px] italic"
                      style={{ color: 'var(--gr-heading)' }}
                    >
                      {d.grounded_in.evidence}
                    </p>
                  )}
                  {d.grounded_in.note && (
                    <p className="text-[12.5px] leading-[18px]" style={{ color: 'var(--gr-body)' }}>
                      <InlineMd text={d.grounded_in.note} />
                    </p>
                  )}
                  <p className="text-[10.5px] tracking-[0.04em] uppercase" style={{ color: 'var(--gr-green)' }}>
                    Your own ad copy
                  </p>
                </div>
              ) : (
                // Honesty marker: no copy or assets were retrieved, so this deliverable
                // rests on category practice. It must not look as evidence-backed as
                // one built on the client's real winning ad.
                <div
                  className="rounded-[10px] p-3 border space-y-1"
                  style={{
                    borderColor: 'rgb(240 166 62 / 0.45)',
                    background: 'rgb(240 166 62 / 0.08)',
                  }}
                >
                  <p className="text-[10.5px] tracking-[0.04em] uppercase font-bold" style={{ color: '#f0a63e' }}>
                    Category best practice — not your campaign copy
                  </p>
                  {d.grounded_in.note && (
                    <p className="text-[12.5px] leading-[18px]" style={{ color: 'var(--gr-body)' }}>
                      <InlineMd text={d.grounded_in.note} />
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {d.expected_impact.length > 0 && (
            <div>
              <p className="gr-eyebrow mb-1.5">Expected impact</p>
              <div className="space-y-1.5">
                {d.expected_impact.map((impact, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <ImpactArrow direction={impact.direction} />
                    <p className="text-[13px] leading-[19px]" style={{ color: 'var(--gr-body)' }}>
                      <span className="font-semibold" style={{ color: 'var(--gr-heading)' }}>
                        {impact.kpi}
                      </span>{' '}
                      <InlineMd text={impact.explanation} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleRow>
    ))}
  </div>
)
