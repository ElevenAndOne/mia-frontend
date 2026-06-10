import type { BudgetSnapshot } from '../types'
import { barColorForSpend, clampPct, formatMoney, formatUsd } from '../budget-format'

interface Props {
  snapshot: BudgetSnapshot
}

const Card = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex-1 min-w-[220px] min-h-[180px] rounded-2xl border border-tertiary bg-secondary/40 p-6 flex flex-col">
    <p className="paragraph-xs uppercase tracking-wide text-tertiary mb-3">{label}</p>
    {children}
  </div>
)

const PACING_TEXT: Record<string, string> = {
  over: 'text-utility-error-500',
  under: 'text-utility-warning-500',
  on: 'text-utility-success-500',
  unknown: 'text-tertiary',
}

export const BudgetSummaryCards = ({ snapshot }: Props) => {
  const { totals, currency, fx } = snapshot
  const spentPct = totals.spent_pct ?? 0

  return (
    <div className="flex flex-wrap gap-4">
      <Card label="Total Allocation">
        <p className="text-3xl font-semibold text-primary">{formatMoney(totals.total_allocation, currency)}</p>
        {fx && (
          <p className="paragraph-xs text-tertiary">≈ {formatUsd(fx.total_allocation_equiv)}</p>
        )}
        <div className="mt-2 space-y-0.5">
          <p className="paragraph-xs text-secondary">
            Committed {formatMoney(totals.committed, currency)}
          </p>
          <p className={`paragraph-xs ${totals.over_allocated ? 'text-utility-error-500' : 'text-secondary'}`}>
            Flexible {formatMoney(totals.flexible, currency)}
            {totals.over_allocated ? ' · over-allocated' : ''}
          </p>
        </div>
      </Card>

      <Card label="Live Spent">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-3xl font-semibold text-primary">{formatMoney(totals.spent, currency)}</p>
          {totals.spent_pct != null && (
            <span className="paragraph-xs text-secondary">{totals.spent_pct}%</span>
          )}
        </div>
        <div className="mt-3 h-2 rounded-full bg-tertiary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColorForSpend(spentPct)}`}
            style={{ width: `${clampPct(spentPct)}%` }}
          />
        </div>
      </Card>

      <Card label="Budget Pacing">
        <p className={`text-3xl font-semibold ${PACING_TEXT[totals.pacing_state] ?? 'text-primary'}`}>
          {totals.pacing_pct == null
            ? '—'
            : `${totals.pacing_pct > 0 ? '+' : ''}${totals.pacing_pct}%`}
        </p>
        <p className="paragraph-xs text-tertiary mt-1 capitalize">
          {totals.pacing_state === 'on' ? 'on track' : `${totals.pacing_state} speed`}
        </p>
      </Card>

      <Card label="Projected Close">
        <p className="text-3xl font-semibold text-primary">{formatMoney(totals.projected_close, currency)}</p>
        <p className="paragraph-xs text-tertiary mt-1">linear burn rate</p>
      </Card>
    </div>
  )
}
