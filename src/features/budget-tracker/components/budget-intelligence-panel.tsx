import { Icon } from '../../../components/icon'
import { Spinner } from '../../../components/spinner'
import type { BudgetRecommendation, BudgetSnapshot } from '../types'
import { formatMoney } from '../budget-format'

interface Props {
  snapshot: BudgetSnapshot
  recommendation: BudgetRecommendation | null
  recLoading: boolean
  onRun: () => void
}

const ScoreBadge = ({ score }: { score: number }) => {
  const color =
    score >= 85 ? 'text-utility-success-500' : score >= 60 ? 'text-utility-warning-500' : 'text-utility-error-500'
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-2xl font-semibold ${color}`}>{score}%</span>
      <span className="paragraph-xs text-tertiary">aligned to optimal</span>
    </div>
  )
}

export const BudgetIntelligencePanel = ({ snapshot, recommendation, recLoading, onRun }: Props) => {
  const { totals, currency } = snapshot

  // Instant pacing line from the snapshot (always shown).
  const pacingLine =
    totals.pacing_state === 'complete'
      ? `Campaign finished — spent ${totals.spent_pct ?? 0}% of the budget.`
      : totals.pacing_state === 'over'
        ? `Spend is pacing ahead of schedule (${totals.pacing_pct}% over).`
        : totals.pacing_state === 'under'
          ? `Spend is pacing behind schedule (${Math.abs(totals.pacing_pct ?? 0)}% under).`
          : 'Spend is tracking on plan for this window.'

  return (
    <div className="rounded-2xl border border-utility-brand-500/40 bg-utility-brand-500/5 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-semibold text-primary">Mia Intelligence</p>
        {recommendation && !recLoading && (
          <button
            onClick={onRun}
            title="Refresh recommendation"
            className="text-tertiary hover:text-primary transition-colors"
          >
            <Icon.refresh_cw_01 size={16} />
          </button>
        )}
      </div>

      <p className="paragraph-sm text-secondary">{pacingLine}</p>

      {/* Recommendation */}
      <div className="mt-4 pt-4 border-t border-tertiary/60 flex-1">
        {recLoading ? (
          <div className="flex items-center gap-2 text-tertiary">
            <Spinner size="sm" variant="primary" />
            <span className="paragraph-xs">Running optimizer & analysing…</span>
          </div>
        ) : !recommendation ? (
          <button
            onClick={onRun}
            className="w-full rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm py-2 hover:opacity-90 transition-opacity"
          >
            Get Mia's reallocation recommendation
          </button>
        ) : !recommendation.available ? (
          <p className="paragraph-xs text-tertiary">{recommendation.reason}</p>
        ) : (
          <div className="space-y-3">
            {recommendation.optimization_score != null && (
              <ScoreBadge score={recommendation.optimization_score} />
            )}
            {recommendation.narrative && (
              <p className="paragraph-sm text-secondary">{recommendation.narrative}</p>
            )}
            <div className="space-y-1">
              {(recommendation.platforms ?? [])
                .filter((p) => Math.abs(p.delta) >= 1)
                .map((p) => (
                  <div key={p.platform} className="flex items-center justify-between paragraph-xs">
                    <span className="text-secondary">{p.label}</span>
                    <span
                      className={
                        p.delta > 0 ? 'text-utility-success-500' : 'text-utility-error-500'
                      }
                    >
                      {p.delta > 0 ? '+' : ''}
                      {formatMoney(p.delta, recommendation.currency ?? currency)}
                      <span className="text-tertiary">
                        {' '}
                        → {formatMoney(p.recommended, recommendation.currency ?? currency)}
                      </span>
                    </span>
                  </div>
                ))}
            </div>
            <p className="paragraph-xs text-tertiary">
              Optimal split for {formatMoney(recommendation.total_budget, recommendation.currency ?? currency)} by
              observed channel efficiency.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
