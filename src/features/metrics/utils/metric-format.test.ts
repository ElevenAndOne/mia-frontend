import { describe, expect, it } from 'vitest'
import {
  EMPTY_VALUE,
  formatCompact,
  formatCount,
  formatFractionAsPercent,
  formatPercent,
  formatRatio,
  isMissing,
} from './metric-format'

describe('isMissing', () => {
  it('treats null, undefined and NaN as missing but not zero', () => {
    expect(isMissing(null)).toBe(true)
    expect(isMissing(undefined)).toBe(true)
    expect(isMissing(Number.NaN)).toBe(true)
    expect(isMissing(0)).toBe(false)
  })
})

describe('formatCount', () => {
  it('renders a dash for missing and a rounded integer otherwise', () => {
    expect(formatCount(null)).toBe(EMPTY_VALUE)
    expect(formatCount(0)).toBe('0')
    expect(formatCount(1234.6)).toBe((1235).toLocaleString())
  })
})

describe('formatPercent', () => {
  it('takes an already-percent value (as /performance returns)', () => {
    expect(formatPercent(1.7)).toBe('1.7%')
    expect(formatPercent(1.234, 2)).toBe('1.23%')
    expect(formatPercent(null)).toBe(EMPTY_VALUE)
    expect(formatPercent(0)).toBe('0%')
  })
})

describe('formatFractionAsPercent', () => {
  it('scales a 0–1 fraction (as /query returns) to a percent', () => {
    expect(formatFractionAsPercent(0.017)).toBe('1.7%')
    expect(formatFractionAsPercent(1)).toBe('100%')
    expect(formatFractionAsPercent(null)).toBe(EMPTY_VALUE)
  })
})

describe('formatRatio', () => {
  it('appends the multiplication sign', () => {
    expect(formatRatio(2.345)).toBe('2.35×')
    expect(formatRatio(null)).toBe(EMPTY_VALUE)
  })
})

describe('formatCompact', () => {
  it('abbreviates thousands, millions and billions', () => {
    expect(formatCompact(950)).toBe('950')
    expect(formatCompact(1234)).toBe('1.2k')
    expect(formatCompact(3_400_000)).toBe('3.4M')
    expect(formatCompact(2_000_000_000)).toBe('2B')
    expect(formatCompact(-1500)).toBe('-1.5k')
  })

  it('keeps one decimal for small values and a dash for missing', () => {
    expect(formatCompact(2.5)).toBe('2.5')
    expect(formatCompact(0)).toBe('0')
    expect(formatCompact(undefined)).toBe(EMPTY_VALUE)
  })
})
