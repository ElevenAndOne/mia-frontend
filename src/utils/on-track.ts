const RATE_KEYWORDS = ['rate', 'ctr', 'roas', 'cpc', 'cpa', 'cost per']
const LOWER_IS_BETTER_KEYWORDS = ['cpc', 'cpa', 'cost per']

export function isRateMetric(name: string): boolean {
  const lower = name.toLowerCase()
  return RATE_KEYWORDS.some((k) => lower.includes(k))
}

function isLowerIsBetter(name: string): boolean {
  const lower = name.toLowerCase()
  return LOWER_IS_BETTER_KEYWORDS.some((k) => lower.includes(k))
}

/**
 * 3-state health signal for rate metrics (CTR, open rate, ROAS, CPC, CPA, etc.).
 * Rate metrics are snapshot quality signals — they don't accumulate over time,
 * so the bar is always 100% wide and only the colour communicates status.
 *
 *  'on-track'  — at or beating target (green)
 *  'at-risk'   — within 20% of target but not there yet (amber)
 *  'off-track' — more than 20% below target (red)
 */
export function rateMetricStatus(
  kpiName: string,
  target: number,
  actual: number
): 'on-track' | 'at-risk' | 'off-track' {
  if (isLowerIsBetter(kpiName)) {
    if (actual <= target) return 'on-track'
    if (actual <= target * 1.2) return 'at-risk'
    return 'off-track'
  }
  if (actual >= target) return 'on-track'
  if (actual >= target * 0.8) return 'at-risk'
  return 'off-track'
}

/**
 * Returns true (on track), false (off track), or null (not started / no data).
 * Only used for cumulative metrics — paced against elapsed campaign fraction
 * with a 15% tolerance buffer.
 */
export function isOnTrack(
  kpiName: string,
  target: number,
  actual: number,
  startDate: string,
  endDate: string,
  today: string
): boolean | null {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const now = new Date(today)

  if (now < start) return null

  // Rate metrics now handled separately via rateMetricStatus
  if (isRateMetric(kpiName)) {
    const s = rateMetricStatus(kpiName, target, actual)
    return s === 'off-track' ? false : true
  }

  // Cumulative — paced against campaign progress
  const durationMs = end.getTime() - start.getTime()
  if (durationMs <= 0) return null
  const elapsedMs = Math.min(now.getTime(), end.getTime()) - start.getTime()
  const progress = elapsedMs / durationMs
  return actual >= target * progress * 0.85
}
