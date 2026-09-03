import type { DeltaDirection, DeltaTone, MetricTileView } from '../types'

interface Props {
  tile: MetricTileView
}

const TONE_CLASS: Record<DeltaTone, string> = {
  good: 'text-utility-success-600',
  bad: 'text-utility-error-600',
  neutral: 'text-tertiary',
}

const ARROW: Record<DeltaDirection, string> = { up: '▲', down: '▼', flat: '' }

// One headline metric with its change against the previous period. Tone is
// decided upstream (lower-is-better metrics flip it), so this only paints it.
export const MetricTile = ({ tile }: Props) => (
  <div className="rounded-2xl border border-secondary bg-secondary p-4 min-w-0">
    <p className="paragraph-xs uppercase tracking-wide text-tertiary truncate">{tile.label}</p>
    <p className="mt-1 text-2xl font-semibold text-primary truncate" title={tile.value}>
      {tile.value}
    </p>
    <p className="paragraph-xs mt-1 truncate">
      {tile.delta ? (
        <>
          <span className={TONE_CLASS[tile.delta.tone]}>
            {ARROW[tile.delta.direction]} {tile.delta.label}
          </span>
          <span className="text-quaternary"> vs previous</span>
        </>
      ) : (
        <span className="text-quaternary">— vs previous</span>
      )}
    </p>
  </div>
)
