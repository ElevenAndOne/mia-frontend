import type { GoldStructuredRecommendation } from './types'

// The pipeline's typed drivers, rendered from the numbers rather than from prose.
// Three rules come straight from the data team and are the reason this component
// exists at all:
//   1. `beats_portfolio_average` decides good/bad — never the sign of `magnitude`.
//      A CPC that is 55% BELOW average is a win, and reading the sign inverts it.
//   2. `magnitude_kind` says what the number means. A percentage against an average
//      and a share of model importance are different units, so they are split into
//      separate groups and never compared on one scale.
//   3. `confidence: null` is deliberate on a measured row — an observed fact has no
//      honest confidence score. Render it as absent, never as zero.

const MEASURED_KIND = 'pct_vs_portfolio_average'
const IMPORTANCE_KIND = 'share_of_model_importance_pct'

const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`

// A driver string can be a long campaign name with a URL in it.
const DriverName = ({ name }: { name: string }) => (
  <span className="text-[13.3px] leading-5 break-words" style={{ color: 'var(--gr-heading)' }}>
    {name}
  </span>
)

const EvidenceNote = ({ row }: { row: GoldStructuredRecommendation }) => {
  const bits: string[] = []
  if (row.evidence_basis === 'measured') bits.push('measured')
  else if (row.evidence_basis === 'model') {
    bits.push(row.model_evidence && row.model_evidence !== 'unknown'
      ? `model, ${row.model_evidence} evidence`
      : 'model estimate')
  }
  // Absent confidence is intentional on measured rows — say nothing rather than 0.
  if (typeof row.confidence === 'number') bits.push(`confidence ${Math.round(row.confidence * 100)}%`)
  if (row.applies_to_platform) bits.push(`${row.applies_to_platform} only`)
  else if (row.platform_scoped) bits.push('one platform only')
  if (bits.length === 0) return null
  return (
    <p className="text-[11px] leading-4 mt-0.5" style={{ color: 'var(--gr-muted)' }}>
      {bits.join(' · ')}
    </p>
  )
}

const Row = ({
  row,
  showVerdict,
}: {
  row: GoldStructuredRecommendation
  showVerdict: boolean
}) => {
  const wins = row.beats_portfolio_average === true
  return (
    <div className="px-4 sm:px-5 py-3 border-t" style={{ borderColor: 'var(--gr-line)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <DriverName name={row.driver} />
          <EvidenceNote row={row} />
        </div>
        <div className="shrink-0 text-right">
          <p
            className="text-[15px] font-bold tabular-nums"
            style={{
              fontFamily: 'var(--gr-mono)',
              // Colour only where there is a verdict to show. Model-importance rows
              // are neither good nor bad, so they stay neutral.
              color: showVerdict
                ? wins
                  ? 'var(--gr-green)'
                  : 'var(--gr-muted)'
                : 'var(--gr-heading)',
            }}
          >
            {showVerdict ? signed(row.magnitude) : `${Math.abs(row.magnitude).toFixed(1)}%`}
          </p>
          {showVerdict && (
            <p className="text-[10.5px] leading-3" style={{ color: 'var(--gr-muted)' }}>
              {wins ? 'better than average' : 'below average'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const Group = ({
  title,
  note,
  rows,
  showVerdict,
}: {
  title: string
  note: string
  rows: GoldStructuredRecommendation[]
  showVerdict: boolean
}) => (
  <div className="gr-card overflow-hidden">
    <div className="px-4 sm:px-5 pt-3.5 pb-2">
      <p className="gr-eyebrow">{title}</p>
      <p className="text-[11.5px] leading-[17px] mt-1" style={{ color: 'var(--gr-muted)' }}>
        {note}
      </p>
    </div>
    {rows.map((row, i) => (
      <Row key={i} row={row} showVerdict={showVerdict} />
    ))}
  </div>
)

export const MeasuredDrivers = ({ rows }: { rows: GoldStructuredRecommendation[] }) => {
  const measured = rows.filter((r) => r.magnitude_kind === MEASURED_KIND)
  const importance = rows.filter((r) => r.magnitude_kind === IMPORTANCE_KIND)
  if (measured.length === 0 && importance.length === 0) return null
  const asOf = rows.find((r) => r.as_of_date)?.as_of_date ?? null

  return (
    <div className="space-y-3">
      {measured.length > 0 && (
        <Group
          title="Against your portfolio average"
          note="Each campaign's own measured numbers. For cost metrics, coming in below the average is the win."
          rows={measured}
          showVerdict
        />
      )}
      {importance.length > 0 && (
        <Group
          title="What the model weighted most"
          note="Share of the model's importance, not a performance score — a high share means the factor moved predictions, not that it performed well."
          rows={importance}
          showVerdict={false}
        />
      )}
      {asOf && (
        <p className="text-[11px] leading-4 px-1" style={{ color: 'var(--gr-muted)' }}>
          As at {asOf}.
        </p>
      )}
    </div>
  )
}
