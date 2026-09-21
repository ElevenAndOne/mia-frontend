import { useState } from 'react'
import { Button } from '../../../components/button'
import { Pill, type PillTone } from '../../../components/pill'
import type { FindingCardView, FindingSeverity } from '../types'

interface Props {
  finding: FindingCardView
  onAcknowledge?: (findingId: number) => void
  acknowledging?: boolean
}

const SEVERITY_TONE: Record<FindingSeverity, PillTone> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
}

// One finding: severity + kind on the top line, the sentence with the numbers,
// the longer detail behind a disclosure, and how often the nightly run saw it.
export const FindingCard = ({ finding, onAcknowledge, acknowledging = false }: Props) => {
  const [open, setOpen] = useState(false)

  return (
    <article
      data-severity={finding.severity}
      className="rounded-2xl border border-secondary bg-secondary p-3 md:p-4 space-y-2"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone={SEVERITY_TONE[finding.severity]}>{finding.severityLabel}</Pill>
            <span className="paragraph-xs text-quaternary">{finding.kindLabel}</span>
          </div>
          <p className="paragraph-sm text-primary">{finding.title}</p>
        </div>
        {finding.canAcknowledge && onAcknowledge && (
          <Button
            size="sm"
            variant="ghost"
            loading={acknowledging}
            onClick={() => onAcknowledge(finding.id)}
            className="shrink-0"
          >
            Acknowledge
          </Button>
        )}
      </div>

      {finding.detail && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="paragraph-xs text-tertiary hover:text-secondary transition-colors"
        >
          {open ? 'Hide detail' : 'Show detail'}
        </button>
      )}
      {open && <p className="paragraph-xs text-secondary">{finding.detail}</p>}

      <p className="paragraph-xs text-quaternary">{finding.seenLabel}</p>
    </article>
  )
}
