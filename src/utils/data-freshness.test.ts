import { describe, expect, it } from 'vitest'
import { formatShortAsOf, freshnessLabel, freshnessTitle } from './data-freshness'

describe('formatShortAsOf', () => {
  it('shortens ISO dates and passes junk through', () => {
    expect(formatShortAsOf('2026-09-12')).toBe('12 Sep')
    expect(formatShortAsOf('not-a-date')).toBe('not-a-date')
    expect(formatShortAsOf(null)).toBeNull()
    expect(formatShortAsOf(undefined)).toBeNull()
  })
})

describe('freshnessLabel', () => {
  it('adds the watermark to store figures only', () => {
    expect(freshnessLabel('store', '2026-09-12')).toBe('Store · to 12 Sep')
    expect(freshnessLabel('store', null)).toBe('Store')
    expect(freshnessLabel('live', '2026-09-12')).toBe('Live')
    expect(freshnessLabel('manual', '2026-09-12')).toBe('Manual')
  })

  it('says Partial when only notes exist, and nothing when there is nothing to say', () => {
    expect(freshnessLabel(null, null, ['Meta missing'])).toBe('Partial')
    expect(freshnessLabel(null, null, [])).toBeNull()
    expect(freshnessLabel(null)).toBeNull()
  })
})

describe('freshnessTitle', () => {
  it('lists the as-of line first, then every note', () => {
    expect(freshnessTitle(['a', 'b'], '2026-09-12')).toBe('Data complete through 12 Sep\na\nb')
    expect(freshnessTitle(['a'])).toBe('a')
    expect(freshnessTitle([], null)).toBeUndefined()
  })
})
