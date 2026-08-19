// Weekly Optimization Memo — mirrors mia-backend routes/memo.py responses
// (GET /api/memo/latest, POST /api/memo/recommendations/{id}/approve|dismiss).

export type MemoRecKind = 'scale' | 'kill' | 'fix' | 'info'

export type MemoRecState = 'proposed' | 'approved' | 'declined' | 'applied' | 'failed'

export interface MemoWindowEvidence {
  spend: number
  conversions: number
  conversion_value: number
  clicks: number
  impressions: number
  // The outcome this campaign was optimised to buy — a traffic campaign reports
  // link clicks, not "0 results" (backend services/memo_grading.result_unit).
  results: number
  result_unit: string
  result_label: string
  roas: number | null
  cost_per_result: number | null
  ctr_pct: number | null
}

export interface MemoClusterMember {
  id: string | null
  name: string | null
  plan: string | null
  stake: number
  impact: number | null
}

export interface MemoEvidence {
  basis?: string
  reasons?: string[]
  recent?: MemoWindowEvidence
  prior?: MemoWindowEvidence
  account_median_cpr?: number | null
  recent_days?: number
  window_days?: number
  // clustering + ranking (scope doc §11)
  channel_type?: string | null
  spend_share?: number | null
  stake?: number | null
  impact?: number | null
  impact_notes?: string[]
  plan?: string | null
  campaigns?: MemoClusterMember[]
  cluster_size?: number
  // plan-level fix cards carry their issue list + tracker fields instead
  issues?: string[]
  pacing_state?: string
  pacing_pct?: number | null
  total_allocation?: number | null
  spent?: number | null
  over_allocated?: boolean
  over_by?: number | null
  currency?: string
}

export interface MemoDisclosure {
  held_back: number
  held_back_stake: number
  ceiling: number
  plan_cards_held_back?: number
  immaterial?: number
}

export interface MemoRecommendation {
  id: string
  kind: MemoRecKind
  fingerprint: string
  platform: string | null
  campaign_ref: {
    id: string | null
    name: string | null
    plan?: string | null
    also?: string[]
  } | null
  evidence: MemoEvidence | null
  body: string | null
  action_type: string | null
  action_params: Record<string, unknown> | null
  state: MemoRecState
  decided_at: string | null
  applied_at: string | null
  result: Record<string, unknown> | null
}

export interface MemoCounts {
  scale: number
  kill: number
  fix: number
}

export interface MemoData {
  id: string
  week_of: string
  status: string
  memo: {
    headline: string | null
    narrative: string | null
    counts: MemoCounts
    suppressed: number
    narrated: boolean
    impact_zar: number | null
    impact_notes: string[]
    currency: string
    disclosure: MemoDisclosure | null
    gold_enriched: boolean
    graded_campaigns: number
    generated_at: string
  } | null
  created_at: string | null
  recommendations: MemoRecommendation[]
}

export interface ApproveResult {
  success: boolean
  state: MemoRecState
  workflow_id: string
  executed_params: Record<string, unknown>
}
