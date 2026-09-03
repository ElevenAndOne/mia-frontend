import { describe, expect, it } from 'vitest'
import {
  DEFAULT_METRICS_RANGE,
  formatAsOf,
  formatAxisDate,
  granularityForDays,
  readStoredDateRange,
  resolveMetricsWindow,
  resolveMetricsWindowOrDefault,
} from './metrics-window'

// Fixed "now" so preset windows are deterministic: 2026-09-03 (local time).
const NOW = new Date(2026, 8, 3, 12)

describe('resolveMetricsWindow', () => {
  it('ends yesterday and spans the preset length', () => {
    const window = resolveMetricsWindow('7_days', NOW)
    expect(window).toEqual({
      start_date: '2026-08-27',
      end_date: '2026-09-02',
      days: 7,
      granularity: 'day',
    })
  })

  it('switches to weekly points for windows longer than 120 days', () => {
    expect(resolveMetricsWindow('90_days', NOW)?.granularity).toBe('day')
    expect(resolveMetricsWindow('180_days', NOW)?.granularity).toBe('week')
    expect(resolveMetricsWindow('365_days', NOW)?.granularity).toBe('week')
  })

  it('accepts custom start_end values', () => {
    const window = resolveMetricsWindow('2026-06-01_2026-06-30', NOW)
    expect(window?.start_date).toBe('2026-06-01')
    expect(window?.end_date).toBe('2026-06-30')
    expect(window?.days).toBe(30)
  })

  it('returns null for unresolvable values such as since_launch', () => {
    expect(resolveMetricsWindow('since_launch', NOW)).toBeNull()
    expect(resolveMetricsWindow('garbage', NOW)).toBeNull()
  })
})

describe('resolveMetricsWindowOrDefault', () => {
  it('falls back to the default preset', () => {
    const fallback = resolveMetricsWindowOrDefault('since_launch', NOW)
    expect(fallback).toEqual(resolveMetricsWindow(DEFAULT_METRICS_RANGE, NOW))
  })
})

describe('granularityForDays', () => {
  it('uses the 120-day threshold inclusively', () => {
    expect(granularityForDays(120)).toBe('day')
    expect(granularityForDays(121)).toBe('week')
  })
})

describe('readStoredDateRange', () => {
  it('falls back to the default when localStorage is unavailable', () => {
    expect(readStoredDateRange()).toBe(DEFAULT_METRICS_RANGE)
  })
})

describe('date display', () => {
  it('formats axis dates and as-of watermarks, passing through junk', () => {
    expect(formatAxisDate('2026-08-14')).toBe('14 Aug')
    expect(formatAsOf('2026-08-14')).toBe('14 Aug 2026')
    expect(formatAsOf(null)).toBeNull()
    expect(formatAxisDate('not-a-date')).toBe('not-a-date')
  })
})
