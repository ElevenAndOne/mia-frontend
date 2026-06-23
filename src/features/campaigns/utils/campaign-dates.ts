// Date + currency helpers for the campaigns workspace.

import type { Asset, CampaignDetail } from '../types'

const MS_PER_DAY = 86_400_000
const DAYS_PER_MONTH = 30.44

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export function currencySymbol(currency: string | null): string {
  return currency === 'ZAR' ? 'R' : currency || ''
}

export function formatBudget(amount: number | null, currency: string | null): string {
  if (!amount) return '—'
  return `${currencySymbol(currency)}${amount.toLocaleString()}`
}

// Whole-month span of a campaign, used to normalise /mo budgets to a campaign
// total (and vice-versa). Always at least 1 so single-month campaigns work.
export function campaignMonths(campaign: Pick<CampaignDetail, 'start_date' | 'end_date'>): number {
  const { start_date, end_date } = campaign
  if (!start_date || !end_date) return 1
  const days = (Date.parse(end_date) - Date.parse(start_date)) / MS_PER_DAY
  if (!Number.isFinite(days) || days <= 0) return 1
  return Math.max(1, Math.round(days / DAYS_PER_MONTH))
}

// The date an asset "happens" for calendar / timeline placement. Prefers the
// explicit launch date, then the flight start.
export function assetDate(asset: Asset): string | null {
  const launch = (asset.details as Record<string, unknown> | null)?.launch_date
  if (typeof launch === 'string' && launch) return launch
  return asset.start_date ?? null
}

// Phase whose date window contains today; falls back to the first phase.
export function defaultPhaseIndex(campaign: CampaignDetail): number {
  const today = new Date()
  const phases = [...campaign.phases].sort((a, b) => a.sort_order - b.sort_order)
  for (let i = 0; i < phases.length; i++) {
    const { start_date, end_date } = phases[i]
    if (start_date && end_date && today >= new Date(start_date) && today <= new Date(end_date)) {
      return i
    }
  }
  return 0
}
