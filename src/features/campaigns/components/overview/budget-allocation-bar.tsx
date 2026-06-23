import { allocationByChannel } from '../../utils/budget-math'
import { channelColor, channelLabel } from '../../utils/channel-colors'
import { currencySymbol } from '../../utils/campaign-dates'
import type { CampaignDetail } from '../../types'

// Budget allocation across paid channels (normalised to campaign total) vs the
// campaign total, with the unallocated remainder.
export const BudgetAllocationBar = ({ campaign }: { campaign: CampaignDetail }) => {
  const sym = currencySymbol(campaign.budget_currency)
  const fmt = (n: number) => `${sym}${Math.round(n).toLocaleString()}`
  const segments = allocationByChannel(campaign)
  const allocated = segments.reduce((s, x) => s + x.amount, 0)
  const total = campaign.budget_total ?? 0

  const parts = segments.map((s) => ({ label: channelLabel(s.channel), color: channelColor(s.channel), amount: s.amount }))
  if (total > allocated) parts.push({ label: 'Unallocated', color: '#2c2c34', amount: total - allocated })
  const denom = Math.max(total, allocated, 1)

  return (
    <div className="bg-secondary-alt border border-secondary rounded-2xl p-5 md:p-6">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <span className="label-xs text-quaternary uppercase tracking-[0.14em]">Budget Allocation</span>
        {total > 0 && (
          <span className="paragraph-sm text-tertiary">
            <span className="text-primary font-bold cw-mono">{fmt(allocated)}</span> allocated of {fmt(total)}
          </span>
        )}
      </div>

      {allocated === 0 && total === 0 ? (
        <p className="paragraph-sm text-quaternary text-center py-4">Set channel budgets and a campaign total to see allocation.</p>
      ) : (
        <>
          <div className="flex h-5 rounded-full overflow-hidden gap-0.5 bg-primary">
            {parts.map((p) => (
              <div key={p.label} style={{ width: `${(p.amount / denom) * 100}%`, background: p.color }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
            {parts.map((p) => (
              <div key={p.label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
                <span className="paragraph-sm text-secondary">{p.label}</span>
                <span className="paragraph-sm font-semibold cw-mono text-primary">{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
