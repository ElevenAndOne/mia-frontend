import { FindingCard } from './finding-card'
import type { FindingsGroup } from '../types'

interface Props {
  /** Already grouped in display order (critical → warning → info). */
  groups: FindingsGroup[]
  /** Shown instead of cards when there are none; null renders nothing. */
  emptyLabel?: string | null
  /** Compact panels: no group headings, tighter stack. */
  dense?: boolean
  onAcknowledge?: (findingId: number) => void
  acknowledgingId?: number | null
}

export const FindingsList = ({
  groups,
  emptyLabel = null,
  dense = false,
  onAcknowledge,
  acknowledgingId = null,
}: Props) => {
  if (groups.length === 0) {
    return emptyLabel ? <p className="paragraph-xs text-quaternary">{emptyLabel}</p> : null
  }

  return (
    <div className={dense ? 'space-y-2' : 'space-y-4'}>
      {groups.map((group) => (
        <section key={group.severity} aria-label={group.label} className="space-y-2">
          {!dense && (
            <p className="label-xs text-quaternary uppercase tracking-[0.14em]">
              {group.label} · {group.items.length}
            </p>
          )}
          {group.items.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onAcknowledge={onAcknowledge}
              acknowledging={acknowledgingId === finding.id}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
