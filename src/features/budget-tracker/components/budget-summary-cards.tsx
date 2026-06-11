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
  complete: 'text-tertiary',
  unknown: 'text-tertiary',
}

const Loading = () => <span className="text-3xl font-semibold text-tertiary animate-pulse">…</span>

export const BudgetSummaryCards = ({ snapshot }: Props) => {
  const { totals, currency, fx } = snapshot
  const spentPct = totals.spent_pct ?? 0
  const pending = !!snapshot.spend_pending
  // A complete window is either an ended campaign or a finished month within a live one.
  const completeNote =
    snapshot.ended || snapshot.window.mode === 'campaign' ? 'campaign ended' : 'month complete'

  return (
    <div className="flex flex-wrap gap-4">
      <Card label="Total Allocation">
        <p className="text-3xl font-semibold text-primary">{formatMoney(totals.total_allocation, currency)}</p>
        {fx && (
          <p className="paragraph-xs text-tertiary">≈ {formatUsd(fx.total_allocation_equiv)}</p>
        )}
        <div className="mt-2 space-y-0.5">
          <p className="paragraph-xs text-secondary">
            Allocated {formatMoney(totals.committed, currency)}
          </p>
          <p className={`paragraph-xs ${totals.over_allocated ? 'text-utility-error-500' : 'text-secondary'}`}>
            Unallocated {formatMoney(totals.flexible, currency)}
            {totals.over_allocated ? ' · over-allocated' : ''}
          </p>
        </div>
      </Card>

      <Card label="Spent">
        <div className="flex items-baseline justify-between gap-2">
          {pending ? (
            <Loading />
          ) : (
            <p className="text-3xl font-semibold text-primary">{formatMoney(totals.spent, currency)}</p>
          )}
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

      <Card label={totals.pacing_state === 'complete' ? 'Budget Used' : 'Budget Pacing'}>
        {pending ? (
          <Loading />
        ) : totals.pacing_state === 'complete' ? (
          <>
            <p className="text-3xl font-semibold text-primary">{totals.spent_pct ?? 0}%</p>
            <p className="paragraph-xs text-tertiary mt-1">of budget · {completeNote}</p>
          </>
        ) : (
          <>
            <p className={`text-3xl font-semibold ${PACING_TEXT[totals.pacing_state] ?? 'text-primary'}`}>
              {totals.pacing_pct == null
                ? '—'
                : `${totals.pacing_pct > 0 ? '+' : ''}${totals.pacing_pct}%`}
            </p>
            <p className="paragraph-xs text-tertiary mt-1 capitalize">
              {totals.pacing_state === 'on' ? 'on track' : `${totals.pacing_state} speed`}
            </p>
          </>
        )}
      </Card>

      <Card label={totals.pacing_state === 'complete' ? 'Final Spend' : 'Projected Close'}>
        {pending ? (
          <Loading />
        ) : (
          <p className="text-3xl font-semibold text-primary">{formatMoney(totals.projected_close, currency)}</p>
        )}
        <p className="paragraph-xs text-tertiary mt-1">
          {totals.pacing_state === 'complete' ? 'actual at close' : 'linear burn rate'}
        </p>
      </Card>
    </div>
  )
}
