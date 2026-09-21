import { describe, expect, it } from 'vitest'
import type { Finding } from '../types'
import {
  EMPTY_LABEL,
  FILTERED_EMPTY_LABEL,
  buildFindingCard,
  emptyLabelFor,
  filterBySeverity,
  formatSeen,
  groupBySeverity,
} from './findings-view-model'

const finding = (overrides: Partial<Finding> = {}): Finding => ({
  finding_id: 1,
  tenant_id: 't1',
  campaign_id: null,
  kind: 'anomaly',
  severity: 'warning',
  title: 'Spend up 40% vs prior week',
  detail: 'Meta spend rose from R10k to R14k.',
  metric: 'spend',
  view: 'paid_media',
  dimensions: {},
  evidence: {},
  window_start: null,
  window_end: null,
  status: 'open',
  first_seen_at: '2026-09-10T02:00:00Z',
  last_seen_at: '2026-09-12',
  seen_count: 3,
  acknowledged_by: null,
  acknowledged_at: null,
  ...overrides,
})

describe('formatSeen', () => {
  it('pluralises and shortens the date', () => {
    expect(formatSeen(1, '2026-09-12')).toBe('Seen 1 time · last seen 12 Sep')
    expect(formatSeen(3, '2026-09-12')).toBe('Seen 3 times · last seen 12 Sep')
  })
})

describe('buildFindingCard', () => {
  it('labels severity and kind and only lets open findings be acknowledged', () => {
    const card = buildFindingCard(finding({ kind: 'kpi_pacing', severity: 'critical' }))
    expect(card.severityLabel).toBe('Critical')
    expect(card.kindLabel).toBe('KPI pacing')
    expect(card.canAcknowledge).toBe(true)
    expect(buildFindingCard(finding({ status: 'acknowledged' })).canAcknowledge).toBe(false)
  })
})

describe('filterBySeverity + groupBySeverity', () => {
  const findings = [
    finding({ finding_id: 1, severity: 'info' }),
    finding({ finding_id: 2, severity: 'critical' }),
    finding({ finding_id: 3, severity: 'warning' }),
    finding({ finding_id: 4, severity: 'warning' }),
  ]

  it('keeps warnings only for the Warnings segment', () => {
    expect(filterBySeverity(findings, 'warning').map((f) => f.finding_id)).toEqual([3, 4])
    expect(filterBySeverity(findings, 'all')).toHaveLength(4)
  })

  it('groups critical → warning → info and drops empty groups', () => {
    const groups = groupBySeverity(findings.map(buildFindingCard))
    expect(groups.map((g) => g.severity)).toEqual(['critical', 'warning', 'info'])
    expect(groups[1].items.map((c) => c.id)).toEqual([3, 4])
    expect(groupBySeverity([buildFindingCard(findings[0])]).map((g) => g.severity)).toEqual(['info'])
  })
})

describe('emptyLabelFor', () => {
  it('distinguishes nothing found from nothing matching', () => {
    expect(emptyLabelFor(0, 0)).toBe(EMPTY_LABEL)
    expect(emptyLabelFor(4, 0)).toBe(FILTERED_EMPTY_LABEL)
    expect(emptyLabelFor(4, 2)).toBeNull()
  })
})
