import type { BudgetSnapshot } from '../types'
import { formatMoney } from '../budget-format'

interface Props {
  snapshot: BudgetSnapshot
}

// Phase 1: a deterministic plain-language summary derived from the snapshot.
// Phase 2 replaces this body with the headless-optimizer recommendation + score.
export const BudgetIntelligencePanel = ({ snapshot }: Props) => {
  const { totals, currency } = snapshot
  const overspending = snapshot.platforms.filter(
    (p) => p.spend_available && p.remaining != null && p.remaining < 0,
  )

  return (
    <div className="rounded-2xl border border-utility-brand-500/40 bg-utility-brand-500/5 p-6 h-full">
      <p className="text-base font-semibold text-primary mb-3">Mia Intelligence</p>

      {totals.pacing_state === 'over' && (
        <p className="paragraph-sm text-secondary">
          Spend is pacing <span className="text-utility-error-500">ahead</span> of schedule
          ({totals.pacing_pct}% over). Projected to close at{' '}
          {formatMoney(totals.projected_close, currency)} vs{' '}
          {formatMoney(totals.total_allocation, currency)} allocated.
        </p>
      )}
      {totals.pacing_state === 'under' && (
        <p className="paragraph-sm text-secondary">
          Spend is pacing <span className="text-utility-warning-500">behind</span> schedule
          ({Math.abs(totals.pacing_pct ?? 0)}% under). On a linear burn it closes near{' '}
          {formatMoney(totals.projected_close, currency)}.
        </p>
      )}
      {totals.pacing_state === 'on' && (
        <p className="paragraph-sm text-secondary">Spend is tracking on plan for this window.</p>
      )}

      {overspending.length > 0 && (
        <p className="paragraph-sm text-secondary mt-2">
          Over budget: {overspending.map((p) => p.label).join(', ')}. Consider shifting from
          under-pacing channels.
        </p>
      )}

      <p className="paragraph-xs text-tertiary mt-3 pt-3 border-t border-tertiary/60">
        Optimizer-driven reallocation &amp; score arriving in a later update.
      </p>
    </div>
  )
}
