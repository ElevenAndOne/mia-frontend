interface SkeletonProps {
  className?: string
}

/**
 * Neutral loading placeholder bar. Size it with width/height utilities.
 * Compose several inside a single `animate-pulse` container — one pulse over
 * the whole block reads calmer than per-bar pulses (same idiom as the
 * hand-rolled skeletons in race-campaign-tracker / report-view).
 */
export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div aria-hidden="true" className={`rounded bg-tertiary ${className}`} />
)

/** Card-shaped placeholder matching SectionCard-style panels. */
export const SkeletonCard = ({ className = '' }: SkeletonProps) => (
  <div className={`rounded-xl border border-secondary bg-primary p-4 ${className}`}>
    <Skeleton className="h-4 w-40 mb-2" />
    <Skeleton className="h-3 w-64 mb-4" />
    <div className="flex gap-3">
      <Skeleton className="h-9 flex-1" />
      <Skeleton className="h-9 w-28" />
    </div>
  </div>
)

/** Stack of list-row placeholders (icon + two text lines) for list screens. */
export const SkeletonRows = ({ rows = 4, className = '' }: SkeletonProps & { rows?: number }) => (
  <div className={`space-y-2 ${className}`} aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 rounded-xl border border-secondary bg-primary p-4"
      >
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    ))}
  </div>
)
