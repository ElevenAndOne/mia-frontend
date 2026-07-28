// Types for the Beta Usage Analytics ("Mia Pulse") API — /api/admin/analytics/*.
// Mirrors the backend responses in routes/admin_analytics.py.

export type TesterStatus = 'active' | 'idle' | 'new' | 'cold'

export interface Metric {
  value: number
  delta: number | null
}

export interface Overview {
  range: string
  generated_at: string
  active_testers: { value: number; total: number; delta: number | null }
  questions: Metric
  campaigns_built: Metric
  new_signups: Metric
  median_session_seconds: Metric
  /** Total tokens (input+output+cache) across tracked turns in range. */
  tokens: Metric
  /** Estimated LLM spend (USD) for tracked turns — rows before tracking count 0. */
  est_cost_usd: Metric
}

export interface TimeseriesPoint {
  date: string
  value: number
}

export interface Timeseries {
  range: string
  metric: 'questions' | 'active_users'
  points: TimeseriesPoint[]
}

export interface TesterRow {
  google_user_id: string
  name: string
  email: string | null
  tenant: string | null
  role: string | null
  questions_in_range: number
  tokens_in_range: number
  cost_in_range: number
  last_active: string | null
  status: TesterStatus
}

export interface TesterList {
  range: string
  count: number
  testers: TesterRow[]
}

export interface RecentQuestion {
  question: string
  skills: string[]
  is_campaign_builder: boolean
  tenant_id: string | null
  timestamp: string | null
}

export interface TimelineEvent {
  type: string
  page: string | null
  data: Record<string, unknown>
  timestamp: string | null
}

export interface TesterDetail {
  google_user_id: string
  name: string | null
  email: string | null
  role: string | null
  tenant: string | null
  status: TesterStatus
  first_login: string | null
  last_active: string | null
  days_on_beta: number | null
  connected_platforms: string[]
  counters: {
    questions: number
    sessions: number
    campaigns_built: number
    tokens: number
    est_cost_usd: number
  }
  recent_questions: RecentQuestion[]
  timeline: TimelineEvent[]
}

export interface TopicItem {
  key: string
  label: string
  count: number
  pct: number
}

export interface Topics {
  range: string
  total_questions: number
  campaign_builder: { count: number; pct: number }
  topics: TopicItem[]
}

export interface FeedbackCategory {
  key: string
  label: string
  count: number
}

export interface FeedbackSkill {
  key: string
  label: string
  up: number
  down: number
  negative_pct: number
}

export interface FeedbackSummary {
  range: string
  up: number
  down: number
  total: number
  /** % of votes that are thumbs up; null when there are no votes in range. */
  satisfaction_pct: number | null
  satisfaction_delta: number | null
  down_with_details: number
  categories: FeedbackCategory[]
  skills: FeedbackSkill[]
}

export interface FeedbackItem {
  feedback_id: number
  created_at: string | null
  rating: 1 | -1
  category: string | null
  category_label: string | null
  details: string | null
  user_email: string | null
  google_user_id: string | null
  tenant_id: string | null
  conversation_id: string | null
  chat_history_id: number
  question: string
  response: string
  skills: string[]
  model: string | null
}

export interface FeedbackRecent {
  range: string
  rating: 'down' | 'up' | 'all'
  count: number
  items: FeedbackItem[]
}

export type PulseRange = '7d' | '30d' | 'all'

export interface WorkspaceMember {
  google_user_id: string
  name: string
  email: string | null
}

export interface Workspace {
  tenant_id: string
  name: string
  member_count: number
  members: WorkspaceMember[]
}

export interface WorkspaceList {
  workspaces: Workspace[]
}

/** Active workspace/user filter selection driving the dashboard queries. */
export interface PulseFilter {
  tenantIds: string[]
  userId: string | null
}
