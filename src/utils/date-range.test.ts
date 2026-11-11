import { describe, expect, it } from 'vitest'
import { isApiDateRange, normalizeDateRange } from './date-range'

// The backend refuses any range not on this list (services/date_service.check_date_range), so
// stored or URL values that aren't on it must become the default before they are sent.
describe('normalizeDateRange', () => {
  it('keeps presets and real custom spans', () => {
    for (const v of ['7_days', '14_days', '30_days', '90_days', '180_days', '365_days', '2026-05-01_2026-05-31']) {
      expect(isApiDateRange(v)).toBe(true)
      expect(normalizeDateRange(v)).toBe(v)
    }
  })

  it('turns anything else into the default', () => {
    for (const v of ['last_30_days', 'custom', 'since_launch', '', null, undefined, '2026-06-01_2026-05-01']) {
      expect(normalizeDateRange(v)).toBe('30_days')
    }
  })
})
