import { Pill } from './pill'
import {
  freshnessLabel,
  freshnessTitle,
  type DataFreshnessSource,
} from '../utils/data-freshness'

export type { DataFreshnessSource }

interface DataFreshnessBadgeProps {
  /** Where the figure came from; null when the backend did not say. */
  source: DataFreshnessSource | null
  /** Store watermark (ISO). Shown as "· to 12 Sep" on store figures. */
  asOf?: string | null
  /** Reasons the figure is partial (missing platforms, unconverted currency…). */
  notes?: string[]
  className?: string
}

// Muted provenance pill next to a number: "Store · to 12 Sep", "Live", "Manual".
// Turns amber (with the notes in the tooltip) whenever the figure is incomplete.
// Renders nothing when there is nothing to say, so callers can place it freely.
export const DataFreshnessBadge = ({
  source,
  asOf = null,
  notes = [],
  className = '',
}: DataFreshnessBadgeProps) => {
  const label = freshnessLabel(source, asOf, notes)
  if (!label) return null
  const flagged = notes.length > 0

  return (
    <Pill
      tone={flagged ? 'warning' : 'neutral'}
      dot={flagged}
      title={freshnessTitle(notes, asOf)}
      className={className}
    >
      {label}
    </Pill>
  )
}
