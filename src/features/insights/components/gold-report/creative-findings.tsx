import { count, isMoneyMetric, isRateMetric, metricName, pct } from './format'
import type { GoldCreativeFinding } from './types'

// Measured comparisons between the client's own ads, straight from the pipeline
// payload — no model, no LLM rewording. Two rules from the data team: always show
// the ad counts (they are why a finding is credible), and never phrase a finding
// causally ("ads using X ran at higher CTR", not "X increases CTR").

// Rates arrive as fractions — `link_ctr` 0.0444 is 4.44%, which once printed as "0.04".
const formatValue = (metric: string, v: number): string => {
  if (isRateMetric(metric)) return pct(v)
  if (isMoneyMetric(metric) || metric.toLowerCase() === 'roas') return v.toFixed(2)
  if (Math.abs(v) >= 1000) return count(v)
  return v.toFixed(v % 1 === 0 ? 0 : 2)
}

const formatGap = (gap: number): string => {
  const pct = Math.round(gap * 100)
  return `${pct > 0 ? '+' : ''}${pct}%`
}

// "better" already accounts for metric_direction on the pipeline side; the sign of
// relative_gap alone would colour a lower CPC as bad. Use the verdict, not the sign.
const isWin = (f: GoldCreativeFinding) => f.direction === 'better'

const rowClass = (i: number) => `px-4 sm:px-5 py-3.5 ${i > 0 ? 'border-t' : ''}`

// One ad against the ads it ran alongside. `without_value` is the peers' MEDIAN and the
// impressions are counted separately — adding the peers' to the standout's is how the
// page once claimed 1,604,464 impressions for a 154,175-impression ad.
const StandoutRow = ({ f, i }: { f: GoldCreativeFinding; i: number }) => (
  <div className={rowClass(i)} style={{ borderColor: 'var(--gr-line)' }}>
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="text-[0.8438rem] leading-5 min-w-0 break-words" style={{ color: 'var(--gr-heading)' }}>
        <span className="font-semibold">{f.ad_name || 'One ad'}</span> stood out on{' '}
        {metricName(f.metric)}
      </p>
      <p
        className="text-[0.9375rem] font-bold tabular-nums"
        style={{ fontFamily: 'var(--gr-mono)', color: 'var(--gr-green)' }}
      >
        {formatValue(f.metric, f.with_value)}
      </p>
    </div>
    <p
      className="mt-1 text-[0.75rem] leading-[1.125rem] tabular-nums"
      style={{ color: 'var(--gr-muted)', fontFamily: 'var(--gr-mono)' }}
    >
      vs a median {formatValue(f.metric, f.without_value)} across {f.without_ads} other ad
      {f.without_ads === 1 ? '' : 's'}
      {typeof f.best_peer_value === 'number' && (
        <> · best of them {formatValue(f.metric, f.best_peer_value)}</>
      )}{' '}
      · {count(f.with_impressions)} impressions
    </p>
  </div>
)

export const CreativeFindings = ({ findings }: { findings: GoldCreativeFinding[] }) => {
  const shown = findings.filter((f) => f.evidence_basis !== 'model')
  if (shown.length === 0) return null
  return (
    <div className="gr-card overflow-hidden">
      {shown.map((f, i) => {
        if (f.kind === 'standout_creative') return <StandoutRow key={i} f={f} i={i} />
        const win = isWin(f)
        return (
          <div key={i} className={rowClass(i)} style={{ borderColor: 'var(--gr-line)' }}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-[0.8438rem] leading-5" style={{ color: 'var(--gr-heading)' }}>
                Ads that <span className="font-semibold">{f.attribute}</span> ran at{' '}
                {win ? 'a better' : 'a worse'} {metricName(f.metric).toUpperCase()}
              </p>
              <p
                className="text-[0.9375rem] font-bold tabular-nums"
                style={{
                  fontFamily: 'var(--gr-mono)',
                  color: win ? 'var(--gr-green)' : 'var(--gr-muted)',
                }}
              >
                {formatGap(f.relative_gap)}
              </p>
            </div>
            <p
              className="mt-1 text-[0.75rem] leading-[1.125rem] tabular-nums"
              style={{ color: 'var(--gr-muted)', fontFamily: 'var(--gr-mono)' }}
            >
              {formatValue(f.metric, f.with_value)} across {f.with_ads} ad
              {f.with_ads === 1 ? '' : 's'} vs {formatValue(f.metric, f.without_value)} across{' '}
              {f.without_ads} ad{f.without_ads === 1 ? '' : 's'} ·{' '}
              {Math.round(f.with_impressions + f.without_impressions).toLocaleString()} impressions
            </p>
          </div>
        )
      })}
      <p
        className="px-4 sm:px-5 py-2.5 text-[0.7188rem] leading-[1.0625rem] border-t"
        style={{ borderColor: 'var(--gr-line)', color: 'var(--gr-muted)' }}
      >
        Observed differences between your own ads, not causes — ads differ in several ways at once.
        Small ad counts deserve less weight.
      </p>
    </div>
  )
}
