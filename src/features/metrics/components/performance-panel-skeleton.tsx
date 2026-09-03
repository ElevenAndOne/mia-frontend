import { Skeleton } from '../../../components/skeleton'

interface Props {
  className?: string
}

// Compact placeholder matching the panel's shape: a tile row and a chart block.
export const PerformancePanelSkeleton = ({ className = '' }: Props) => (
  <div className={`animate-pulse space-y-4 ${className}`.trim()} aria-hidden="true">
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl border border-secondary bg-secondary p-4 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
    <div className="rounded-2xl border border-secondary bg-secondary p-4">
      <Skeleton className="h-40 w-full" />
    </div>
  </div>
)
