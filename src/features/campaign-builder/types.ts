// The new campaign page (rebuild slice 3). Shapes mirror the backend's
// services/campaign_builder/build_service.py state() and plan_generator.py.

export type RunStatus = 'running' | 'done' | 'failed'

export interface BuildRun {
  run_id: string
  status: RunStatus
  stage: string | null
  stage_label: string | null
  error: string | null
  stale: boolean
  started_at: string | null
  finished_at: string | null
  brief_version: number | null
}

export interface PmWords {
  text: string
  sets: string
}

export interface Brief {
  mode?: string
  goal?: string | null
  audience?: string | null
  start_date?: string | null
  end_date?: string | null
  budget_total?: number | null
  budget_monthly?: number | null // money per month; the total is worked out from the dates
  budget_working?: string | null // how a monthly budget became the total
  budget_from_monthly?: boolean
  channels_requested?: string[]
  must_haves?: string[]
  constraints?: string[]
  offer?: string | null
  landing_page?: string | null
  already_made?: string[]
  pm_words?: PmWords[]
  open_questions?: { id: string; question: string; why_it_matters: string; impact?: string }[]
  answered_questions?: { question: string; answer: string | null; assumed?: string }[]
  dates_proposed_by_mia?: boolean
  set_by_pm?: string[]
}

export type BriefField =
  | 'goal'
  | 'audience'
  | 'start_date'
  | 'end_date'
  | 'budget_total'
  | 'budget_monthly'
  | 'channels_requested'
  | 'must_haves'
  | 'constraints'
  | 'offer'
  | 'landing_page'
  | 'already_made'

export interface CreativeBrief {
  objective?: string
  idea?: string
  artDirection?: string
  requirements?: string[] | string
  getRight?: { lookHere?: string[]; holdBack?: string[] }
  slides?: { n?: number | string; description?: string; wordsOnAsset?: string }[]
  captions?: Record<string, string> | { platform?: string; text?: string }[]
  sizes?: string[]
  seriesRule?: string
  copy?: string | Record<string, string>
  [key: string]: unknown
}

export interface PlanAsset {
  words_stale?: boolean // the job or a fact its words used changed after they were written
  words_stale_why?: string[] // e.g. "the offer changed", "the job changed"
  phase: string
  channel: string
  name: string
  format?: string
  angle?: string
  why?: string
  ledger_type?: string | null
  ledger_tier?: string | null
  credits: number | null
  credits_source?: 'ledger' | 'pm' | 'no_rate'
  due_date?: string | null
  due_date_moved_from?: string | null
  launch_date?: string | null
  creative_brief?: CreativeBrief
  audience?: { locations?: string[]; age_range?: string; interests_or_keywords?: string[]; custom_audiences?: string[]; notes?: string }
  job_id?: string
  final_words?: FinalWords
}

export interface FinalWords {
  slides: { n: number; words: string }[]
  captions: { platform: string; text: string }[]
  ad: { primary_text: string; headline: string; description: string; cta: string } | null
  rsa: { headlines: string[]; descriptions: string[] } | null
  email: { subject: string; preheader: string; body: string } | null
  status: 'ready' | 'flagged'
  flags: { where: string; problem: string; fix: string; kind?: string; note?: string }[]
  set_by_pm?: string[]
  craft?: string[] // the copywriting skills that shaped these words
}

export interface KpiTarget {
  key: string
  phase: string
  kpi_key: string
  kpi_name: string
  unit?: string | null
  lower_is_better?: boolean
  made_by: string
  value: number | null
  basis: 'history' | 'account' | 'budget' | 'no_basis' | 'pm' | 'mia_estimate' | string
  confidence?: 'high' | 'medium' | 'low'
  reason?: string
  account_reference?: string | null
  suggested?: number | null // code's starting number for an empty target (the account's own figures)
  suggested_from?: string | null
  suggested_label?: string | null // the starting number as a PM reads it (1.60%, R4.20, 12,000)
  estimate_note?: string | null // a target that is Mia's estimate, accepted by the PM
  suggested_by?: 'mia' | string | null // the starting number is Mia's estimate (not the account's own)
  recheck?: string | null // what it was worked from changed (the money, or the dates)
  recheck_value?: number | null // Mia's working now, when the money moved
  added_by?: 'rules' | string // a measure Mia added so a phase's paid money is measured
  suggested_kind?: 'estimate' | 'rule_of_thumb' | null
  no_target?: boolean
  missed_twice?: string[]
}

export interface PlanPhase {
  phase: string
  objective?: string | null
  channels: string[]
  kpis: string[]
}

export interface PlanCheck {
  check: string
  ok: boolean
  detail: string
}

export interface CreditFit {
  status: 'fits' | 'over' | 'unknown'
  reason?: string
  total_planned?: number
  over?: string[]
  unknown_pool?: string[]
  estimated?: string[]
  outside_known_sprints?: number
  no_rate?: string[]
  sprints?: { label: string; start: string; end: string; free: number | null; planned: number; assets: number }[]
}

export interface Plan {
  framework: string
  built_on: string
  brief: Brief
  concept: {
    name: string
    big_idea?: string
    why_this_client_now?: string
    how_it_differs_from_recent_campaigns?: string
    evidence?: string[]
    risk?: string
  }
  phases: PlanPhase[]
  angles_to_test?: { angle?: string; hypothesis?: string; [k: string]: unknown }[]
  not_repeating?: { what?: string; why?: string; [k: string]: unknown }[] | string[]
  risks?: unknown[]
  assets: PlanAsset[]
  credits: CreditFit
  decisions: {
    playbook?: {
      slug: string
      name?: string
      blend_with?: string | null
      blend_name?: string | null
      confidence: 'high' | 'medium' | 'low'
      chosen_because: string
      made_by: 'pm' | 'claude'
    } | null
    kpi_targets: KpiTarget[]
    budget_split: {
      value: Record<string, number | null> | null
      basis?: string
      reason?: string
      made_by?: string
      by_channel?: Record<string, Record<string, number>>
      channels?: BudgetChannel[]
      pm_phases?: string[]
      history_sources?: string[]
      history_notes?: string[]
    }
    ask_pm: { id?: string; question: string; why?: string; [k: string]: unknown }[] | string[]
    notes_done?: string[] // self-check notes the PM marked Done
    not_carried?: string[] // the PM's edits a remade plan had no place for
    answered?: { question: string; about?: string; answer: string | null; assumed?: string; by?: string }[]
    jobs_confirmed?: boolean // the jobs and money are as the PM confirmed them
  }
  checks: PlanCheck[]
  review?: PlanReview
}

export interface ScorePart {
  score: number | null
  why?: string | null
  model_judgement?: boolean
}

export interface PlanReview {
  error?: string
  checked_at?: string // Mia's final check, run on the campaign as it stood then
  stale?: boolean // the plan changed after this check: its notes may no longer apply
  fact_check?: {
    numbers_checked: number
    numbers_supported: number
    share_supported: number | null
    unsupported: { where: string; numbers: string[] }[]
  }
  scorecard?: {
    overall: number | null
    grade: string | null
    thin_history: boolean
    parts: Record<string, ScorePart>
    best_past: { campaign: string; score: number; kpis_hit: number; kpis: number }[]
    strengths: string[]
    look_at: string[]
  }
}

export interface PackSource {
  source: string
  as_of?: string | null
  kind?: string
}

export interface WhatMiaRead {
  headline?: Record<string, unknown> | string[] | null
  layers?: Record<string, { sources: PackSource[]; caveats: string[] }>
}

export interface Blocker {
  what: string
  where: string
  key?: string
}

export interface BuildState {
  conversation_id: string
  campaign: {
    campaign_id: string
    name: string
    client: string
    status: string
    building: boolean
    start_date: string | null
    end_date: string | null
    budget_total: number | null
    currency: string
  }
  brief: {
    version: number
    made_by: string
    edited_by: string | null
    brief: Brief
    pm_text: string | null
    drafted?: string[] // fields Mia drafted from the PM's material that they haven't confirmed ("These are right")
    saved_at: string | null
  } | null
  brief_run: BuildRun | null
  plan_run: BuildRun | null
  words_run: BuildRun | null
  plan: Plan | null
  plan_from_older_brief: boolean
  // The workspace brand guide every step reads (Settings); null when none is saved (22 Oct)
  brand_guide?: { file?: string | null; uploaded?: string | null; edited_in_settings?: string[]; fields: number; has_words: boolean } | null
  what_mia_read: WhatMiaRead | null
  approved: { at: string | null; by: string | null } | null
  blockers: Blocker[]
  warnings: string[]
  pending?: { id: string; summary: string[]; at?: string }[] // changes the chat proposed, waiting for Apply
  decision_log?: { summary: string[]; outcome: string; by?: string; at?: string }[]
  next_step: { label: string; tab: 'brief' | 'plan' | 'studio' | 'launch' | 'results' }
}

export interface KpiOption {
  kpi_key: string
  name: string
  unit: string | null
  lower_is_better: boolean
  description: string | null
  needs_source: boolean
  last_result: { value: number; target: number | null; campaign: string; as_of: string | null } | null
  account_90d: number | null
}

export interface KpiGroup {
  family: string
  label: string
  kpis: KpiOption[]
}

export type PlanOp =
  | { op: 'set_target'; key: string; value: number | string | null; no_target?: boolean; estimate_note?: string }
  | { op: 'close_note'; text: string }
  | { op: 'confirm_jobs' }
  | { op: 'add_kpi'; phase: string; kpi_key: string }
  | { op: 'remove_kpi'; key: string }
  | { op: 'shift_dates'; days: number }
  | { op: 'update_words'; index: number; where: string; value: string }
  | { op: 'update_asset'; index: number; fields: Partial<Omit<PlanAsset, 'credits'>> & { credits?: number | string | null } }
  | { op: 'remove_asset'; index: number }
  | { op: 'set_budget'; phase: string; value: number | string | null }
  | { op: 'set_channel_budget'; phase: string; channel: string; value: number | string | null }
  | { op: 'accept_words'; index: number }
  | { op: 'answer_question'; id: string; answer: string | null }

// One paid channel's money inside a phase (A2): from the client's own history, a test share, or the PM's.
export interface BudgetChannel {
  phase: string
  channel: string
  amount: number
  share: number | null
  metric: 'cpm' | 'cpc' | 'cpa'
  metric_label: string
  metric_why: string
  rate: number | null
  basis: 'history' | 'account' | 'test' | 'no_basis' | 'pm'
  buys: { amount: number; unit: string } | null
  why: string
}

export interface StudioJob {
  asset_id: string
  name: string
  phase: string
  channel: string
  format: string | null
  ledger_type: string | null
  ledger_tier: string | null
  credits: number | null
  credits_source: string
  due_date: string | null
  launch_date: string | null
  sprint: string | null
  include: boolean
  setup_work: boolean
  credits_confirmed: boolean
  flex: {
    task_id?: string
    url?: string
    status?: string
    stage?: string
    stage_label?: string
    review_rounds?: { internal: number; client: number; pod_lead: number }
    sprint_name?: string
    sent_at?: string
  }
}

export interface StudioState {
  ready: boolean
  reason?: string
  flex_client_id?: number | null
  jobs: StudioJob[]
  credit_fit: { sprint: string; planned: number; free: number | null; over: boolean }[]
  to_send: number
  sent: number
  blockers: string[]
  sent_at?: string | null
  senders: string[]
  you: string | null
}

// The campaigns board (plan §8.1).
export interface BoardCampaign {
  campaign_id: string
  name: string
  status: string
  stage?: 'Brief' | 'Plan' | 'Approved' | 'In studio' | 'Live' | 'Paused' | 'Ended'
  progress?: string | null
  start_date: string | null
  end_date: string | null
  budget_total: number | null
  currency: string
  jobs?: number
  credits?: number | null
  blockers?: number
  next_step?: { label: string; tab: string } | null
  updated_at: string | null
}

export interface Board {
  campaigns: BoardCampaign[]
  older: BoardCampaign[]
}

// The Launch tab: jobs back from the studio and how each goes out.
export interface LaunchJob {
  asset_id: string
  action_id: string
  name: string
  phase: string
  channel: string
  route: 'meta' | 'google' | 'schedule' | 'manual'
  manual_where: string
  state: 'in_studio' | 'ready' | 'taken_in' | 'launched' | 'cancelled'
  stage_label?: string | null
  ready_at?: string | null
  artwork: { url: string; kind: string; title?: string }[]
  usable_artwork: string[]
  figma_only: boolean
  creative?: string | null
  final_url?: string | null
  launch_date?: string | null
  launch: { launched_at?: string; how?: string; link?: string | null; launched_by?: string }
  flex_url?: string | null
}

export interface LaunchState {
  campaign_status: string
  jobs: LaunchJob[]
  counts: Record<string, number>
  live: boolean
  approved: boolean
}

// The Results tab's frame (the actuals come from the campaign tracker).
export interface ResultsKpi {
  kpi_name: string
  kpi_key: string | null
  target: number | null
  basis?: string | null
  confidence?: string | null
  rate: boolean
  lower_is_better: boolean
}

export interface ResultsState {
  status: string
  live: boolean
  when: 'not_started' | 'running' | 'ended'
  start_date: string | null
  end_date: string | null
  days_total: number | null
  days_elapsed: number | null
  share_elapsed: number | null
  budget_total: number | null
  phases: { phase: string; budget: number | null; kpis: ResultsKpi[] }[]
  debrief: {
    headline?: string
    confidence?: string
    written_at?: string
    points: Record<string, { point: string; evidence: string }[]>
    data_gaps: string[]
  } | null
  can_debrief: boolean
}
