// Pure transforms from a /performance payload into the tiles, table rows and
// completeness line the panel renders. All formatting happens here, not in JSX.

import { channelColor, channelLabel } from '../../campaigns/utils/channel-colors'
import { formatMoney } from '../../budget-tracker/budget-format'
import type {
  CompletenessView,
  MetricTileView,
  PerformanceData,
  PlatformRowView,
  RateBlock,
} from '../types'
import { buildDelta } from './metric-delta'
import { EMPTY_VALUE, formatCount, formatPercent, formatRatio } from './metric-format'
import { formatAsOf } from './metrics-window'

/** Unit costs keep cents; totals are whole units (same as the budget tracker). */
const UNIT_COST_DECIMALS = 2

const tile = (
  key: string,
  label: string,
  value: string,
  current: number | null | undefined,
  previous: number | null | undefined
): MetricTileView => ({ key, label, value, delta: buildDelta(key, current, previous) })

export const buildTiles = (data: PerformanceData): MetricTileView[] => {
  const now = data.totals
  const prev = data.previous.totals
  const ccy = data.currency
  const tiles: MetricTileView[] = [
    tile('spend', `Spend (${ccy})`, formatMoney(now.spend, ccy), now.spend, prev.spend),
    tile(
      'impressions',
      'Impressions',
      formatCount(now.impressions),
      now.impressions,
      prev.impressions
    ),
    tile('clicks', 'Clicks', formatCount(now.clicks), now.clicks, prev.clicks),
    tile('ctr', 'CTR', formatPercent(now.ctr, 2), now.ctr, prev.ctr),
    tile(
      'cost_per_conversion',
      'Cost per conversion',
      formatMoney(now.cost_per_conversion, ccy, UNIT_COST_DECIMALS),
      now.cost_per_conversion,
      prev.cost_per_conversion
    ),
  ]
  // ROAS is only a real return figure when every platform reports revenue.
  if (now.roas_basis === 'revenue') {
    tiles.push(tile('roas', 'ROAS', formatRatio(now.roas), now.roas, prev.roas))
  }
  return tiles
}

const platformRow = (block: RateBlock, currency: string): PlatformRowView => {
  const platform = block.platform ?? 'unknown'
  const roasBacked = block.roas_basis === 'revenue'
  return {
    platform,
    label: channelLabel(platform),
    color: channelColor(platform),
    spend: formatMoney(block.spend, currency),
    impressions: formatCount(block.impressions),
    clicks: formatCount(block.clicks),
    ctr: formatPercent(block.ctr, 2),
    cpa: formatMoney(block.cost_per_conversion, currency, UNIT_COST_DECIMALS),
    roas: roasBacked ? formatRatio(block.roas) : EMPTY_VALUE,
    roasBacked,
  }
}

export const buildPlatformRows = (data: PerformanceData): PlatformRowView[] =>
  [...data.by_platform]
    .sort((a, b) => b.spend - a.spend)
    .map((block) => platformRow(block, data.currency))

export const buildCompleteness = (data: PerformanceData): CompletenessView => {
  const notes: string[] = [...data.completeness_notes]
  for (const missing of data.platforms_unavailable) {
    notes.push(`${channelLabel(missing.platform)}: ${missing.reason}`)
  }
  if (data.totals.revenue_signal_warning) notes.push(data.totals.revenue_signal_warning)
  return { asOf: formatAsOf(data.as_of), notes }
}
