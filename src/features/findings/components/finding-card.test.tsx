// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FindingCardView } from '../types'
import { FindingCard } from './finding-card'

afterEach(cleanup)

const card = (overrides: Partial<FindingCardView> = {}): FindingCardView => ({
  id: 42,
  severity: 'critical',
  severityLabel: 'Critical',
  kindLabel: 'Anomaly',
  title: 'Meta spend up 40% week on week',
  detail: 'Spend rose from R10k to R14k while conversions stayed flat.',
  seenLabel: 'Seen 3 times · last seen 12 Sep',
  canAcknowledge: true,
  ...overrides,
})

describe('FindingCard', () => {
  it('paints the severity chip in the matching tone and shows kind, title and seen line', () => {
    render(<FindingCard finding={card()} />)
    expect(screen.getByText('Critical').getAttribute('data-tone')).toBe('error')
    expect(screen.getByText('Anomaly')).toBeTruthy()
    expect(screen.getByText('Meta spend up 40% week on week')).toBeTruthy()
    expect(screen.getByText('Seen 3 times · last seen 12 Sep')).toBeTruthy()
  })

  it('uses warning and info tones for the other severities', () => {
    render(<FindingCard finding={card({ severity: 'warning', severityLabel: 'Warning' })} />)
    expect(screen.getByText('Warning').getAttribute('data-tone')).toBe('warning')
    cleanup()
    render(<FindingCard finding={card({ severity: 'info', severityLabel: 'Info' })} />)
    expect(screen.getByText('Info').getAttribute('data-tone')).toBe('info')
  })

  it('reveals the detail on demand', () => {
    render(<FindingCard finding={card()} />)
    expect(screen.queryByText(/Spend rose from/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show detail' }))
    expect(screen.getByText(/Spend rose from/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hide detail' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('acknowledges with the finding id, and hides the button once acknowledged', () => {
    const onAcknowledge = vi.fn()
    render(<FindingCard finding={card()} onAcknowledge={onAcknowledge} />)
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }))
    expect(onAcknowledge).toHaveBeenCalledWith(42)
    cleanup()
    render(<FindingCard finding={card({ canAcknowledge: false })} onAcknowledge={onAcknowledge} />)
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull()
  })
})
