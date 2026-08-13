import { Badge, RankBadge } from './badges'
import { InlineMd } from './inline-md'
import type { GoldInsight } from './types'

const StatCallout = ({ callout }: { callout: NonNullable<GoldInsight['stat_callout']> }) => (
  <div className="gr-inner rounded-[10px] p-3">
    <p className="text-[10.5px] font-bold tracking-[0.06em] uppercase mb-2" style={{ color: 'var(--gr-muted)' }}>
      {callout.label}
    </p>
    <div className="space-y-1.5">
      {callout.stats.map((stat, i) => (
        <p key={i} style={{ fontFamily: 'var(--gr-mono)' }}>
          <span className="text-[19px] leading-[25px] font-bold" style={{ color: 'var(--gr-green)' }}>
            {stat.value}
          </span>
          {stat.comparison && (
            <span className="text-xs" style={{ color: 'var(--gr-muted)' }}>
              {' '}
              vs {stat.comparison}
            </span>
          )}
        </p>
      ))}
    </div>
  </div>
)

export const InsightRow = ({ insight }: { insight: GoldInsight }) => (
  <div className="grid grid-cols-1 lg:grid-cols-[11rem_1fr_13rem] gap-x-[22px] gap-y-3 py-5 px-5 sm:px-6">
    <div className="flex lg:flex-col flex-wrap items-start gap-2">
      <Badge label={insight.category} />
      {/* Only ranked drivers get a rank badge — exceptions and caveats aren't ranked. */}
      {insight.driver_rank != null && <RankBadge rank={insight.driver_rank} />}
    </div>

    <div>
      <h3
        className="text-[14.5px] leading-[22px] font-bold mb-1.5"
        style={{ color: 'var(--gr-heading)' }}
      >
        {insight.title}
      </h3>
      <p className="text-[13.5px] leading-5" style={{ color: 'var(--gr-body)' }}>
        <InlineMd text={insight.body} />
      </p>
      {insight.kpis.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {insight.kpis.map((kpi) => (
            <span key={kpi} className="gr-inner gr-chip uppercase">
              {kpi}
            </span>
          ))}
        </div>
      )}
    </div>

    <div className="min-w-0">
      {insight.stat_callout ? (
        <StatCallout callout={insight.stat_callout} />
      ) : insight.aside ? (
        <p className="text-xs leading-[18px]" style={{ color: 'var(--gr-muted)' }}>
          {insight.aside}
        </p>
      ) : null}
    </div>
  </div>
)
