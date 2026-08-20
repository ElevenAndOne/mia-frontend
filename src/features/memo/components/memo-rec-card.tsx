import { useState } from 'react'

import { Button } from '../../../components/button'
import { ChevronDown } from '../../../components/icon/chevron-down'
import { MemoRecDetails } from './memo-rec-details'
import type { MemoRecommendation } from '../types'
import { KIND_LABEL, actionSummary, impactLine, normalizeKind } from '../utils/memo-format'

const KIND_CHIP: Record<string, string> = {
  grow: 'text-success bg-success-subtle border-success-subtle',
  optimise: 'text-error bg-error-primary border-error-subtle',
  protect: 'text-warning bg-warning-subtle border-warning-subtle',
  info: 'text-tertiary bg-tertiary border-tertiary',
}

interface MemoRecCardProps {
  rec: MemoRecommendation
  canManage: boolean
  busy: boolean
  currency?: string
  onApprove: (recId: string) => void
  onDismiss: (recId: string) => void
}

export const MemoRecCard = ({
  rec,
  canManage,
  busy,
  currency = 'ZAR',
  onApprove,
  onDismiss,
}: MemoRecCardProps) => {
  const [showDetails, setShowDetails] = useState(false)
  const name = rec.campaign_ref?.name ?? 'Campaign'
  const extra = rec.campaign_ref?.also?.length ?? 0
  const action = actionSummary(rec.action_type, rec.action_params)
  const impact = impactLine(rec.evidence, currency)
  const decidable = rec.state === 'proposed' && canManage

  return (
    <div className="p-5 bg-secondary rounded-2xl border border-tertiary flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span
            className={`self-start inline-flex items-center px-2.5 py-0.5 border rounded-full label-xs uppercase tracking-wide ${KIND_CHIP[normalizeKind(rec.kind)] ?? KIND_CHIP.info}`}
          >
            {KIND_LABEL[rec.kind] ?? rec.kind}
          </span>
          <h3 className="label-md text-primary">
            {name}
            {extra > 0 && (
              <span className="paragraph-sm text-tertiary font-normal"> +{extra} more</span>
            )}
          </h3>
        </div>
        {impact && (
          <div className="text-right shrink-0">
            <p className="label-bg text-success tabular-nums">{impact.value}</p>
            <p className="paragraph-xs text-tertiary">{impact.label}</p>
          </div>
        )}
      </div>

      {rec.body && <p className="paragraph-sm text-secondary">{rec.body.replaceAll('**', '')}</p>}

      {decidable && action && (
        <p className="subheading-bg text-primary">Mia will {action}</p>
      )}

      {decidable && (
        <div className="flex items-center gap-2">
          {rec.action_type ? (
            <Button size="lg" variant="primary" loading={busy} onClick={() => onApprove(rec.id)}>
              Approve
            </Button>
          ) : (
            <span className="paragraph-sm text-tertiary">Needs a person — nothing to automate yet</span>
          )}
          <Button size="lg" variant="ghost" disabled={busy} onClick={() => onDismiss(rec.id)}>
            Dismiss
          </Button>
        </div>
      )}

      {rec.state === 'approved' && (
        <p className="paragraph-sm text-warning">Approved — Mia is doing it now…</p>
      )}
      {rec.state === 'applied' && (
        <p className="paragraph-sm text-success">
          Done{rec.applied_at ? ` · ${new Date(rec.applied_at).toLocaleDateString()}` : ''}
        </p>
      )}
      {rec.state === 'failed' && (
        <p className="paragraph-sm text-error">
          Couldn&apos;t complete this
          {typeof rec.result?.error === 'string' ? ` — ${rec.result.error}` : ''}
        </p>
      )}
      {rec.state === 'declined' && (
        <p className="paragraph-sm text-quaternary">Dismissed — Mia won&apos;t raise it again soon</p>
      )}

      <button
        type="button"
        onClick={() => setShowDetails((open) => !open)}
        className="self-start flex items-center gap-1 paragraph-xs text-tertiary hover:text-secondary transition-colors"
        aria-expanded={showDetails}
      >
        {showDetails ? 'Hide' : 'Why'}
        <ChevronDown
          size={14}
          className={showDetails ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>
      {showDetails && <MemoRecDetails rec={rec} />}
    </div>
  )
}
