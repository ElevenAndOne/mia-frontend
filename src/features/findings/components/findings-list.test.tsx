// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { FindingCardView, FindingsGroup } from '../types'
import { FindingsList } from './findings-list'

afterEach(cleanup)

const card = (id: number, severity: FindingCardView['severity']): FindingCardView => ({
  id,
  severity,
  severityLabel: severity,
  kindLabel: 'Trend',
  title: `Finding ${id}`,
  detail: '',
  seenLabel: 'Seen 1 time · last seen 12 Sep',
  canAcknowledge: true,
})

const groups: FindingsGroup[] = [
  { severity: 'critical', label: 'Critical', items: [card(1, 'critical')] },
  { severity: 'warning', label: 'Warning', items: [card(2, 'warning'), card(3, 'warning')] },
]

describe('FindingsList', () => {
  it('renders one headed section per severity group with its count, in order', () => {
    render(<FindingsList groups={groups} />)
    const sections = screen.getAllByRole('region')
    expect(sections.map((s) => s.getAttribute('aria-label'))).toEqual(['Critical', 'Warning'])
    expect(screen.getByText('Critical · 1')).toBeTruthy()
    expect(screen.getByText('Warning · 2')).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('drops the group headings in dense mode but keeps the cards', () => {
    render(<FindingsList groups={groups} dense />)
    expect(screen.queryByText('Critical · 1')).toBeNull()
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('shows the empty label when there is nothing to list, and nothing without one', () => {
    render(<FindingsList groups={[]} emptyLabel="Nothing unusual since the last run" />)
    expect(screen.getByText('Nothing unusual since the last run')).toBeTruthy()
    cleanup()
    const { container } = render(<FindingsList groups={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
