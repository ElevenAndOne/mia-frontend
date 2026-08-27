import { useState } from 'react'

import { Button } from '../../../components/button'
import { ChevronDown } from '../../../components/icon/chevron-down'
import { MemoDrafts } from './memo-drafts'
import { MemoRecDetails } from './memo-rec-details'
import type { ScheduleDraftInput } from '../services/memo-service'
import type { MemoRecommendation } from '../types'
import { KIND_LABEL, PLATFORM_LABEL, actionSummary, normalizeKind } from '../utils/memo-format'
import { metricsFor, valueFor } from '../utils/memo-metrics'

// The verdict is carried by a rail down the edge, so urgency reads before the
// words do — a chip alone made every finding look equally weighted.
const RAIL: Record<string, string> = {
  grow: 'bg-utility-success-500',
  optimise: 'bg-utility-error-500',
  protect: 'bg-utility-warning-500',
  info: 'bg-quaternary',
}

const VERDICT_INK: Record<string, string> = {
  grow: 'text-success',
  optimise: 'text-error',
  protect: 'text-warning',
  info: 'text-tertiary',
}

interface MemoRecCardProps {
  rec: MemoRecommendation
  canManage: boolean
  busy: boolean
  currency?: string
  onApprove: (recId: string) => void
  onDismiss: (recId: string) => void
  onScheduleDraft?: (recId: string, input: ScheduleDraftInput) => Promise<unknown>
  onOpenDraft?: (conversationId: string, documentId?: string) => void
  onRedraft?: (recId: string) => void
}

export const MemoRecCard = ({
  rec,
  canManage,
  busy,
  currency = 'ZAR',
  onApprove,
  onDismiss,
  onScheduleDraft,
  onOpenDraft,
  onRedraft,
}: MemoRecCardProps) => {
  const [showDetails, setShowDetails] = useState(false)
  const kind = normalizeKind(rec.kind)
  const name = rec.campaign_ref?.name ?? 'Campaign'
  const extra = rec.campaign_ref?.also?.length ?? 0
  const platform = rec.platform ? (PLATFORM_LABEL[rec.platform] ?? rec.platform) : null
  const action = actionSummary(rec.action_type, rec.action_params)
  const metrics = metricsFor(rec, currency)
  const value = valueFor(rec, currency)
  const decidable = rec.state === 'proposed' && canManage

  return (
    <div className="flex rounded-xl border border-secondary bg-secondary overflow-hidden">
      <div className={`w-[3px] shrink-0 ${RAIL[kind] ?? RAIL.info}`} aria-hidden="true" />

      <div className="flex-1 min-w-0 flex flex-col md:flex-row">
        <div className="flex-1 min-w-0 p-4 md:p-5">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span
              className={`label-xs uppercase tracking-wider ${VERDICT_INK[kind] ?? VERDICT_INK.info}`}
            >
              {KIND_LABEL[rec.kind] ?? rec.kind}
            </span>
            <span className="label-md text-primary">{name}</span>
            {extra > 0 && <span className="paragraph-xs text-tertiary">+{extra} more</span>}
            {platform && <span className="paragraph-xs text-quaternary">{platform}</span>}
            {rec.evidence?.early_signal && (
              <span
                className="label-xs uppercase tracking-wider text-warning border border-utility-warning-500/40 rounded-full px-2 py-0.5"
                title="Based on a small sample — treat as a lead to test, not a proven pattern"
              >
                Early signal · {rec.evidence.sample_label ?? `${rec.evidence.sample_size} posts`}
              </span>
            )}
          </div>

          {rec.body && (
            <p className="paragraph-sm text-secondary mt-1.5">{rec.body.replaceAll('**', '')}</p>
          )}

          {metrics.length > 0 && (
            <div className="flex flex-wrap gap-x-7 gap-y-3 mt-3.5 pt-3.5 border-t border-secondary">
              {metrics.map((m) => (
                <div key={m.label}>
                  <p className="label-xs uppercase tracking-wider text-quaternary">{m.label}</p>
                  <p
                    className={`paragraph-md font-medium tabular-nums ${
                      m.tone === 'bad'
                        ? 'text-error'
                        : m.tone === 'good'
                          ? 'text-success'
                          : 'text-primary'
                    }`}
                  >
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {rec.drafts && (rec.state === 'proposed' || rec.state === 'applied') && (
            <MemoDrafts
              drafts={rec.drafts}
              canManage={canManage}
              onSchedule={onScheduleDraft ? (input) => onScheduleDraft(rec.id, input) : undefined}
              onOpen={(conversationId, documentId) => onOpenDraft?.(conversationId, documentId)}
              onRedraft={onRedraft && (rec.state === 'proposed' || rec.state === 'applied') ? () => onRedraft(rec.id) : undefined}
              redrafting={busy}
            />
          )}

          <button
            type="button"
            onClick={() => setShowDetails((open) => !open)}
            className="mt-3 flex items-center gap-1 paragraph-xs text-tertiary hover:text-secondary transition-colors"
            aria-expanded={showDetails}
          >
            {showDetails ? 'Hide' : 'Why'}
            <ChevronDown
              size={13}
              className={showDetails ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </button>
          {showDetails && <MemoRecDetails rec={rec} />}
        </div>

        <div className="shrink-0 md:w-56 p-4 md:p-5 md:border-l border-t md:border-t-0 border-secondary bg-primary/40 flex flex-col md:items-end justify-center gap-3">
          {value && (
            <div className="md:text-right">
              <p className="label-xs uppercase tracking-wider text-quaternary">{value.label}</p>
              <p
                className={`subheading-bg tabular-nums ${
                  value.tone === 'good' ? 'text-success' : 'text-tertiary'
                }`}
              >
                {value.amount}
              </p>
            </div>
          )}

          {decidable && (
            <div className="flex items-center gap-2">
              {rec.action_type ? (
                <Button size="sm" variant="primary" loading={busy} onClick={() => onApprove(rec.id)}>
                  Approve
                </Button>
              ) : (
                <span className="paragraph-xs text-quaternary whitespace-nowrap">Needs a person</span>
              )}
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDismiss(rec.id)}>
                Dismiss
              </Button>
            </div>
          )}

          {rec.state === 'approved' && (
            <p className="paragraph-xs text-warning">Mia is doing it now…</p>
          )}
          {rec.state === 'applied' && (
            <p className="paragraph-xs text-success">
              Done{rec.applied_at ? ` · ${new Date(rec.applied_at).toLocaleDateString()}` : ''}
            </p>
          )}
          {rec.state === 'failed' && (
            <p className="paragraph-xs text-error">Couldn&apos;t complete this</p>
          )}
          {rec.state === 'declined' && (
            <p className="paragraph-xs text-quaternary">Dismissed</p>
          )}

          {decidable && action && (
            <p className="paragraph-xs text-tertiary md:text-right leading-snug">Mia will {action}</p>
          )}
        </div>
      </div>
    </div>
  )
}
