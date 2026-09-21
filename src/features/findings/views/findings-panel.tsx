import { Link } from 'react-router-dom'
import { Button } from '../../../components/button'
import { Skeleton } from '../../../components/skeleton'
import { FindingsFilter } from '../components/findings-filter'
import { FindingsList } from '../components/findings-list'
import { useFindings } from '../hooks/use-findings'

const COMPACT_MAX_ITEMS = 5

interface Props {
  /** Scope the feed to one Mia campaign. Omit for the whole workspace. */
  campaignId?: string
  /** Home-page mode: top five, no filters, a "View all" link instead. */
  compact?: boolean
  className?: string
}

// What the nightly analysis found. Renders nothing at all when the semantic layer
// is not configured for this workspace (or the request fails), so host pages never
// show an error for a feature that is simply not ready yet.
export const FindingsPanel = ({ campaignId, compact = false, className = '' }: Props) => {
  const panel = useFindings({ campaignId, maxItems: compact ? COMPACT_MAX_ITEMS : undefined })

  if (panel.loading) {
    if (compact) return null
    return (
      <div className={`animate-pulse space-y-2 ${className}`.trim()} aria-hidden="true">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    )
  }
  if (!panel.available) return null

  return (
    <section className={`space-y-3 ${className}`.trim()} aria-label="Findings">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="label-xs text-quaternary uppercase tracking-[0.14em]">Findings</span>
        {compact ? (
          panel.total > 0 && (
            <Link to="/insights/summary" className="paragraph-xs text-brand-secondary hover:underline">
              View all
            </Link>
          )
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <FindingsFilter
              severity={panel.severityFilter}
              severityOptions={panel.severityOptions}
              onSeverityChange={panel.setSeverityFilter}
              status={panel.statusFilter}
              statusOptions={panel.statusOptions}
              onStatusChange={panel.setStatusFilter}
            />
            {panel.canRun && (
              <Button size="sm" variant="secondary" loading={panel.running} onClick={panel.run}>
                Refresh analysis
              </Button>
            )}
          </div>
        )}
      </div>

      <FindingsList
        groups={panel.groups}
        emptyLabel={panel.emptyLabel}
        dense={compact}
        onAcknowledge={panel.acknowledge}
        acknowledgingId={panel.acknowledgingId}
      />
    </section>
  )
}
