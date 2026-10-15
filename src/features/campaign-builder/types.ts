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
  channels_requested?: string[]
  must_haves?: string[]
  constraints?: string[]
  pm_words?: PmWords[]
  open_questions?: { question: string; why_it_matters: string }[]
  dates_proposed_by_mia?: boolean
  set_by_pm?: string[]
}

export type BriefField =
  | 'goal'
  | 'audience'
  | 'start_date'
  | 'end_date'
  | 'budget_total'
  | 'channels_requested'
  | 'must_haves'
  | 'constraints'

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
  flags: { where: string; problem: string; fix: string }[]
  set_by_pm?: string[]
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
  basis: 'history' | 'no_basis' | 'pm' | string
  reason?: string
  account_reference?: string | null
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
    kpi_targets: KpiTarget[]
    budget_split: { value: Record<string, number | null> | null; basis?: string; reason?: string }
    ask_pm: { question: string; why?: string; [k: string]: unknown }[] | string[]
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
    saved_at: string | null
  } | null
  brief_run: BuildRun | null
  plan_run: BuildRun | null
  words_run: BuildRun | null
  plan: Plan | null
  plan_from_older_brief: boolean
  what_mia_read: WhatMiaRead | null
  approved: { at: string | null; by: string | null } | null
  blockers: Blocker[]
  next_step: { label: string; tab: 'brief' | 'plan' }
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
  | { op: 'set_target'; key: string; value: number | null; no_target?: boolean }
  | { op: 'add_kpi'; phase: string; kpi_key: string }
  | { op: 'remove_kpi'; key: string }
  | { op: 'shift_dates'; days: number }
  | { op: 'update_words'; index: number; where: string; value: string }
  | { op: 'update_asset'; index: number; fields: Partial<PlanAsset> }
  | { op: 'remove_asset'; index: number }
  | { op: 'set_budget'; phase: string; value: number | null }
