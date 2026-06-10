// Display helpers for the Budget Tracker.

export const formatMoney = (amount: number | null | undefined, currency = 'ZAR'): string => {
  if (amount == null) return '—'
  try {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`
  }
}

export const formatUsd = (amount: number | null | undefined): string => {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const clampPct = (pct: number | null | undefined): number => {
  if (pct == null || Number.isNaN(pct)) return 0
  return Math.max(0, Math.min(100, pct))
}

// Bar colour by how spend tracks against allocation (over budget => error).
export const barColorForSpend = (spentPct: number | null | undefined): string => {
  if (spentPct == null) return 'bg-utility-brand-500'
  if (spentPct > 100) return 'bg-utility-error-500'
  if (spentPct >= 85) return 'bg-utility-warning-500'
  return 'bg-utility-success-500'
}
