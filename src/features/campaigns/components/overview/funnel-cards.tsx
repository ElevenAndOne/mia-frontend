import type { KPIActual } from '../../../campaign/services/campaign-tracker-service'
import { softColor } from '../../utils/channel-colors'
import type { FunnelPhase } from '../../utils/overview-data'

// The customer-journey funnel — one card per phase. Cards are equal-height
// (grid stretch + flex column) with a fixed-height objective block so the KPI
// rows line up across all phases.
//
// When actuals have loaded, the big number is the ACTUAL with the target after a
// slash — Overview used to print targets only, which is how an unmeasurable KPI
// could look perfectly normal (the Cherry Time lesson). Until actuals arrive the
// card shows the target alone, as before.

const findActual = (rows: KPIActual[] | null | undefined, kpiName: string | null) => {
  if (!rows || !kpiName) return undefined
  return rows.find((r) => r.kpi_name.toLowerCase() === kpiName.toLowerCase())
}

const actualText = (a: KPIActual): string => {
  if (a.actual_label) return a.actual_label
  if (a.actual_value === null || a.actual_value === undefined)
    return a.state === 'none' ? 'Not tracked' : '—'
  return String(a.actual_value)
}

const freshness = (a: KPIActual): string | null => {
  if (a.state === 'manual') return 'manual'
  if (a.state === 'snapshot' && a.as_of) {
    const d = new Date(a.as_of)
    if (!isNaN(d.getTime()))
      return `as of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    return 'from file'
  }
  if (a.scope_note && a.actual_value !== null) return 'all site'
  return null
}

export const FunnelCards = ({
  phases,
  actualsByPhase,
}: {
  phases: FunnelPhase[]
  actualsByPhase?: Record<string, KPIActual[] | null>
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
    {phases.map((p) => {
      const rows = actualsByPhase?.[p.name]
      const primary = findActual(rows, p.primaryLabel)
      const secondary = findActual(rows, p.secondaryKpiName)
      const primaryMissing = primary?.actual_value == null
      return (
        <div
          key={p.phaseId}
          className="flex flex-col h-full rounded-2xl border border-secondary bg-secondary p-4"
        >
          <div className="flex items-center gap-2">
            <span className="cw-mono text-[11px] font-semibold" style={{ color: p.hue }}>{p.num}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md" style={{ color: p.hue, background: softColor(p.hue, 16) }}>{p.role}</span>
          </div>
          <div className="title-h6 text-primary mt-2.5">{p.name}</div>
          <div className="paragraph-xs text-tertiary leading-snug mt-1 line-clamp-3 min-h-[3.25rem]">{p.objective}</div>

          <div className="mt-3.5 pt-3.5 border-t border-tertiary">
            {primary ? (
              <>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span
                    className={`${primaryMissing ? 'text-base font-semibold text-quaternary' : 'text-2xl font-extrabold text-primary'} cw-mono tracking-tight`}
                    title={primary.scope_note ?? undefined}
                  >
                    {actualText(primary)}
                  </span>
                  {p.primaryValue && (
                    <span className="paragraph-xs text-quaternary cw-mono">/ {p.primaryValue}</span>
                  )}
                  {freshness(primary) && (
                    <span
                      className={`label-xs px-1 py-px rounded ${primary.state === 'manual' ? 'bg-utility-warning-100 text-utility-warning-700' : 'text-quaternary'}`}
                      title={primary.source_label ?? primary.scope_note ?? undefined}
                    >
                      {freshness(primary)}
                    </span>
                  )}
                </div>
                <div className="paragraph-xs text-tertiary mt-0.5">{p.primaryLabel}</div>
              </>
            ) : p.primaryValue ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold cw-mono tracking-tight text-primary">{p.primaryValue}</span>
                <span className="paragraph-xs text-tertiary">{p.primaryLabel}</span>
              </div>
            ) : (
              <div className="paragraph-xs text-quaternary">No KPI target yet</div>
            )}
            {secondary ? (
              <div className="paragraph-xs text-quaternary mt-0.5">
                <span className={`cw-mono ${secondary.actual_value == null ? '' : 'text-secondary font-medium'}`}>
                  {actualText(secondary)}
                </span>
                {` / ${p.secondary}`}
              </div>
            ) : (
              p.secondary && <div className="paragraph-xs text-quaternary mt-0.5">{p.secondary}</div>
            )}
          </div>

          {p.channels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-3.5 mt-auto">
              {p.channels.map((c) => (
                <span key={c.name} className="inline-flex items-center gap-1.5 paragraph-xs text-secondary bg-primary border border-secondary rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />{c.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )
    })}
  </div>
)
