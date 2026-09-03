import { useRef } from 'react'
import { useElementWidth } from '../../../hooks/use-element-width'
import { buildLineChartModel } from '../utils/chart-model'
import type { ChartSeries } from '../types'

interface Props {
  series: ChartSeries[]
  height?: number
  emptyLabel?: string
}

const AXIS_TEXT = 'fill-utility-gray-500'

// Multi-series SVG line chart: light horizontal grid, thinned x date labels,
// y ticks and a <title> per point for native tooltips. Geometry comes from
// buildLineChartModel; this only maps the model to SVG.
export const LineChart = ({
  series,
  height = 220,
  emptyLabel = 'No data for this window',
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const width = useElementWidth(containerRef)
  const hasData = series.some((s) => s.points.some((p) => p.value !== null))
  const model = width > 0 && hasData ? buildLineChartModel({ series, width, height }) : null

  return (
    <div ref={containerRef} className="w-full">
      {model ? (
        <svg
          width={model.width}
          height={model.height}
          viewBox={`0 0 ${model.width} ${model.height}`}
          role="img"
          aria-label="Performance over time"
          className="block overflow-visible"
        >
          {model.yTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={model.plot.left}
                x2={model.plot.right}
                y1={tick.y}
                y2={tick.y}
                className="stroke-utility-gray-200"
                strokeWidth={1}
              />
              <text
                x={model.plot.left - 8}
                y={tick.y}
                textAnchor="end"
                dominantBaseline="middle"
                className={`${AXIS_TEXT} text-[10px]`}
              >
                {tick.label}
              </text>
            </g>
          ))}

          {model.xLabels.map((label) => (
            <text
              key={`${label.x}-${label.label}`}
              x={label.x}
              y={model.height - 6}
              textAnchor="middle"
              className={`${AXIS_TEXT} text-[10px]`}
            >
              {label.label}
            </text>
          ))}

          {model.lines.map((line) => (
            <g key={line.key}>
              <path
                d={line.path}
                fill="none"
                stroke={line.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {line.points.map((point) => (
                <circle
                  key={`${line.key}-${point.x}`}
                  cx={point.x}
                  cy={point.y}
                  r={3}
                  fill={line.color}
                >
                  <title>{point.title}</title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
      ) : (
        <div
          className="flex items-center justify-center paragraph-xs text-quaternary"
          style={{ height }}
        >
          {hasData ? '' : emptyLabel}
        </div>
      )}

      {series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {series.map((s) => (
            <span
              key={s.key}
              className="inline-flex items-center gap-1.5 paragraph-xs text-secondary"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
