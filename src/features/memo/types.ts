// Weekly Optimization Memo — mirrors mia-backend routes/memo.py responses
// (GET /api/memo/latest, POST /api/memo/recommendations/{id}/approve|dismiss).

export type MemoRecKind = 'grow' | 'optimise' | 'protect' | 'info'

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
  // wasted-search-term cards
  terms?: { term: string; spend: number; clicks: number; conversions: number }[]
  waste?: number
  // organic cards (Facebook / Instagram / LinkedIn posts): a ready-made metric
  // strip and value line, because their units are views/posts, not currency
  organic?: boolean
  network?: string
  metrics?: { label: string; value: string; tone?: 'bad' | 'good' }[]
  stake_unit?: string
  // thin-sample findings are shown with the sample size beside the verdict
  early_signal?: boolean
  sample_size?: number | null
  sample_label?: string | null
  value_label?: string | null
  value_text?: string | null
  permalink?: string | null
  // plan-level cards carry their issue list + tracker fields instead
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

/** Posts Mia drafted from an organic finding — they live on the canvas of a
 *  dedicated memo-drafts conversation, where the Schedule button publishes them. */
export interface MemoDraftDocument {
  document_id: string
  title: string
  platform: string
  format: string
  preview: string
  why?: string | null
  scheduled?: {
    post_id: string | null
    scheduled_at: string | null
    platform: string
    /** live status of that post: scheduled | reminded | published | failed | removed */
    status?: string
  } | null
}

export interface MemoDrafts {
  conversation_id: string
  generated_on?: string
  best_weekday?: string | null
  documents: MemoDraftDocument[]
}

export interface ScheduleDraftResult {
  success: boolean
  message?: string
  post?: { post_id?: string; scheduled_at?: string }
  drafts: MemoDrafts
  state: MemoRecState
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
  drafts?: MemoDrafts | null
}

export interface MemoCounts {
  grow: number
  optimise: number
  protect: number
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
    reviewed_spend: number
    platforms: string[]
    memo_kind?: 'paid' | 'organic' | 'mixed'
    organic?: {
      posts: number
      window_days: number
      networks: string[]
      unmeasured: string[]
      held_back: number
    } | null
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
