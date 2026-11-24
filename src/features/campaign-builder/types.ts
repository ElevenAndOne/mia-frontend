// The new campaign page (rebuild slice 3). Shapes mirror the backend's
// services/campaign_builder/build_service.py state() and plan_generator.py.

export type RunStatus = 'running' | 'done' | 'failed'

export interface BuildRun {
  run_id: string
  status: RunStatus
  stage: string | null
  stage_label: string | null
  stage_at?: number | null // this stage's place in the run ("3 of 7"), for the progress bar
  stage_of?: number | null
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
  measurement?: string[] // how results are counted: tracking events, pixels, what counts as an entry
  pm_words?: PmWords[]
  open_questions?: {
    id: string
    question: string
    why_it_matters: string
    impact?: string
    // Mia read the last answer as about something else and asks again (build_service.check_brief_answers)
    unclear?: { answer: string; why: string; kind?: 'not_an_answer' | 'unclear' }
  }[]
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
  | 'measurement'

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
  writing?: boolean // the running words run is writing this job (read only while words_run is running)
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
  doubted?: number // a past result Mia put aside as far off the working rate (estimates._doubt_history)
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
  read_from?: string[] // where the tracker reads it in this phase, in plain words (Meta ads, Google Analytics (GA4))
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
  setup_not_counted?: number
  no_rate?: string[]
  sprints?: { label: string; start: string; end: string; free: number | null; planned: number; assets: number }[]
}

export interface Plan {
  framework: string
  built_on?: string
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
  // a campaign made in the old builder and moved here (scripts/convert_to_builder.py, 3 Nov): its jobs were made in
  // ClickUp, so the page says that instead of "send the jobs" and "words not written"
  moved_from_old_builder?: { at: string; jobs: number; to_flex?: number }
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
    // channels and jobs Mia left out to keep to the channels the PM named: shown in "How Mia got here" (E30)
    left_out?: { phase?: string; channel?: string; job?: string; phase_dropped?: boolean }[]
  }
  checks?: PlanCheck[] // none on a campaign moved from the old builder
  // her claims about the client she corrected against their data before the PM saw the plan (claim_check, 24 Nov)
  claim_fixes?: { where: string; was: string; now: string; why: string }[]
  claim_check_error?: string | null
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
  jobs_changed?: boolean // a job itself changed after this check (what "Found before your latest change" means on a note)
  // The close reading (26 Oct): every job's brief and words against what was decided, and the PM's chat messages
  audit?: {
    error?: string
    jobs?: { job: string; job_id?: string; where: string; decision: string; how: string }[]
    chat?: { said: string; missing: string }[]
  }
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
    // ideas for later (a channel the PM left out...): read here only, never a Your turn item (retest 24 Nov, E29)
    worth_asking?: string[]
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
    // the campaign the home tracker shows (is_primary)
    on_home?: boolean
    start_date: string | null
    end_date: string | null
    budget_total: number | null
    currency: string
    // 'bpo': a BPO client's campaign, no KPIs or ad budget (19 Nov 2026)
    client_type?: 'campaign' | 'bpo'
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
  // The Brand Kit (Settings → Brand Kit: colours, fonts, logo), read by every step and sent to Flex (3 Nov)
  brand_look?: { colours: number; fonts: boolean; logo: boolean; guide_file?: string | null } | null
  // Words the brand guide rules out: any job's words that use one go back to the writer (3 Nov)
  brand_never_use?: string[]
  what_mia_read: WhatMiaRead | null
  approved: { at: string | null; by: string | null } | null
  blockers: Blocker[]
  warnings: string[]
  // changes the chat proposed, waiting for Apply; `about`: the page item it was asked from (its Ask Mia label)
  pending?: { id: string; summary: string[]; at?: string; about?: string }[]
  decision_log?: { summary: string[]; outcome: string; by?: string; at?: string }[]
  checking?: boolean // Mia's final check will really run now (build_service.state: settled, nothing to write first)
  check_pending?: boolean // a check is waiting (it may write changed words first, or do nothing yet): the page polls on it
  auto_words?: boolean // jobs Mia writes or rewrites by herself on her next check (build_service.auto_words_todo)
  // What the last answer changed in the plan, while it can still be undone exactly (build_service.answer_undo_view)
  answer_undo?: { id: string; label: string } | null
  // Mia's lines about recent answers (also saved in the chat's history), and how many answers she's still applying
  answer_notes?: { nid: string; id: string; text: string; at: string }[]
  reading_answers?: number
  // findings (their page labels) Mia is writing a fix for, and why a fix couldn't be made (build_service.start_fix_finding)
  fixing?: string[]
  fix_errors?: Record<string, string>
  // the jobs over a sprint's free credits, and which case: Flex's estimate (no seats entered) or real capacity (24 Nov)
  credits_over?: string | null
  shared_drive_set?: boolean | null // the workspace has a Shared Drive (needed before the jobs go to Flex, E17)
  // jobs due sooner than the studio can make them from today, or that can't be ready in the campaign (read live)
  studio_time?: { too_soon: string[]; too_late: string[] } | null
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
  // job_id names the job (review 26 Oct: by place alone, two quick removes could hit the wrong one); index is the fallback
  | { op: 'update_words'; index: number; job_id?: string; where: string; value: string }
  | { op: 'update_asset'; index: number; job_id?: string; fields: Partial<Omit<PlanAsset, 'credits'>> & { credits?: number | string | null } }
  | { op: 'remove_asset'; index: number; job_id?: string }
  | { op: 'set_budget'; phase: string; value: number | string | null }
  | { op: 'set_channel_budget'; phase: string; channel: string; value: number | string | null }
  | { op: 'accept_words'; index: number; job_id?: string }
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

// Every name a job carries under the agreed scheme (naming + tracking step 1, 20 Nov), and its link's tags as a query
export interface JobNames {
  campaign: string
  ad_set: string
  ad: string
  files: string[]
  tags: string
}

export interface StudioJob {
  asset_id: string
  name: string
  job_no?: string | null // Mia's job number, e.g. OAO-07 (step 7, 16 Nov)
  job_id?: string | null // the Job ID on every name and link, e.g. MK7Q2X (20 Nov)
  names?: JobNames | null
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
  // made in ClickUp and never sent to Flex (a ClickUp task added to the campaign, or work from before it moved from
  // the old builder): listed apart, never offered for sending
  // state: the nightly check found the task still there, archived or deleted in ClickUp
  // what ClickUp says now (read every 15 minutes, services/campaign_builder/clickup_sync.py): its status, and when it closed
  clickup?: {
    task_id: string
    url: string
    state?: 'ok' | 'archived' | 'deleted' | null
    checked_at?: string | null
    clickup_status?: string | null
    done_at?: string | null
  } | null
  kept_out?: string | null // made outside Flex, and why (e.g. launched before the campaign moved)
  // sent to Flex, which hasn't linked it to its ClickUp task yet (tried again on every Flex read): the reason, if any
  clickup_not_linked?: string | null
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
  // changes asked of the studio for a job in Flex (its lead accepts or declines; 17 Nov), the last five
  change_requests?: StudioChangeRequest[]
  // its Drive folder and what's in its _Delivery as last read (naming step 4, 20 Nov); null until its folder is made
  delivery?: StudioDelivery | null
  // not sent yet: who in the client's pod Mia suggests (skills that fit, most room in its sprint; 24 Nov). The studio
  // assigns in Flex; null when Flex didn't say who is free or the job has no due date in a known sprint
  maker?: StudioMaker | null
}

export interface StudioMaker {
  name: string
  email: string
  skill: string // the skill the job needs: design, video, animation, web_design, illustration, print
  sprint: string
  free_after: number // the person's free credits in that sprint once this job (and the ones placed before it) count
  has_skill: boolean // false: no one in the pod has the skill, so the person with most room
  over: boolean // no one has room: they'd be overbooked
}

// Who is free in the client's pod per sprint (Flex's team plan: working days less days off, less work booked; 24 Nov)
export interface StudioTeam {
  pod: string | null
  creative_lead_email: string | null
  sprints: { label: string; free: number; overbooked: string[]; people: { name: string; free: number; speciality: string | null }[] }[]
  fit: {
    status: 'fits' | 'over' | 'unknown'
    over?: string[]
    sprints: { sprint: string; planned: number; pod_free: number }[]
    outside_credits?: number // due outside the sprints Flex described (a failed read, a long window): not counted
    outside_jobs?: number
  }
}

// sizes are ratio tokens ("4x5", "9x16"); need/have/missing are counts per size
export interface StudioDelivery {
  folder_url: string
  delivery_url: string | null
  have: Record<string, number>
  need: Record<string, number>
  missing: Record<string, number>
  complete: boolean
  files: number
  taken_at: string | null
  waiting_for: string | null // complete, but held: e.g. no landing page in the brief
  checked_at: string | null
}

// The campaign's Drive folders on the client's Shared Drive (naming step 4, 20 Nov)
export interface StudioDrive {
  shared_drive: boolean // the workspace has a Shared Drive set in Settings
  root_url: string | null
  made_at: string | null
  error: string | null
  checked_at: string | null
  unplaced: { id: string; name: string; ratio: string | null }[] // files in _Delivery with no Job ID Mia can match
  unplaced_total?: number // how many there are: only the first 20 names are kept
  making: boolean
  test_folder?: string | null // "_Mia test" when this campaign's folders go there instead of its year
}

export interface StudioChangeRequest {
  mia_request_id: string
  field: 'name' | 'due_date' | 'launch_date' | 'credits'
  label: string
  old: string | number | null
  new: string | number | null
  status: 'to_send' | 'open' | 'to_withdraw' | 'accepted' | 'declined' | 'withdrawn' | 'refused'
  asked_by?: string | null
  asked_at?: string | null
  decided_by?: string | null
  decided_at?: string | null
  note?: string | null
  error?: string | null
}

// An idea the studio sent Mia from the outline in Flex (17 Nov)
export interface StudioIdea {
  id: number | string
  body: string
  by_name?: string | null
  by_email?: string | null
  mia_item_id?: string | null
  about?: string | null // the job (or later-wave item) it was sent from
  created_at?: string | null
  status: 'new' | 'asked' | 'set_aside'
}

export interface StudioState {
  ready: boolean
  job_code?: { code: string | null; locked: boolean } // the campaign's code; locked once an ad carries it
  reason?: string
  flex_client_id?: number | null
  jobs: StudioJob[]
  credit_fit: { sprint: string; planned: number; free: number | null; over: boolean }[]
  team?: StudioTeam | null // who is free in the client's pod; null when unlinked or Flex didn't say (24 Nov)
  to_send: number
  sent: number
  blockers: string[]
  sent_at?: string | null
  senders: string[]
  you: string | null
  flex_down?: boolean // Flex didn't answer: said as that, never as "nobody can send" (review 22 Oct, 4.5)
  // whether Flex has the whole plan as it is now (the outline, 17 Nov)
  outline?: { version: number | null; sent_version: number | null; sent_at: string | null; current: boolean; error: string | null }
  ideas?: { new: number; items: StudioIdea[]; set_aside: number; set_aside_items?: StudioIdea[] }
  drive?: StudioDrive
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
  job_no?: string | null
  job_id?: string | null
  names?: JobNames | null
  // the ad's words as the push uses them; typed on the card when missing (23 Nov)
  words?: { headline: string | null; text: string | null } | null
  phase: string
  channel: string
  // elsewhere: a job worked outside Flex (in ClickUp, or made before the campaign moved), marked live by hand (18 Nov)
  route: 'meta' | 'google' | 'schedule' | 'manual' | 'elsewhere'
  manual_where: string
  state: 'in_studio' | 'ready' | 'taken_in' | 'launched' | 'cancelled' | 'elsewhere'
  stage_label?: string | null
  ready_at?: string | null
  // measured: each file's size and the placement it fits, read once when it came back from Flex (step 8, 16 Nov)
  artwork: { url: string; kind: string; title?: string; measured?: boolean; why?: string; width?: number; height?: number; ratio?: string; fits?: string }[]
  usable_artwork: string[]
  no_file?: boolean // done in Flex, but no file to use came back: the PM pastes its link (step 9, 16 Nov)
  search?: boolean // a Google Search job: words only, never asked for a file (browser pass 16 Nov)
  figma_only: boolean
  creative?: string | null
  final_url?: string | null
  launch_date?: string | null
  // unsure: posts Mia couldn't confirm Facebook or Instagram took (the PM checks the Page, review 26 Oct)
  launch: { launched_at?: string; how?: string; link?: string | null; launched_by?: string; unsure?: string[]; link_note?: string }
  flex_url?: string | null
  clickup_url?: string | null // a job worked in ClickUp: its task
}

export interface LaunchState {
  campaign_status: string
  jobs: LaunchJob[]
  counts: Record<string, number>
  live: boolean
  approved: boolean
  tag?: string | null // the campaign's tag: in every link Mia tracks, and what results read (26 Oct)
}

// The Results tab's frame (the actuals come from the campaign tracker).
export interface ResultsKpi {
  kpi_name: string
  kpi_key: string | null
  target: number | null
  basis?: string | null
  confidence?: string | null
  // set or changed after approve through Mia's targets card, oldest first; each keeps the number it replaced
  history?: { old: number | null; new: number; why?: string | null; at?: string | null }[]
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
  currency?: string // the campaign's (review 2 Nov: results always said R)
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
