// Number formatting for the pipeline's typed payload. Its rates are fractions (0.0444 is
// 4.44%) and its money is in the tenant's currency, unconverted.

export const isRateMetric = (metric: string | null | undefined): boolean => {
  const key = (metric ?? '').toLowerCase()
  return key.endsWith('ctr') || key.endsWith('rate') || key === 'cvr'
}

export const isMoneyMetric = (metric: string | null | undefined): boolean => {
  const key = (metric ?? '').toLowerCase()
  return key.startsWith('cost_') || ['cpc', 'cpm', 'cpa', 'cpl', 'spend'].includes(key)
}

export const pct = (fraction: number): string => `${(fraction * 100).toFixed(2)}%`

export const count = (n: number): string => Math.round(n).toLocaleString()

// No currency on the payload (older reports) means no symbol, never a guessed rand.
export const money = (n: number, currency?: string | null): string => {
  const amount = n.toLocaleString(undefined, {
    minimumFractionDigits: n < 100 ? 2 : 0,
    maximumFractionDigits: n < 100 ? 2 : 0,
  })
  if (!currency) return amount
  return `${currency === 'ZAR' ? 'R' : `${currency} `}${amount}`
}

/** A metric value in its own unit. */
export const metricValue = (
  metric: string | null | undefined,
  v: number,
  currency?: string | null
) => (isRateMetric(metric) ? pct(v) : isMoneyMetric(metric) ? money(v, currency) : count(v))

const METRIC_LABELS: Record<string, string> = {
  link_ctr: 'link CTR',
  ctr: 'CTR',
  cpc: 'CPC',
  cpm: 'CPM',
  cost_per_link_click: 'cost per link click',
  views: 'views',
}

export const metricName = (metric: string | null | undefined): string => {
  const key = (metric ?? '').toLowerCase()
  return METRIC_LABELS[key] ?? key.replace(/_/g, ' ')
}
