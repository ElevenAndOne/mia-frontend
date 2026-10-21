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

//   4. Each row is one KPI's winner, named only in `source` ("cpc:<campaign>"), so the
//      KPI leads the row — without it a campaign that wins two KPIs read as a duplicate
//      with two different numbers. The figure says above/below in words, and the verdict
//      is separate: "59.6% below average · better", never "-59.6% better than average".

const MEASURED_KIND = 'pct_vs_portfolio_average'
const IMPORTANCE_KIND = 'share_of_model_importance_pct'

// More spend is not a better result, whatever the row's metric_direction says — shown
// with no verdict until the analytics team settles what one would mean (2026-10-18).
const NO_VERDICT_KPIS = new Set(['spend'])

const KPI_LABELS: Record<string, string> = {
  cpc: 'CPC',
  cpm: 'CPM',
  ctr: 'CTR',
  cpa: 'CPA',
  roas: 'ROAS',
}

const kpiOf = (row: GoldStructuredRecommendation): string | null => {
  const kpi = row.source?.split(':')[0]?.trim().toLowerCase()
  return kpi || null
}

const kpiLabel = (kpi: string) =>
  KPI_LABELS[kpi] ?? kpi.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

// A driver string can be a long campaign name with a URL in it.
const DriverName = ({ name, kpi }: { name: string; kpi: string | null }) => (
  <span className="text-[0.8313rem] leading-5 break-words" style={{ color: 'var(--gr-heading)' }}>
    {kpi && (
      <span className="gr-inner gr-chip uppercase mr-1.5 align-[1px]">{kpiLabel(kpi)}</span>
    )}
    {name.replace(/^Campaign:\s*/i, '')}
  </span>
)

const EvidenceNote = ({ row }: { row: GoldStructuredRecommendation }) => {
  const bits: string[] = []
  if (row.evidence_basis === 'measured') bits.push('measured')
  else if (row.evidence_basis === 'model') {
    bits.push(
      row.model_evidence && row.model_evidence !== 'unknown'
        ? `model, ${row.model_evidence} evidence`
        : 'model estimate'
    )
  }
  // Absent confidence is intentional on measured rows — say nothing rather than 0.
  if (typeof row.confidence === 'number')
    bits.push(`confidence ${Math.round(row.confidence * 100)}%`)
  if (row.applies_to_platform) bits.push(`${row.applies_to_platform} only`)
  else if (row.platform_scoped) bits.push('one platform only')
  if (bits.length === 0) return null
  return (
    <p className="text-[0.6875rem] leading-4 mt-0.5" style={{ color: 'var(--gr-muted)' }}>
      {bits.join(' · ')}
    </p>
  )
}

const Row = ({ row, measured }: { row: GoldStructuredRecommendation; measured: boolean }) => {
  const kpi = kpiOf(row)
  const magnitude = typeof row.magnitude === 'number' ? row.magnitude : null
  // Colour only where there is a verdict to show. Model-importance rows are neither good
  // nor bad, and neither is a KPI on the no-verdict list.
  const verdict =
    measured && !(kpi && NO_VERDICT_KPIS.has(kpi)) && typeof row.beats_portfolio_average === 'boolean'
      ? row.beats_portfolio_average
        ? 'better'
        : 'worse'
      : null
  return (
    <div className="px-4 sm:px-5 py-3 border-t" style={{ borderColor: 'var(--gr-line)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <DriverName name={row.driver} kpi={kpi} />
          <EvidenceNote row={row} />
        </div>
        {magnitude !== null && (
          <div className="shrink-0 text-right">
            <p
              className="text-[0.9375rem] font-bold tabular-nums"
              style={{
                fontFamily: 'var(--gr-mono)',
                color:
                  verdict === 'better'
                    ? 'var(--gr-green)'
                    : verdict === 'worse'
                      ? 'var(--gr-muted)'
                      : 'var(--gr-heading)',
              }}
            >
              {Math.abs(magnitude).toFixed(1)}%
            </p>
            {measured && (
              <p className="text-[0.6563rem] leading-3" style={{ color: 'var(--gr-muted)' }}>
                {magnitude >= 0 ? 'above' : 'below'} average
                {verdict && ` · ${verdict}`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const Group = ({
  title,
  note,
  rows,
  measured,
}: {
  title: string
  note: string
  rows: GoldStructuredRecommendation[]
  measured: boolean
}) => (
  <div className="gr-card overflow-hidden">
    <div className="px-4 sm:px-5 pt-3.5 pb-2">
      <p className="gr-eyebrow">{title}</p>
      <p className="text-[0.7188rem] leading-[1.0625rem] mt-1" style={{ color: 'var(--gr-muted)' }}>
        {note}
      </p>
    </div>
    {rows.map((row, i) => (
      <Row key={i} row={row} measured={measured} />
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
          note="The campaign that led each KPI, against your portfolio average. For cost metrics, coming in below the average is the win."
          rows={measured}
          measured
        />
      )}
      {importance.length > 0 && (
        <Group
          title="What the model weighted most"
          note="Share of the model's importance, not a performance score — a high share means the factor moved predictions, not that it performed well."
          rows={importance}
          measured={false}
        />
      )}
      {asOf && (
        <p className="text-[0.6875rem] leading-4 px-1" style={{ color: 'var(--gr-muted)' }}>
          As at {asOf}.
        </p>
      )}
    </div>
  )
}
