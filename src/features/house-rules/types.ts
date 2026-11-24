// The agency's house rules (mia-backend services/house_rules.py): the slop list and, later, platform facts.

export type RuleKind = 'slop' | 'platform_fact'
export type RuleStatus = 'proposed' | 'active' | 'rejected' | 'retired'
export type Decision = 'approve' | 'reject' | 'retire'

export interface HouseRule {
  id: string
  kind: RuleKind
  group: string
  platform: string | null
  /** The rule as a person reads it ('"Unpopular opinion:"', or a described shape for a phrase-less rule). */
  text: string
  /** The words the code matches; null for a pattern only a reader can spot. */
  phrase: string | null
  position: 'opener' | 'ask' | 'anywhere'
  applies_to: 'all' | 'social'
  source: string
  source_ref: string | null
  confidence: 'official' | 'tested' | 'claimed' | null
  status: RuleStatus
  proposed_by: string | null
  decided_by: string | null
  decided_at: string | null
  decision_note: string | null
  last_checked: string | null
  created_at: string | null
}

export interface RuleList {
  count: number
  rules: HouseRule[]
}

export interface CheckHit {
  id: string | null
  phrase: string
  text: string
  found: string
  position: string
  status: 'live' | 'waiting'
  /** [start, end) in the text sent, or null when it couldn't be placed. */
  span: [number, number] | null
}

export interface CheckResult {
  hits: CheckHit[]
  /** Live rules with no words to match (a post's shape): Mia's writers read them, this check can't. */
  unchecked: number
}

export interface Me {
  email: string | null
  name: string | null
}

// ── What's changing (mia-backend services/platform_watch.py + platform_benchmarks.py) ──────────────────────────────

export type Tab = 'slop' | 'changes' | 'platform_fact'
export type NewsStatus = 'new' | 'kept' | 'ignored' | 'made_rule'
export type NewsDecision = 'keep' | 'ignore' | 'make_rule'
export type JobName = 'platform_news' | 'platform_benchmarks' | 'slop_finder' | 'house_rules_digest'

export interface NewsStep {
  /** pm: the agency's people, for their clients; mia_team: the people who build Mia. */
  who: 'pm' | 'mia_team'
  text: string
  /** client_note: Mia can keep this in mind for every client it touches; rule: Mia can follow it from now on. */
  mia: 'client_note' | 'rule' | null
  /** The tool's own front door (never a link the AI made up). */
  tool: { label: string; url: string } | null
}

export interface ClientNotesDone {
  count: number
  by: string | null
  at: string | null
  /** The last day the notes stand (YYYY-MM-DD); they are taken out the morning after. */
  until: string | null
  taken_back: boolean
  /** Taken out because the end date passed, not by a person. */
  expired: boolean
}

export interface NewsCard {
  id: string
  steps: NewsStep[]
  /** What Mia would keep in each affected client's notes. */
  client_note: string | null
  /** The last day that note applies, when the news gives one (YYYY-MM-DD). */
  note_until: string | null
  /** Clients this could touch: those with the card's platform connected. */
  clients: string[]
  clients_basis: string | null
  client_notes: ClientNotesDone | null
  /** What Mia did for this card without being asked: 'note', 'rule', or 'info' (filed it: nothing to do). Empty
   * when a person did, or nobody has. A card she did her part on but that has work for the Mia team stays 'new'. */
  mia_did?: Array<'note' | 'rule' | 'info'>
  /** news: from a platform's own feed or the trade press; trend: a move across our own clients. */
  kind: 'news' | 'trend'
  platform: string | null
  importance: 'high' | 'medium' | 'low' | null
  headline: string | null
  summary: string | null
  why: string | null
  action: string | null
  /** A lasting rule the item suggests, prefilled when "Make it a rule" opens. */
  rule_text: string | null
  source_name: string | null
  source_url: string | null
  title: string | null
  published_at: string | null
  found_at: string | null
  status: NewsStatus
  decided_by: string | null
  decided_at: string | null
  rule_id: string | null
}

export interface JobInfo {
  job: JobName
  last_run_at: string | null
  last_ok_at: string | null
  running: boolean
  last_result: Record<string, unknown> | null
}

export interface NewsList {
  cards: NewsCard[]
  jobs: Record<JobName, JobInfo>
}

export interface NewsDecisionResult {
  news: NewsCard
  rule: HouseRule | null
}

export interface BenchmarkClient {
  name: string
  /** 0.18 = up 18% against that client's four weeks before. */
  change: number
  now: number
  before: number
}

export interface BenchmarkRow {
  platform: 'meta' | 'google'
  metric: 'cpm' | 'cpc' | 'ctr'
  label: string
  clients: number
  up: number
  down: number
  median_change: number | null
  /** Click rate up is good news; costs up are not. */
  good_when_up: boolean
  detail: BenchmarkClient[]
}

export interface BenchmarkWeek {
  week_start: string
  week_end: string
  rows: BenchmarkRow[]
}

export interface Benchmarks {
  weeks: BenchmarkWeek[]
}
