// Turns chart series + a pixel size into everything the SVG line chart renders.
// Keeps geometry out of the component so it stays a plain map over this model.

import type { ChartSeries } from '../types'
import {
  linePath,
  linearScale,
  niceTicks,
  thinIndices,
  valuesExtent,
  xPositions,
} from './chart-scale'
import { formatCompact } from './metric-format'

export interface ChartPoint {
  x: number
  y: number
  title: string
}

export interface ChartLine {
  key: string
  label: string
  color: string
  path: string
  points: ChartPoint[]
}

export interface PlotArea {
  left: number
  right: number
  top: number
  bottom: number
}

export interface LineChartModel {
  width: number
  height: number
  plot: PlotArea
  yTicks: Array<{ y: number; label: string }>
  xLabels: Array<{ x: number; label: string }>
  lines: ChartLine[]
}

export interface LineChartOptions {
  series: ChartSeries[]
  width: number
  height: number
  /** Approximate pixel width per x label; drives label thinning. */
  labelWidth?: number
  tickCount?: number
}

const MARGIN = { top: 12, right: 12, bottom: 24, left: 44 }

/** Dates shared by all series, in order. The first series is the reference axis. */
const axisDates = (series: ChartSeries[]): Array<{ date: string; label: string }> => {
  const seen = new Map<string, string>()
  for (const s of series)
    for (const p of s.points) if (!seen.has(p.date)) seen.set(p.date, p.dateLabel)
  return [...seen.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, label]) => ({ date, label }))
}

export const buildLineChartModel = ({
  series,
  width,
  height,
  labelWidth = 56,
  tickCount = 4,
}: LineChartOptions): LineChartModel => {
  const plot: PlotArea = {
    left: MARGIN.left,
    right: Math.max(MARGIN.left + 1, width - MARGIN.right),
    top: MARGIN.top,
    bottom: Math.max(MARGIN.top + 1, height - MARGIN.bottom),
  }
  const dates = axisDates(series)
  const extent = valuesExtent(series.flatMap((s) => s.points.map((p) => p.value)))
  const ticks = niceTicks(extent?.min ?? 0, extent?.max ?? 1, tickCount)
  const yScale = linearScale(ticks[0], ticks[ticks.length - 1], plot.bottom, plot.top)
  const xs = xPositions(dates.length, plot.left, plot.right)
  const xIndex = new Map(dates.map((d, i) => [d.date, i]))

  const maxLabels = Math.max(2, Math.floor((plot.right - plot.left) / labelWidth))
  const xLabels = thinIndices(dates.length, maxLabels).map((i) => ({
    x: xs[i],
    label: dates[i].label,
  }))

  const lines: ChartLine[] = series.map((s) => {
    const placed = s.points.map((p) => {
      const i = xIndex.get(p.date)
      if (i === undefined || p.value === null) return null
      return { x: xs[i], y: yScale(p.value), title: p.title }
    })
    return {
      key: s.key,
      label: s.label,
      color: s.color,
      path: linePath(placed),
      points: placed.filter((p): p is ChartPoint => p !== null),
    }
  })

  return {
    width,
    height,
    plot,
    yTicks: ticks.map((t) => ({ y: yScale(t), label: formatCompact(t) })),
    xLabels,
    lines,
  }
}
