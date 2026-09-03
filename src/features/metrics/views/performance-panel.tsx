import { SegmentedControl } from '../../../components/segmented-control'
import { Skeleton } from '../../../components/skeleton'
import { CompletenessNote } from '../components/completeness-note'
import { LineChart } from '../components/line-chart'
import { MetricTile } from '../components/metric-tile'
import { PerformancePanelSkeleton } from '../components/performance-panel-skeleton'
import { PlatformBreakdownTable } from '../components/platform-breakdown-table'
import { usePerformancePanel } from '../hooks/use-performance-panel'

interface Props {
  /** Scope everything to one Mia campaign. Omit for the whole workspace. */
  campaignId?: string
  /** Range value driving the window; defaults to the global stored date range. */
  dateRange?: string
  className?: string
}

// Store-backed performance panel over the semantic layer. Renders nothing at all
// when the store has no data for this workspace (or the request fails) so the
// host page never shows an error for a feature that is simply not ready yet.
export const PerformancePanel = ({ campaignId, dateRange, className = '' }: Props) => {
  const panel = usePerformancePanel({ campaignId, dateRange })

  if (panel.loading) return <PerformancePanelSkeleton className={className} />
  if (!panel.available) return null

  const showChart = panel.seriesLoading || panel.series.length > 0

  return (
    <section className={`space-y-4 ${className}`.trim()} aria-label="Performance">
      <span className="label-xs text-quaternary uppercase tracking-[0.14em]">Performance</span>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {panel.tiles.map((tile) => (
          <MetricTile key={tile.key} tile={tile} />
        ))}
      </div>

      {showChart && (
        <div className="rounded-2xl border border-secondary bg-secondary p-4 md:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <span className="label-xs text-quaternary uppercase tracking-[0.14em]">Trend</span>
            <SegmentedControl
              options={panel.measureOptions}
              value={panel.measure}
              onChange={panel.setMeasure}
            />
          </div>
          {panel.seriesLoading ? (
            <div className="animate-pulse">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <LineChart series={panel.series} />
          )}
        </div>
      )}

      <PlatformBreakdownTable rows={panel.rows} />

      {panel.completeness && (
        <CompletenessNote asOf={panel.completeness.asOf} notes={panel.completeness.notes} />
      )}
    </section>
  )
}
