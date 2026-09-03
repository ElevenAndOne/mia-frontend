// Time-series request + pivot for the performance chart: /query rows (one per
// date × platform) become one ChartSeries per platform for a chosen measure.

import { channelColor, channelLabel } from '../../campaigns/utils/channel-colors'
import { formatMoney } from '../../budget-tracker/budget-format'
import type { ChartSeries, MetricsQueryRequest, MetricsQueryRow, PerformanceData } from '../types'
import { formatCount } from './metric-format'
import { formatAxisDate, type MetricsWindow } from './metrics-window'

export const SERIES_MEASURES = ['spend_workspace_ccy', 'clicks', 'conversions'] as const
export type SeriesMeasure = (typeof SERIES_MEASURES)[number]

export const SERIES_MEASURE_LABELS: Record<SeriesMeasure, string> = {
  spend_workspace_ccy: 'Spend',
  clicks: 'Clicks',
  conversions: 'Conversions',
}

export const SERIES_DIMENSION = 'platform'

/** Distinct platform campaign names matched to a Mia campaign by /performance. */
export const campaignNamesFrom = (data: PerformanceData | null): string[] => {
  if (!data) return []
  const names = new Set<string>()
  for (const block of data.by_campaign) if (block.campaign_name) names.add(block.campaign_name)
  return [...names]
}

/** The single /query the panel needs; `campaignNames` scopes it to a Mia campaign. */
export const buildSeriesRequest = (
  window: MetricsWindow,
  campaignNames: string[] | null
): MetricsQueryRequest => ({
  view: 'paid_media',
  measures: [...SERIES_MEASURES],
  dimensions: [SERIES_DIMENSION],
  start_date: window.start_date,
  end_date: window.end_date,
  granularity: window.granularity,
  ...(campaignNames && campaignNames.length > 0
    ? { filters: [{ member: 'campaign_name', operator: 'equals', values: campaignNames }] }
    : {}),
})

const numberOrNull = (value: string | number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const formatSeriesValue = (measure: SeriesMeasure, value: number, currency: string): string =>
  measure === 'spend_workspace_ccy' ? formatMoney(value, currency) : formatCount(value)

/** Pivot rows into per-platform series over the union of dates (sorted ascending). */
export const buildSeries = (
  rows: MetricsQueryRow[],
  measure: SeriesMeasure,
  currency: string
): ChartSeries[] => {
  const dates = new Set<string>()
  const byPlatform = new Map<string, Map<string, number | null>>()

  for (const row of rows) {
    const date = typeof row.date === 'string' ? row.date.slice(0, 10) : null
    if (!date) continue
    const platform = typeof row[SERIES_DIMENSION] === 'string' ? row[SERIES_DIMENSION] : 'all'
    dates.add(date)
    if (!byPlatform.has(platform)) byPlatform.set(platform, new Map())
    byPlatform.get(platform)!.set(date, numberOrNull(row[measure]))
  }

  const orderedDates = [...dates].sort()
  const label = SERIES_MEASURE_LABELS[measure]

  return [...byPlatform.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([platform, values]) => {
      const seriesLabel = platform === 'all' ? 'All platforms' : channelLabel(platform)
      return {
        key: platform,
        label: seriesLabel,
        color: channelColor(platform),
        points: orderedDates.map((date) => {
          const value = values.get(date) ?? null
          const shown = value === null ? '—' : formatSeriesValue(measure, value, currency)
          return {
            date,
            dateLabel: formatAxisDate(date),
            value,
            title: `${seriesLabel} · ${formatAxisDate(date)} · ${label} ${shown}`,
          }
        }),
      }
    })
}

/** True when at least one point in any series carries a value. */
export const hasSeriesData = (series: ChartSeries[]): boolean =>
  series.some((s) => s.points.some((p) => p.value !== null))
