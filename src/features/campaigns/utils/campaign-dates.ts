// Date + currency helpers for the campaigns workspace.

import type { Asset, CampaignDetail } from '../types'

const MS_PER_DAY = 86_400_000
const DAYS_PER_MONTH = 30.44

/** Today in South Africa as YYYY-MM-DD, the day every campaign window is built on (the server's sast_today). The
 *  browser's UTC date was yesterday until 02:00 (sweep 12 Nov). */
export function sastToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' })
}

/** A 'YYYY-MM-DD' as that calendar day: new Date('2026-11-18') is UTC midnight, which west of UTC is the 17th. */
function calendarDay(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateStr)
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return calendarDay(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return calendarDay(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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
  // compared as SA calendar days: against UTC midnight a phase's last day stopped counting at 02:00
  const today = sastToday()
  const phases = [...campaign.phases].sort((a, b) => a.sort_order - b.sort_order)
  for (let i = 0; i < phases.length; i++) {
    const { start_date, end_date } = phases[i]
    if (start_date && end_date && today >= start_date.slice(0, 10) && today <= end_date.slice(0, 10)) {
      return i
    }
  }
  return 0
}
