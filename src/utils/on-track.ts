const RATE_KEYWORDS = ['rate', 'ctr', 'roas', 'cpc', 'cpa', 'cost per']
const LOWER_IS_BETTER_KEYWORDS = ['cpc', 'cpa', 'cost per']

function isRateMetric(name: string): boolean {
  const lower = name.toLowerCase()
  return RATE_KEYWORDS.some((k) => lower.includes(k))
}

function isLowerIsBetter(name: string): boolean {
  const lower = name.toLowerCase()
  return LOWER_IS_BETTER_KEYWORDS.some((k) => lower.includes(k))
}

/**
 * Returns true (on track), false (off track), or null (not started / no data).
 *
 * Cumulative metrics (reach, impressions, followers, etc.) are paced against
 * elapsed campaign fraction with a 15% tolerance buffer.
 *
 * Rate metrics (engagement rate, CTR, ROAS, CPC, CPA, etc.) are compared
 * directly to target with a 20% tolerance. CPC/CPA are inverted (lower is better).
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

  if (isRateMetric(kpiName)) {
    if (isLowerIsBetter(kpiName)) return actual <= target * 1.2
    return actual >= target * 0.8
  }

  // Cumulative — paced against campaign progress
  const durationMs = end.getTime() - start.getTime()
  if (durationMs <= 0) return null
  const elapsedMs = Math.min(now.getTime(), end.getTime()) - start.getTime()
  const progress = elapsedMs / durationMs
  return actual >= target * progress * 0.85
}
