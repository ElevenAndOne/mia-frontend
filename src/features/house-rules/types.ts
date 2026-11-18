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
