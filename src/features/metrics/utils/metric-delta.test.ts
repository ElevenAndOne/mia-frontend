import { describe, expect, it } from 'vitest'
import { buildDelta, computeDelta, deltaTone, formatDeltaLabel } from './metric-delta'

describe('computeDelta', () => {
  it('returns the percent change and direction', () => {
    expect(computeDelta(120, 100)).toEqual({ changePct: 20, direction: 'up' })
    expect(computeDelta(80, 100)).toEqual({ changePct: -20, direction: 'down' })
  })

  it('is undefined when either side is missing or previous is zero', () => {
    expect(computeDelta(null, 100).changePct).toBeNull()
    expect(computeDelta(100, null).changePct).toBeNull()
    expect(computeDelta(100, 0).changePct).toBeNull()
  })

  it('treats negligible movement as flat', () => {
    expect(computeDelta(100.001, 100).direction).toBe('flat')
  })
})

describe('deltaTone', () => {
  it('colours a rise good unless lower is better', () => {
    expect(deltaTone('up', false)).toBe('good')
    expect(deltaTone('up', true)).toBe('bad')
    expect(deltaTone('down', false)).toBe('bad')
    expect(deltaTone('down', true)).toBe('good')
    expect(deltaTone('flat', true)).toBe('neutral')
  })
})

describe('formatDeltaLabel', () => {
  it('shows magnitude only, with one decimal under 10%', () => {
    expect(formatDeltaLabel(3.456)).toBe('3.5%')
    expect(formatDeltaLabel(-27.8)).toBe('28%')
    expect(formatDeltaLabel(null)).toBe('—')
  })
})

describe('buildDelta', () => {
  it('flips the tone for cost metrics', () => {
    expect(buildDelta('cost_per_conversion', 8, 10)).toEqual({
      label: '20%',
      direction: 'down',
      tone: 'good',
    })
    expect(buildDelta('cpc', 12, 10)?.tone).toBe('bad')
    expect(buildDelta('clicks', 12, 10)?.tone).toBe('good')
  })

  it('returns null when the delta cannot be computed', () => {
    expect(buildDelta('spend', 100, null)).toBeNull()
  })
})
