// Types mirroring mia-backend routes/metrics.py — the semantic layer (Cube) over the
// analytics store. Every endpoint answers 200 with `available: false` + `reason`
// when the workspace has nothing in the store yet; callers treat that as "quiet".

export type MetricsView = 'paid_media' | 'web' | 'email'
export type MetricsGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'
export type RoasBasis = 'revenue' | 'conversion_count' | 'mixed'
export type PreviousMode = 'previous_period' | 'same_period_last_year'

export interface MetricsUnavailable {
  available: false
  reason?: string
}

// ── /metrics/catalog ───────────────────────────────────────────────────────

export interface CatalogMember {
  name: string
  description: string
  type: string
}

export interface CatalogView {
  description: string
  measures: CatalogMember[]
  dimensions: CatalogMember[]
}

export interface CatalogKpi {
  kpi_key: string
  display_name: string
  family: string
  kpi_type: string
  unit: string
  aggregation: string
  cube_view: MetricsView
  cube_measure: string
  lower_is_better: boolean
  description: string
}

export interface MetricsCatalogData {
  available: true
  as_of: string | null
  covered_platforms: string[]
  views: Partial<Record<MetricsView, CatalogView>>
  kpis: CatalogKpi[]
}

export type MetricsCatalogResponse = MetricsUnavailable | MetricsCatalogData

// ── /metrics/performance ───────────────────────────────────────────────────

/** Aggregated block. `ctr` and `conversion_rate` are ALREADY percentages (1.7 = 1.7%). */
export interface RateBlock {
  spend: number
  spend_native: number
  spend_unconverted: number
  currency?: string
  platform?: string
  campaign_name?: string
  impressions: number
  clicks: number
  conversions: number
  conversion_value: number
  ctr: number | null
  cpc: number | null
  cpm: number | null
  cost_per_conversion: number | null
  conversion_rate: number | null
  roas: number | null
  roas_basis: RoasBasis
  roas_is_revenue_backed: boolean
  revenue_coverage: number
  currency_count: number
  conversion_basis_count: number
  engagements: number
  video_views: number
  revenue_signal_warning?: string
}

export interface PlatformUnavailable {
  platform: string
  reason: string
}

export interface PerformanceParams {
  start_date: string
  end_date: string
  campaign_id?: string
  platforms?: string[]
}

export interface PerformanceData {
  available: true
  tenant_id: string
  start_date: string
  end_date: string
  /** Workspace currency, e.g. "ZAR". `spend` in every RateBlock is in this currency. */
  currency: string
  data_source: 'store'
  as_of: string | null
  completeness_notes: string[]
  platforms_reported: string[]
  platforms_unavailable: PlatformUnavailable[]
  totals: RateBlock
  by_platform: RateBlock[]
  by_campaign: RateBlock[]
  previous: { start_date: string; end_date: string; totals: RateBlock }
}

export type PerformanceResponse = MetricsUnavailable | PerformanceData

// ── /metrics/query ─────────────────────────────────────────────────────────

export interface MetricsFilter {
  member: string
  operator: string
  values?: string[]
}

export interface MetricsQueryRequest {
  view: MetricsView
  measures: string[]
  dimensions?: string[]
  start_date?: string
  end_date?: string
  granularity?: MetricsGranularity
  filters?: MetricsFilter[]
  order_by?: string
  descending?: boolean
  limit?: number
}

/** One result row: optional `date`, dimension values as strings, measures as numbers
 *  (null = undefined, never 0). Rate measures here are FRACTIONS 0–1. */
export type MetricsQueryRow = Record<string, string | number | null | undefined>

export interface MetricsCompleteness {
  as_of: string | null
  covered: string[]
  missing: string[]
  notes: string[]
}

export interface MetricsQueryData {
  available: true
  view: MetricsView
  measures: string[]
  dimensions: string[]
  granularity: MetricsGranularity | null
  window: [string, string]
  rows: MetricsQueryRow[]
  row_count: number
  completeness: MetricsCompleteness
}

export type MetricsQueryResponse = MetricsUnavailable | MetricsQueryData

// ── /metrics/compare ───────────────────────────────────────────────────────

export interface MetricsCompareRequest {
  view: MetricsView
  measures: string[]
  dimensions?: string[]
  start_date?: string
  end_date?: string
  previous_mode?: PreviousMode
}

export interface CompareCell {
  current: number | null
  previous: number | null
  change: number | null
  /** Fraction (0.12 = +12%). */
  change_pct: number | null
}

export type MetricsCompareRow = Record<string, string | CompareCell>

export interface MetricsCompareData {
  available: true
  view: MetricsView
  measures: string[]
  dimensions: string[]
  current_window: [string, string]
  previous_window: [string, string]
  rows: MetricsCompareRow[]
}

export type MetricsCompareResponse = MetricsUnavailable | MetricsCompareData

// ── View models (what the presentational components receive) ───────────────

export type DeltaDirection = 'up' | 'down' | 'flat'
export type DeltaTone = 'good' | 'bad' | 'neutral'

export interface DeltaView {
  label: string
  direction: DeltaDirection
  tone: DeltaTone
}

export interface MetricTileView {
  key: string
  label: string
  value: string
  delta: DeltaView | null
}

export interface PlatformRowView {
  platform: string
  label: string
  color: string
  spend: string
  impressions: string
  clicks: string
  ctr: string
  cpa: string
  roas: string
  /** True when ROAS is revenue-backed; otherwise CPA is the headline efficiency figure. */
  roasBacked: boolean
}

export interface ChartSeriesPoint {
  date: string
  dateLabel: string
  value: number | null
  title: string
}

export interface ChartSeries {
  key: string
  label: string
  color: string
  points: ChartSeriesPoint[]
}

export interface CompletenessView {
  asOf: string | null
  notes: string[]
}
