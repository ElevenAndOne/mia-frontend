// Types mirroring mia-backend routes/findings.py — what the nightly analysis over
// the semantic layer found. The list endpoint answers 200 with `available: false`
// when the workspace has no semantic layer yet; callers treat that as "quiet".

import type { SegmentedControlOption } from '../../components/segmented-control'

export type FindingKind =
  | 'anomaly'
  | 'trend'
  | 'pacing'
  | 'kpi_pacing'
  | 'budget_mix'
  | 'completeness'
  | 'reconciliation'

export type FindingSeverity = 'info' | 'warning' | 'critical'
export type FindingStatus = 'open' | 'acknowledged' | 'resolved'
/** `active` = open + acknowledged (everything not yet resolved). */
export type FindingsStatusParam = 'active' | FindingStatus

export interface Finding {
  finding_id: number
  tenant_id: string
  campaign_id: string | null
  kind: FindingKind
  severity: FindingSeverity
  /** One sentence carrying the numbers. */
  title: string
  /** One to three sentences of context. */
  detail: string
  metric: string | null
  view: string | null
  dimensions: Record<string, string>
  evidence: Record<string, unknown>
  window_start: string | null
  window_end: string | null
  status: FindingStatus
  first_seen_at: string
  last_seen_at: string
  seen_count: number
  acknowledged_by: string | null
  acknowledged_at: string | null
}

export interface FindingsUnavailable {
  available: false
  reason?: string
}

export interface FindingsData {
  available: true
  status: string
  count: number
  /** Sorted critical → warning → info, newest first. */
  findings: Finding[]
}

export type FindingsResponse = FindingsUnavailable | FindingsData

export interface FindingsListParams {
  status?: FindingsStatusParam
  campaign_id?: string
  kind?: FindingKind[]
  min_severity?: FindingSeverity
  limit?: number
}

export interface AcknowledgeFindingResponse {
  ok: true
  finding_id: number
  status: 'acknowledged'
}

export interface RunFindingsResponse {
  available: boolean
  run_id?: string
  findings?: number
  by_kind?: Record<string, number>
  new?: number
  refreshed?: number
  resolved?: number
}

// ── View models (what the presentational components receive) ───────────────

export type SeverityFilter = 'all' | 'critical' | 'warning'
export type StatusFilter = 'active' | 'acknowledged'

export type SeverityFilterOption = SegmentedControlOption<SeverityFilter>
export type StatusFilterOption = SegmentedControlOption<StatusFilter>

export interface FindingCardView {
  id: number
  severity: FindingSeverity
  severityLabel: string
  kindLabel: string
  title: string
  detail: string
  /** Pre-formatted "Seen 3 times · last seen 12 Sep". */
  seenLabel: string
  /** Only open findings can be acknowledged. */
  canAcknowledge: boolean
}

export interface FindingsGroup {
  severity: FindingSeverity
  label: string
  items: FindingCardView[]
}
