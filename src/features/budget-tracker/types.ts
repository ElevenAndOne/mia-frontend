// Mirrors the backend snapshot from GET /api/tenants/{tenant_id}/budget-tracker/{campaign_id}
// (services/budget_tracker_service.py :: build_budget_snapshot).

export interface BudgetWindow {
  start: string
  end: string
  mode: 'monthly' | 'campaign'
  month?: string | null // "YYYY-MM" of the resolved monthly window (null in campaign mode)
  label: string
  complete?: boolean // window is fully in the past (finished month / ended campaign)
  elapsed_days: number
  total_days: number
}

export type PacingState = 'over' | 'under' | 'on' | 'complete' | 'not_started' | 'unknown'

export interface BudgetTotals {
  total_allocation: number
  committed: number
  flexible: number
  over_allocated: boolean
  spent: number
  spent_pct: number | null
  expected_to_date: number
  pacing_pct: number | null
  pacing_state: PacingState
  projected_close: number | null
  projected_capped?: boolean
}

export interface BudgetPlatformRow {
  platform: string
  label: string
  allocation: number
  allocation_raw: number
  budget_period: 'monthly' | 'total' | 'mixed' | null
  flights: number
  is_paid: boolean
  coming_soon?: boolean
  budget_period_mixed: boolean
  spend_available: boolean
  spend_pending?: boolean
  linked: boolean | null
  needs_link?: boolean
  spent: number | null
  remaining: number | null
  spent_pct?: number | null
  matched_campaigns?: string[]
}

export interface BudgetFx {
  display_currency: string
  rate: number
  source: string
  total_allocation_equiv: number
  spent_equiv: number
}

export interface BudgetSnapshot {
  campaign_id: string
  campaign_name: string
  currency: string
  ended?: boolean
  spent_as_of?: string | null
  spend_pending?: boolean
  available_months?: string[]
  window: BudgetWindow
  totals: BudgetTotals
  platforms: BudgetPlatformRow[]
  fx?: BudgetFx
}

export interface RecommendationPlatform {
  platform: string
  label: string
  current: number
  recommended: number
  delta: number
  direction: 'increase' | 'decrease' | 'hold'
  data_source?: 'observed' | 'estimated'
}

export interface BudgetRecommendation {
  available: boolean
  kind?: 'reallocation' | 'single_channel'
  reason?: string
  objective_type?: string
  paid_channel_count?: number
  paid_channel_label?: string | null
  total_budget?: number
  currency?: string
  optimization_score?: number | null
  platforms?: RecommendationPlatform[]
  data_quality?: { observed: string[]; estimated: string[] }
  narrative?: string
  run_id?: string | null
  generated_at?: string
}

export interface CampaignSummary {
  campaign_id: string
  campaign_name: string
  status: string
  is_primary: boolean
}
