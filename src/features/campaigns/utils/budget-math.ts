// Budget allocation maths for the campaigns workspace.
//
// Model (locked): every budget line is normalised to a campaign-TOTAL figure —
// a "monthly" line counts as amount × campaign-months, a "total" line counts
// as-is. Allocated = sum of all channel/asset budgets across all phases.
// Unallocated = campaign budget_total − allocated. The same allocated/remaining
// number is shown in the Builder header and the Overview allocation bar.
//
// Channel effective budget = sum of its assets' budgets when any asset has one,
// otherwise the channel's own budget (mirrors the backend collect_allocations
// fallback — never double-counted).

import type { CampaignDetail, ChannelAction } from '../types'
import { campaignMonths } from './campaign-dates'

function lineToTotal(amount: number, period: string | null, months: number): number {
  return (period ?? 'monthly') === 'monthly' ? amount * months : amount
}

export interface ChannelDisplayBudget {
  amount: number | null
  derived: boolean // true when summed from assets (read-only at channel level)
  period: string
  assetCount: number
}

// What to show on a channel row: either the summed asset budgets (derived) or
// the channel's own budget.
export function channelDisplayBudget(action: ChannelAction): ChannelDisplayBudget {
  const assetItems = action.assets.filter((a) => a.budget != null)
  if (assetItems.length > 0) {
    const amount = assetItems.reduce((s, a) => s + Number(a.budget), 0)
    return {
      amount,
      derived: true,
      period: assetItems[0].budget_period ?? 'total',
      assetCount: assetItems.length,
    }
  }
  return {
    amount: action.budget,
    derived: false,
    period: action.budget_period ?? 'monthly',
    assetCount: 0,
  }
}

// A single channel action's contribution to the campaign-total allocation.
export function channelAllocatedTotal(action: ChannelAction, months: number): number {
  const assetItems = action.assets.filter((a) => a.budget != null)
  if (assetItems.length > 0) {
    return assetItems.reduce(
      (s, a) => s + lineToTotal(Number(a.budget), a.budget_period, months),
      0,
    )
  }
  if (action.budget != null) return lineToTotal(Number(action.budget), action.budget_period, months)
  return 0
}

export interface AllocationByChannel {
  channel: string
  amount: number // campaign-total figure
}

// Allocation aggregated by channel key across all phases (for the Overview bar).
// Channels with no budget naturally fall out (amount 0 → excluded).
export function allocationByChannel(campaign: CampaignDetail): AllocationByChannel[] {
  const months = campaignMonths(campaign)
  const totals = new Map<string, number>()
  for (const phase of campaign.phases) {
    for (const action of phase.channel_actions) {
      const amt = channelAllocatedTotal(action, months)
      if (amt <= 0) continue
      totals.set(action.channel, (totals.get(action.channel) ?? 0) + amt)
    }
  }
  return [...totals.entries()]
    .map(([channel, amount]) => ({ channel, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export interface AllocationSummary {
  allocatedTotal: number
  budgetTotal: number | null
  unallocated: number | null // budgetTotal − allocated (may be negative = over)
  months: number
  allocatedMonthly: number // allocatedTotal / months
  budgetMonthly: number | null
}

export function allocationSummary(campaign: CampaignDetail): AllocationSummary {
  const months = campaignMonths(campaign)
  const allocatedTotal = campaign.phases.reduce(
    (sum, phase) =>
      sum + phase.channel_actions.reduce((s, a) => s + channelAllocatedTotal(a, months), 0),
    0,
  )
  const budgetTotal = campaign.budget_total
  return {
    allocatedTotal,
    budgetTotal,
    unallocated: budgetTotal != null ? budgetTotal - allocatedTotal : null,
    months,
    allocatedMonthly: allocatedTotal / months,
    budgetMonthly: campaign.budget_monthly,
  }
}
