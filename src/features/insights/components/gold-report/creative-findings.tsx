import type { GoldCreativeFinding } from './types'

// Measured comparisons between the client's own ads, straight from the pipeline
// payload — no model, no LLM rewording. Two rules from the data team: always show
// the ad counts (they are why a finding is credible), and never phrase a finding
// causally ("ads using X ran at higher CTR", not "X increases CTR").

const RATE_METRICS = new Set(['ctr', 'cvr', 'conversion_rate', 'engagement_rate'])
const MONEY_METRICS = new Set(['cpc', 'cpm', 'cpa', 'cpl', 'roas'])

const metricLabel = (m: string) => m.replace(/_/g, ' ').toUpperCase()

const formatValue = (metric: string, v: number): string => {
  const key = metric.toLowerCase()
  if (RATE_METRICS.has(key)) return `${(v * 100).toFixed(2)}%`
  if (MONEY_METRICS.has(key)) return v.toFixed(2)
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString()
  return v.toFixed(v % 1 === 0 ? 0 : 2)
}

const formatGap = (gap: number): string => {
  const pct = Math.round(gap * 100)
  return `${pct > 0 ? '+' : ''}${pct}%`
}

// "better" already accounts for metric_direction on the pipeline side; the sign of
// relative_gap alone would colour a lower CPC as bad. Use the verdict, not the sign.
const isWin = (f: GoldCreativeFinding) => f.direction === 'better'

export const CreativeFindings = ({ findings }: { findings: GoldCreativeFinding[] }) => {
  const shown = findings.filter((f) => f.evidence_basis !== 'model')
  if (shown.length === 0) return null
  return (
    <div className="gr-card overflow-hidden">
      {shown.map((f, i) => {
        const win = isWin(f)
        return (
          <div
            key={i}
            className={`px-4 sm:px-5 py-3.5 ${i > 0 ? 'border-t' : ''}`}
            style={{ borderColor: 'var(--gr-line)' }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-[13.5px] leading-5" style={{ color: 'var(--gr-heading)' }}>
                Ads that <span className="font-semibold">{f.attribute}</span> ran at{' '}
                {win ? 'a better' : 'a worse'} {metricLabel(f.metric)}
              </p>
              <p
                className="text-[15px] font-bold tabular-nums"
                style={{
                  fontFamily: 'var(--gr-mono)',
                  color: win ? 'var(--gr-green)' : 'var(--gr-muted)',
                }}
              >
                {formatGap(f.relative_gap)}
              </p>
            </div>
            <p
              className="mt-1 text-[12px] leading-[18px] tabular-nums"
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
        className="px-4 sm:px-5 py-2.5 text-[11.5px] leading-[17px] border-t"
        style={{ borderColor: 'var(--gr-line)', color: 'var(--gr-muted)' }}
      >
        Observed differences between your own ads, not causes — ads differ in several ways at
        once. Small ad counts deserve less weight.
      </p>
    </div>
  )
}
