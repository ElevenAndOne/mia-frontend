import { describe, expect, it } from 'vitest'
import type { PerformanceData, RateBlock } from '../types'
import { buildCompleteness, buildPlatformRows, buildTiles } from './performance-view-model'

const block = (overrides: Partial<RateBlock> = {}): RateBlock => ({
  spend: 1000,
  spend_native: 1000,
  spend_unconverted: 0,
  impressions: 50000,
  clicks: 850,
  conversions: 20,
  conversion_value: 0,
  ctr: 1.7,
  cpc: 1.18,
  cpm: 20,
  cost_per_conversion: 50,
  conversion_rate: 2.35,
  roas: null,
  roas_basis: 'conversion_count',
  roas_is_revenue_backed: false,
  revenue_coverage: 0,
  currency_count: 1,
  conversion_basis_count: 1,
  engagements: 0,
  video_views: 0,
  ...overrides,
})

const data = (overrides: Partial<PerformanceData> = {}): PerformanceData => ({
  available: true,
  tenant_id: 't1',
  start_date: '2026-08-01',
  end_date: '2026-08-31',
  currency: 'ZAR',
  data_source: 'store',
  as_of: '2026-08-31',
  completeness_notes: [],
  platforms_reported: ['google_ads'],
  platforms_unavailable: [],
  totals: block(),
  by_platform: [block({ platform: 'google_ads' })],
  by_campaign: [],
  previous: {
    start_date: '2026-07-01',
    end_date: '2026-07-31',
    totals: block({ spend: 800, cost_per_conversion: 60 }),
  },
  ...overrides,
})

describe('buildTiles', () => {
  it('builds the five core tiles and omits ROAS when not revenue-backed', () => {
    const tiles = buildTiles(data())
    expect(tiles.map((t) => t.key)).toEqual([
      'spend',
      'impressions',
      'clicks',
      'ctr',
      'cost_per_conversion',
    ])
    expect(tiles[0].label).toBe('Spend (ZAR)')
    expect(tiles[0].value).toMatch(/^R\s?1\s?000$/)
    expect(tiles[3].value).toBe('1.7%')
  })

  it('adds ROAS only when the basis is revenue', () => {
    const tiles = buildTiles(data({ totals: block({ roas_basis: 'revenue', roas: 3.2 }) }))
    expect(tiles.at(-1)).toMatchObject({ key: 'roas', value: '3.2×' })
  })

  it('computes deltas against the previous period with lower-is-better tones', () => {
    const tiles = buildTiles(data())
    expect(tiles[0].delta).toEqual({ label: '25%', direction: 'up', tone: 'good' })
    expect(tiles[4].delta).toEqual({ label: '17%', direction: 'down', tone: 'good' })
  })

  it('keeps cents on unit costs but not on totals', () => {
    const tiles = buildTiles(data({ totals: block({ cost_per_conversion: 12.345 }) }))
    expect(tiles[4].value).toMatch(/12[.,]35$/)
  })
})

describe('buildPlatformRows', () => {
  it('labels platforms, sorts by spend and shows CPA instead of ROAS when not revenue-backed', () => {
    const rows = buildPlatformRows(
      data({
        by_platform: [
          block({ platform: 'meta_ads', spend: 200 }),
          block({ platform: 'google_ads', spend: 900, roas_basis: 'revenue', roas: 4.1 }),
        ],
      })
    )
    expect(rows.map((r) => r.label)).toEqual(['Google Ads', 'Meta Ads'])
    expect(rows[0]).toMatchObject({ roas: '4.1×', roasBacked: true })
    expect(rows[1]).toMatchObject({ roas: '—', roasBacked: false })
    expect(rows[1].cpa).toMatch(/50/)
  })
})

describe('buildCompleteness', () => {
  it('formats the watermark and merges notes with unavailable platforms', () => {
    const view = buildCompleteness(
      data({
        completeness_notes: ['Meta lag 1 day'],
        platforms_unavailable: [{ platform: 'tiktok_ads', reason: 'not connected' }],
        totals: block({ revenue_signal_warning: 'Revenue partially tracked' }),
      })
    )
    expect(view.asOf).toBe('31 Aug 2026')
    expect(view.notes).toEqual([
      'Meta lag 1 day',
      'TikTok Ads: not connected',
      'Revenue partially tracked',
    ])
  })

  it('leaves asOf null when the store has no watermark', () => {
    expect(buildCompleteness(data({ as_of: null })).asOf).toBeNull()
  })
})
