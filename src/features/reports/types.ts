export type TopAdMetric = 'conversions' | 'ctr' | 'roas' | 'clicks' | 'impressions' | 'cpc'
export type TopOrganicMetric = 'engagement_rate' | 'impressions' | 'reach' | 'clicks' | 'reactions'

export interface TopMetricOption {
  value: TopAdMetric | TopOrganicMetric
  label: string
}

export const TOP_AD_METRIC_OPTIONS: TopMetricOption[] = [
  { value: 'conversions', label: 'Conversions' },
  { value: 'ctr', label: 'CTR' },
  { value: 'roas', label: 'ROAS' },
  { value: 'clicks', label: 'Clicks' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'cpc', label: 'CPC (lowest)' },
]

export const TOP_ORGANIC_METRIC_OPTIONS: TopMetricOption[] = [
  { value: 'engagement_rate', label: 'Engagement Rate' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'reach', label: 'Reach' },
  { value: 'clicks', label: 'Clicks' },
  { value: 'reactions', label: 'Reactions' },
]

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

// ClickUp
export interface ClickUpList {
  list_id: string
  list_name: string
}

export interface ClickUpSpace {
  space_id: string
  space_name: string
  lists: ClickUpList[]
}

// Report sections
export interface ReportCover {
  client_name: string
  campaign_name: string
  reporting_period_label: string
  reporting_period_start: string
  reporting_period_end: string
  prepared_by: string
  performance_highlight: string
}

export interface ReportExecSummary {
  campaign_status: string
  key_wins: string[]
  challenges: string[]
  next_steps_exec: string[]
}

export interface KpiItem {
  phase: string
  kpi: string
  target: string
  current: string
  unit: string
  status: 'on_track' | 'close' | 'behind' | 'no_target' | 'unknown'
}

export interface ReportKpiPerformance {
  objective: string
  target_audience: string
  platforms: string[]
  duration: string
  kpis: KpiItem[]
  insights: string
}

export interface ChannelSpend {
  platform: string
  spend: number
  percentage: number
}

export interface ReportSpendBreakdown {
  total_spend: number
  currency: string
  channel_split: ChannelSpend[]
  objective_split: ChannelSpend[]
  insight: string
}

export interface OrganicPost {
  post_id: string
  platform: string
  description: string
  image_url: string | null
  created_time: string
  impressions: number
  reach: number
  engaged_users: number
  clicks: number
  reactions: number
  engagement_rate: number
  why_it_worked: string
}

export interface ReportTopOrganicPosts {
  ranking_metric: string
  posts: OrganicPost[]
}

export interface AgeGroup {
  range: string
  percentage: number
}

export interface ReportAudienceInsights {
  age_groups: AgeGroup[]
  gender_split: Record<string, number>
  top_locations: Array<{ location: string; percentage: number }>
  source?: string
}

export interface StudioHoursBreakdown {
  [category: string]: number
}

export interface ReportStudioHours {
  total_hours: number
  breakdown: StudioHoursBreakdown
  source: 'clickup' | 'not_linked' | 'unavailable' | 'error'
}

export interface ReportTopPaidAd {
  ad_id: string
  ad_name: string
  platform: string
  campaign_name: string
  headline: string
  body: string
  image_url: string | null
  thumbnail_url: string | null
  impressions: number
  clicks: number
  spend: number
  ctr: number
  cpc: number
  conversions: number
  top_metric_label: string
}

export interface AbTest {
  what_tested: string
  testing_period: string
  result: string
  learnings: string
}

export interface ReportTestingLearnings {
  tests: AbTest[]
}

export interface ReportRisksRecommendations {
  market_risks: string
  platform_risks: string
  immediate_actions: string
  future_opportunities: string
}

export interface ReportNextMonthPlan {
  focus_areas: string
  upcoming_actions: string
  next_month_budget: number
  future_testing: string
}

export interface NextStep {
  label: string
  description: string
}

export interface ReportDashboard {
  campaign_health: { status: string; description: string }
  top_ad_metric: string
  key_takeaways: string[]
  next_steps: NextStep[]
  next_report_period: string
}

export interface ReportData {
  cover: ReportCover
  executive_summary: ReportExecSummary
  kpi_performance: ReportKpiPerformance
  spend_breakdown: ReportSpendBreakdown
  top_paid_ad: ReportTopPaidAd | null
  top_organic_posts: ReportTopOrganicPosts
  audience_insights: ReportAudienceInsights
  studio_hours: ReportStudioHours
  testing_learnings: ReportTestingLearnings
  risks_recommendations: ReportRisksRecommendations
  next_month_plan: ReportNextMonthPlan
  dashboard: ReportDashboard
}

export interface ClientReport {
  report_id: string
  tenant_id: string
  campaign_id: string
  report_month: number
  report_year: number
  status: 'draft' | 'generating' | 'complete'
  top_ad_metric: string
  top_organic_metric: string
  report_data: ReportData | null
  manual_overrides: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ReportSummary {
  report_id: string
  campaign_id: string
  report_month: number
  report_year: number
  status: string
  client_name: string
  campaign_name: string
  reporting_period_label: string
  created_at: string
}

export interface GenerateReportParams {
  campaign_id: string
  report_month: number
  report_year: number
  top_ad_metric: TopAdMetric
  top_organic_metric: TopOrganicMetric
  clickup_list_id?: string
}
