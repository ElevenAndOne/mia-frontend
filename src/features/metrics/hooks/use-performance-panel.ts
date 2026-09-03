import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { logger } from '../../../utils/logger'
import type { SegmentedControlOption } from '../../../components/segmented-control'
import { fetchPerformance, queryMetrics } from '../services/metrics-service'
import { readStoredDateRange, resolveMetricsWindowOrDefault } from '../utils/metrics-window'
import { buildCompleteness, buildPlatformRows, buildTiles } from '../utils/performance-view-model'
import {
  SERIES_MEASURES,
  SERIES_MEASURE_LABELS,
  buildSeries,
  buildSeriesRequest,
  campaignNamesFrom,
  type SeriesMeasure,
} from '../utils/series'
import type { ChartSeries, CompletenessView, MetricTileView, PlatformRowView } from '../types'

export interface PerformancePanelOptions {
  /** Mia campaign id — scopes /performance and the time series to that campaign. */
  campaignId?: string
  /** Range value (preset id or custom). Defaults to the globally stored `mia_date_range`. */
  dateRange?: string
}

export interface PerformancePanelState {
  loading: boolean
  error: boolean
  available: boolean
  reason: string | null
  currency: string | null
  tiles: MetricTileView[]
  rows: PlatformRowView[]
  completeness: CompletenessView | null
  series: ChartSeries[]
  seriesLoading: boolean
  measure: SeriesMeasure
  setMeasure: (measure: SeriesMeasure) => void
  measureOptions: Array<SegmentedControlOption<SeriesMeasure>>
}

const MEASURE_OPTIONS: Array<SegmentedControlOption<SeriesMeasure>> = SERIES_MEASURES.map(
  (value) => ({ value, label: SERIES_MEASURE_LABELS[value] })
)

// Store-backed performance for the active workspace: /performance for tiles + the
// platform table, and one /query time series for the chart. Both are quiet on
// `available: false` and on fetch errors (nothing rendered, one warning logged).
export const usePerformancePanel = ({
  campaignId,
  dateRange,
}: PerformancePanelOptions = {}): PerformancePanelState => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id ?? null
  const rangeValue = dateRange ?? readStoredDateRange()
  const window = useMemo(() => resolveMetricsWindowOrDefault(rangeValue), [rangeValue])
  const [measure, setMeasure] = useState<SeriesMeasure>('spend_workspace_ccy')

  const enabled = !!sessionId && !!tenantId

  const performanceQuery = useQuery({
    queryKey: [
      'metrics-performance',
      tenantId,
      campaignId ?? null,
      window.start_date,
      window.end_date,
    ],
    queryFn: ({ signal }) =>
      fetchPerformance(
        sessionId!,
        tenantId!,
        { start_date: window.start_date, end_date: window.end_date, campaign_id: campaignId },
        signal
      ),
    enabled,
    retry: false,
  })
  const performance = performanceQuery.data?.available ? performanceQuery.data : null

  // A Mia campaign has no Cube dimension of its own; the series is scoped through the
  // platform campaign names /performance matched to it. No matches → no chart.
  const campaignNames = useMemo(
    () => (campaignId ? campaignNamesFrom(performance) : null),
    [campaignId, performance]
  )
  const seriesEnabled =
    enabled && !!performance && (!campaignId || (campaignNames?.length ?? 0) > 0)

  const seriesQuery = useQuery({
    queryKey: [
      'metrics-series',
      tenantId,
      campaignNames,
      window.start_date,
      window.end_date,
      window.granularity,
    ],
    queryFn: ({ signal }) =>
      queryMetrics(sessionId!, tenantId!, buildSeriesRequest(window, campaignNames), signal),
    enabled: seriesEnabled,
    retry: false,
  })
  const seriesData = seriesQuery.data?.available ? seriesQuery.data : null

  useEffect(() => {
    if (performanceQuery.error)
      logger.warn('[metrics] performance unavailable:', performanceQuery.error)
  }, [performanceQuery.error])
  useEffect(() => {
    if (seriesQuery.error) logger.warn('[metrics] time series unavailable:', seriesQuery.error)
  }, [seriesQuery.error])

  const tiles = useMemo(() => (performance ? buildTiles(performance) : []), [performance])
  const rows = useMemo(() => (performance ? buildPlatformRows(performance) : []), [performance])
  const completeness = useMemo(
    () => (performance ? buildCompleteness(performance) : null),
    [performance]
  )
  const series = useMemo(
    () =>
      seriesData && performance ? buildSeries(seriesData.rows, measure, performance.currency) : [],
    [seriesData, performance, measure]
  )

  const unavailableReason =
    performanceQuery.data && !performanceQuery.data.available
      ? (performanceQuery.data.reason ?? null)
      : null

  return {
    loading: enabled && performanceQuery.isPending,
    error: performanceQuery.isError,
    available: !!performance,
    reason: unavailableReason,
    currency: performance?.currency ?? null,
    tiles,
    rows,
    completeness,
    series,
    seriesLoading: seriesEnabled && seriesQuery.isPending,
    measure,
    setMeasure,
    measureOptions: MEASURE_OPTIONS,
  }
}
