// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DataFreshnessBadge } from './data-freshness-badge'

afterEach(cleanup)

describe('DataFreshnessBadge', () => {
  it('labels store figures with their watermark', () => {
    render(<DataFreshnessBadge source="store" asOf="2026-09-12" />)
    const pill = screen.getByText('Store · to 12 Sep')
    expect(pill.getAttribute('data-tone')).toBe('neutral')
    expect(pill.getAttribute('title')).toBe('Data complete through 12 Sep')
  })

  it('labels live and manual figures plainly', () => {
    render(<DataFreshnessBadge source="live" />)
    expect(screen.getByText('Live')).toBeTruthy()
    cleanup()
    render(<DataFreshnessBadge source="manual" asOf="2026-09-12" />)
    expect(screen.getByText('Manual')).toBeTruthy()
  })

  it('turns amber and lists the notes when the figure is partial', () => {
    render(
      <DataFreshnessBadge source="store" asOf="2026-09-12" notes={['Meta: no data', 'FX unconverted']} />
    )
    const pill = screen.getByText('Store · to 12 Sep')
    expect(pill.getAttribute('data-tone')).toBe('warning')
    expect(pill.getAttribute('title')).toBe('Data complete through 12 Sep\nMeta: no data\nFX unconverted')
  })

  it('says Partial when only notes are known, and renders nothing when nothing is', () => {
    render(<DataFreshnessBadge source={null} notes={['Google Ads missing']} />)
    expect(screen.getByText('Partial').getAttribute('data-tone')).toBe('warning')
    cleanup()
    const { container } = render(<DataFreshnessBadge source={null} />)
    expect(container.innerHTML).toBe('')
  })
})
