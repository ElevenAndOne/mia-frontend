// Mirrors the backend snapshot from GET /api/tenants/{tenant_id}/budget-tracker/{campaign_id}
// (services/budget_tracker_service.py :: build_budget_snapshot).

export interface BudgetWindow {
  start: string
  end: string
  mode: 'monthly' | 'campaign'
  label: string
  elapsed_days: number
  total_days: number
}

export type PacingState = 'over' | 'under' | 'on' | 'unknown'

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
}

export interface BudgetPlatformRow {
  platform: string
  label: string
  allocation: number
  allocation_raw: number
  budget_period: 'monthly' | 'total' | 'mixed' | null
  flights: number
  is_paid: boolean
  budget_period_mixed: boolean
  spend_available: boolean
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
  window: BudgetWindow
  totals: BudgetTotals
  platforms: BudgetPlatformRow[]
  fx?: BudgetFx
}

export interface CampaignSummary {
  campaign_id: string
  campaign_name: string
  status: string
  is_primary: boolean
}
