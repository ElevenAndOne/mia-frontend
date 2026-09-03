import { describe, expect, it } from 'vitest'
import type { MetricsQueryRow, PerformanceData, RateBlock } from '../types'
import { buildSeries, buildSeriesRequest, campaignNamesFrom, hasSeriesData } from './series'

const ROWS: MetricsQueryRow[] = [
  {
    date: '2026-08-02T00:00:00.000',
    platform: 'meta_ads',
    spend_workspace_ccy: 20,
    clicks: 4,
    conversions: null,
  },
  {
    date: '2026-08-01T00:00:00.000',
    platform: 'google_ads',
    spend_workspace_ccy: 100,
    clicks: 10,
    conversions: 1,
  },
  {
    date: '2026-08-02T00:00:00.000',
    platform: 'google_ads',
    spend_workspace_ccy: 150,
    clicks: 12,
    conversions: 2,
  },
]

describe('buildSeries', () => {
  it('pivots rows into one sorted series per platform over the union of dates', () => {
    const series = buildSeries(ROWS, 'clicks', 'ZAR')
    expect(series.map((s) => s.key)).toEqual(['google_ads', 'meta_ads'])
    expect(series[0].label).toBe('Google Ads')
    expect(series[0].points.map((p) => p.date)).toEqual(['2026-08-01', '2026-08-02'])
    expect(series[0].points.map((p) => p.value)).toEqual([10, 12])
    // Meta has no row on the 1st: a gap (null), never a fabricated zero.
    expect(series[1].points.map((p) => p.value)).toEqual([null, 4])
  })

  it('keeps null measures as null and puts the formatted value in the title', () => {
    const series = buildSeries(ROWS, 'conversions', 'ZAR')
    const meta = series.find((s) => s.key === 'meta_ads')!
    expect(meta.points[1].value).toBeNull()
    expect(meta.points[1].title).toContain('—')
    const google = series.find((s) => s.key === 'google_ads')!
    expect(google.points[0].title).toBe('Google Ads · 1 Aug · Conversions 1')
  })

  it('formats spend in the workspace currency', () => {
    const series = buildSeries(ROWS, 'spend_workspace_ccy', 'ZAR')
    expect(series[0].points[0].title).toMatch(/Spend R\s?100$/)
  })

  it('drops rows without a date and labels a missing dimension as all platforms', () => {
    const series = buildSeries([{ clicks: 3 }, { date: '2026-08-01', clicks: 5 }], 'clicks', 'ZAR')
    expect(series).toHaveLength(1)
    expect(series[0].label).toBe('All platforms')
    expect(series[0].points).toHaveLength(1)
  })
})

describe('hasSeriesData', () => {
  it('is false when every point is null', () => {
    expect(
      hasSeriesData(
        buildSeries([{ date: '2026-08-01', platform: 'x', clicks: null }], 'clicks', 'ZAR')
      )
    ).toBe(false)
    expect(hasSeriesData(buildSeries(ROWS, 'clicks', 'ZAR'))).toBe(true)
  })
})

describe('buildSeriesRequest', () => {
  const window = {
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    days: 31,
    granularity: 'day' as const,
  }

  it('asks for the three chart measures by platform over the window', () => {
    const request = buildSeriesRequest(window, null)
    expect(request).toEqual({
      view: 'paid_media',
      measures: ['spend_workspace_ccy', 'clicks', 'conversions'],
      dimensions: ['platform'],
      start_date: '2026-08-01',
      end_date: '2026-08-31',
      granularity: 'day',
    })
  })

  it('adds a campaign_name filter only when names are given', () => {
    expect(buildSeriesRequest(window, []).filters).toBeUndefined()
    expect(buildSeriesRequest(window, ['Spring Sale']).filters).toEqual([
      { member: 'campaign_name', operator: 'equals', values: ['Spring Sale'] },
    ])
  })
})

describe('campaignNamesFrom', () => {
  it('collects distinct platform campaign names from by_campaign', () => {
    const block = (campaign_name?: string) => ({ campaign_name }) as unknown as RateBlock
    const data = {
      by_campaign: [block('A'), block('B'), block('A'), block(undefined)],
    } as unknown as PerformanceData
    expect(campaignNamesFrom(data)).toEqual(['A', 'B'])
    expect(campaignNamesFrom(null)).toEqual([])
  })
})
