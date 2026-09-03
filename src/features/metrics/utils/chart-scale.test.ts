import { describe, expect, it } from 'vitest'
import {
  linePath,
  linearScale,
  niceStep,
  niceTicks,
  thinIndices,
  valuesExtent,
  xPositions,
} from './chart-scale'

describe('niceStep', () => {
  it('rounds raw steps up to 1 / 2 / 2.5 / 5 / 10 multiples', () => {
    expect(niceStep(0.7)).toBe(1)
    expect(niceStep(1.4)).toBe(2)
    expect(niceStep(2.2)).toBe(2.5)
    expect(niceStep(3.9)).toBe(5)
    expect(niceStep(7)).toBe(10)
    expect(niceStep(1234)).toBe(2000)
  })

  it('falls back to 1 for non-positive or non-finite input', () => {
    expect(niceStep(0)).toBe(1)
    expect(niceStep(-3)).toBe(1)
    expect(niceStep(Number.NaN)).toBe(1)
  })
})

describe('niceTicks', () => {
  it('covers the extent with round values starting at 0 for positive data', () => {
    const ticks = niceTicks(0, 8700, 4)
    expect(ticks[0]).toBe(0)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(8700)
    expect(ticks).toEqual([0, 2500, 5000, 7500, 10000])
  })

  it('handles a degenerate extent without producing a single tick', () => {
    expect(niceTicks(5, 5).length).toBeGreaterThanOrEqual(2)
    expect(niceTicks(Number.NaN, Number.NaN).length).toBeGreaterThanOrEqual(2)
  })

  it('does not accumulate floating point noise on fractional steps', () => {
    expect(niceTicks(0, 1.2, 4)).toEqual([0, 0.5, 1, 1.5])
    // 0 + 0.2 + 0.2 + 0.2 is 0.6000000000000001 in floating point; ticks must be clean.
    expect(niceTicks(0, 0.7, 4)).toEqual([0, 0.2, 0.4, 0.6, 0.8])
  })
})

describe('linearScale', () => {
  it('maps domain to range linearly and flips when range is inverted', () => {
    const y = linearScale(0, 100, 200, 0)
    expect(y(0)).toBe(200)
    expect(y(50)).toBe(100)
    expect(y(100)).toBe(0)
  })

  it('maps a degenerate domain to the range midpoint', () => {
    expect(linearScale(3, 3, 0, 10)(3)).toBe(5)
  })
})

describe('xPositions', () => {
  it('spaces points evenly across the plot and centres a lone point', () => {
    expect(xPositions(3, 0, 100)).toEqual([0, 50, 100])
    expect(xPositions(1, 0, 100)).toEqual([50])
    expect(xPositions(0, 0, 100)).toEqual([])
  })
})

describe('valuesExtent', () => {
  it('ignores nulls and floors positive data at zero', () => {
    expect(valuesExtent([null, 4, undefined, 9])).toEqual({ min: 0, max: 9 })
    expect(valuesExtent([-5, 3])).toEqual({ min: -5, max: 3 })
    expect(valuesExtent([null, undefined])).toBeNull()
  })
})

describe('linePath', () => {
  it('breaks the line on null points instead of connecting across gaps', () => {
    const path = linePath([
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      null,
      { x: 20, y: 5 },
      { x: 30, y: 7 },
    ])
    expect(path).toBe('M0 10 L10 20 M20 5 L30 7')
  })

  it('returns an empty string for no points', () => {
    expect(linePath([])).toBe('')
    expect(linePath([null])).toBe('')
  })
})

describe('thinIndices', () => {
  it('keeps every index when it fits', () => {
    expect(thinIndices(3, 7)).toEqual([0, 1, 2])
  })

  it('always includes the first and last index when thinning', () => {
    const picked = thinIndices(30, 7)
    expect(picked[0]).toBe(0)
    expect(picked[picked.length - 1]).toBe(29)
    expect(picked.length).toBeLessThanOrEqual(8)
    expect([...picked].sort((a, b) => a - b)).toEqual(picked)
  })

  it('returns nothing for an empty axis', () => {
    expect(thinIndices(0, 5)).toEqual([])
  })
})
