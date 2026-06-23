import { allocationSummary } from '../../utils/budget-math'
import { currencySymbol } from '../../utils/campaign-dates'
import type { CampaignDetail } from '../../types'

// Live allocated-vs-Total readout shown in the Builder header. Updates in real
// time as channel/asset budgets change (computed from the campaign in context).
export const BudgetReadout = ({ campaign }: { campaign: CampaignDetail }) => {
  const { allocatedTotal, budgetTotal, unallocated } = allocationSummary(campaign)
  const sym = currencySymbol(campaign.budget_currency)
  const fmt = (n: number) => `${sym}${Math.round(n).toLocaleString()}`

  if (!budgetTotal) {
    return (
      <span className="paragraph-xs text-quaternary">
        {allocatedTotal > 0 ? `${fmt(allocatedTotal)} allocated · set a total budget` : 'No budget set'}
      </span>
    )
  }
  const pct = Math.min(100, (allocatedTotal / budgetTotal) * 100)
  const over = (unallocated ?? 0) < 0

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <div className="paragraph-xs cw-mono">
        <span className="text-primary font-semibold">{fmt(allocatedTotal)}</span>
        <span className="text-quaternary"> of {fmt(budgetTotal)} allocated · </span>
        <span className={over ? 'text-utility-error-700 font-semibold' : 'text-utility-brand-700'}>
          {over ? `${fmt(Math.abs(unallocated ?? 0))} over` : `${fmt(unallocated ?? 0)} left`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-tertiary overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? 'var(--color-utility-error-600)' : 'var(--cw-accent)' }} />
      </div>
    </div>
  )
}
