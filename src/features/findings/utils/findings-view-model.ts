// Pure transforms from /findings payloads into what the cards and filters render.
// All labels and date formatting happen here, not in JSX.

import { format, parseISO } from 'date-fns'
import type {
  Finding,
  FindingCardView,
  FindingKind,
  FindingSeverity,
  FindingsGroup,
  SeverityFilter,
  SeverityFilterOption,
  StatusFilterOption,
} from '../types'

export const SEVERITY_ORDER: FindingSeverity[] = ['critical', 'warning', 'info']

export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
}

export const KIND_LABELS: Record<FindingKind, string> = {
  anomaly: 'Anomaly',
  trend: 'Trend',
  pacing: 'Pacing',
  kpi_pacing: 'KPI pacing',
  budget_mix: 'Budget mix',
  completeness: 'Completeness',
  reconciliation: 'Reconciliation',
}

export const SEVERITY_FILTER_OPTIONS: SeverityFilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warnings' },
]

export const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'acknowledged', label: 'Acknowledged' },
]

export const EMPTY_LABEL = 'Nothing unusual since the last run'
export const FILTERED_EMPTY_LABEL = 'No findings match this filter'

/** "2026-09-12T02:00:00Z" → "12 Sep"; unparseable input is returned as-is. */
const formatSeenDate = (iso: string): string => {
  const parsed = parseISO(iso)
  return Number.isNaN(parsed.getTime()) ? iso : format(parsed, 'd MMM')
}

export const formatSeen = (count: number, lastSeenAt: string): string =>
  `Seen ${count} ${count === 1 ? 'time' : 'times'} · last seen ${formatSeenDate(lastSeenAt)}`

export const buildFindingCard = (finding: Finding): FindingCardView => ({
  id: finding.finding_id,
  severity: finding.severity,
  severityLabel: SEVERITY_LABELS[finding.severity] ?? finding.severity,
  kindLabel: KIND_LABELS[finding.kind] ?? finding.kind,
  title: finding.title,
  detail: finding.detail,
  seenLabel: formatSeen(finding.seen_count, finding.last_seen_at),
  canAcknowledge: finding.status === 'open',
})

/** "Warnings" means warnings only — critical has its own segment. */
export const filterBySeverity = (findings: Finding[], filter: SeverityFilter): Finding[] =>
  filter === 'all' ? findings : findings.filter((finding) => finding.severity === filter)

/** Groups in display order, skipping severities with nothing in them. */
export const groupBySeverity = (cards: FindingCardView[]): FindingsGroup[] =>
  SEVERITY_ORDER.map((severity) => ({
    severity,
    label: SEVERITY_LABELS[severity],
    items: cards.filter((card) => card.severity === severity),
  })).filter((group) => group.items.length > 0)

/** The line shown instead of cards: nothing found vs. nothing matching the filter. */
export const emptyLabelFor = (total: number, shown: number): string | null => {
  if (shown > 0) return null
  return total === 0 ? EMPTY_LABEL : FILTERED_EMPTY_LABEL
}
