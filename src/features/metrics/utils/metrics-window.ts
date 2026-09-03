// Resolves the app's global date range (see src/utils/date-range.ts) into the
// YYYY-MM-DD window + granularity the metrics endpoints expect, plus the date
// display helpers used on the chart axis and completeness note.

import { format, parseISO } from 'date-fns'
import { StorageKey } from '../../../constants/storage-keys'
import { parseDateRangeValue } from '../../../utils/date-range'

export const DEFAULT_METRICS_RANGE = '30_days'
/** Windows longer than this switch the time series from daily to weekly points. */
export const WEEKLY_THRESHOLD_DAYS = 120

const MS_PER_DAY = 86_400_000

export type SeriesGranularity = 'day' | 'week'

export interface MetricsWindow {
  start_date: string
  end_date: string
  days: number
  granularity: SeriesGranularity
}

/** The globally selected range value (preset id or custom `start_end`), with a fallback. */
export const readStoredDateRange = (): string => {
  try {
    return localStorage.getItem(StorageKey.DATE_RANGE) || DEFAULT_METRICS_RANGE
  } catch {
    return DEFAULT_METRICS_RANGE
  }
}

const toIsoDate = (date: Date): string => format(date, 'yyyy-MM-dd')

export const granularityForDays = (days: number): SeriesGranularity =>
  days > WEEKLY_THRESHOLD_DAYS ? 'week' : 'day'

/** null when the value is not a resolvable range (e.g. "since_launch"). */
export const resolveMetricsWindow = (
  rangeValue: string,
  now: Date = new Date()
): MetricsWindow | null => {
  const span = parseDateRangeValue(rangeValue, now)
  if (!span) return null
  const days = Math.max(1, Math.round((span.end.getTime() - span.start.getTime()) / MS_PER_DAY) + 1)
  return {
    start_date: toIsoDate(span.start),
    end_date: toIsoDate(span.end),
    days,
    granularity: granularityForDays(days),
  }
}

/** Window for a range value, falling back to the default preset when unresolvable. */
export const resolveMetricsWindowOrDefault = (
  rangeValue: string,
  now: Date = new Date()
): MetricsWindow =>
  resolveMetricsWindow(rangeValue, now) ??
  (resolveMetricsWindow(DEFAULT_METRICS_RANGE, now) as MetricsWindow)

const safeParse = (iso: string): Date | null => {
  const parsed = parseISO(iso)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** "2026-08-14" → "14 Aug" for axis labels. Unparseable input is returned as-is. */
export const formatAxisDate = (iso: string): string => {
  const parsed = safeParse(iso)
  return parsed ? format(parsed, 'd MMM') : iso
}

/** "2026-08-14T03:00:00Z" → "14 Aug 2026"; null stays null. */
export const formatAsOf = (iso: string | null | undefined): string | null => {
  if (!iso) return null
  const parsed = safeParse(iso)
  return parsed ? format(parsed, 'd MMM yyyy') : iso
}
