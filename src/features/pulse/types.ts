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
  counters: { questions: number; sessions: number; campaigns_built: number }
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
