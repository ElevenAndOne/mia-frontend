import { softColor } from '../../utils/channel-colors'
import { formatBudget } from '../../utils/campaign-dates'
import type { PhaseSummary } from '../../utils/overview-data'

interface Props {
  summaries: PhaseSummary[]
  currency: string | null
}

const Stat = ({ value, label }: { value: number; label: string }) => (
  <div className="text-center">
    <div className="cw-mono text-lg font-bold text-primary leading-none">{value}</div>
    <div className="label-xs text-quaternary uppercase tracking-wide mt-1">{label}</div>
  </div>
)

// Replaces the timeline on Overview: a compact per-phase rollup of channels,
// assets, KPIs and budget. (The full timeline becomes its own page later.)
export const PhaseBreakdown = ({ summaries, currency }: Props) => (
  <div className="bg-secondary-alt border border-secondary rounded-2xl p-5 md:p-6">
    <span className="label-xs text-quaternary uppercase tracking-[0.14em]">Phase Breakdown</span>
    <div className="mt-4 space-y-2.5">
      {summaries.map((p) => (
        <div key={p.phaseId} className="flex items-center justify-between gap-4 rounded-xl border border-secondary bg-secondary px-4 py-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="cw-mono text-xs font-semibold" style={{ color: p.hue }}>{p.num}</span>
            <span className="w-2 h-2 rounded-sm" style={{ background: p.hue }} />
            <span className="paragraph-sm font-semibold text-primary">{p.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md" style={{ color: p.hue, background: softColor(p.hue, 16) }}>{p.role}</span>
          </div>
          <div className="flex items-center gap-6">
            <Stat value={p.channels} label="Channels" />
            <Stat value={p.assets} label="Assets" />
            <Stat value={p.kpis} label="KPIs" />
            {p.budget > 0 && (
              <div className="text-center">
                <div className="cw-mono text-lg font-bold leading-none" style={{ color: p.hue }}>{formatBudget(p.budget, currency)}</div>
                <div className="label-xs text-quaternary uppercase tracking-wide mt-1">Budget</div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)
