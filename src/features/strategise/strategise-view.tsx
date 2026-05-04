import React, { useEffect, useMemo, useState } from 'react'
import { useSession } from '../../contexts/session-context'
import { TopBar } from '../../components/top-bar'
import { Spinner } from '../../components/spinner'
import { Button } from '../../components/button'
import { useStrategise } from './hooks/use-strategise'
import { OBJECTIVE_OPTIONS } from './types'
import type {
  CoefficientSummary,
  ConstraintDiagnostic,
  ObjectiveType,
  OptimizerRunResult,
  OptimizerRunSummary,
  ParsedConstraints,
  RunAnalysis,
  ScenarioResult,
} from './types'

interface StrategiseViewProps {
  onBack?: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(amount: number | null | undefined, currency = 'ZAR'): string {
  if (amount == null) return '—'
  const sym = currency === 'ZAR' ? 'R' : `${currency} `
  // Normalize -0 (returned by optimizer for disabled campaigns) to 0
  const normalized = amount === 0 ? 0 : amount
  return `${sym}${normalized.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function confidenceLabel(c: number): { text: string; color: string } {
  if (c >= 0.7) return { text: 'High', color: 'text-success' }
  if (c >= 0.5) return { text: 'Medium', color: 'text-warning' }
  if (c >= 0.3) return { text: 'Low', color: 'text-orange-400' }
  return { text: 'Benchmark', color: 'text-tertiary' }
}

function confidenceDot(c: number): string {
  if (c >= 0.7) return 'bg-success-solid'
  if (c >= 0.5) return 'bg-warning-solid'
  if (c >= 0.3) return 'bg-orange-400'
  return 'bg-tertiary'
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    historical_data: '60+ days data',
    short_term_data: '14–59 days data',
    sparse_data_blend: 'Sparse data',
    industry_benchmark: 'Industry benchmark',
    user_input: 'You provided',
  }
  return map[source] ?? source
}

function stageColor(stage: string): string {
  const map: Record<string, string> = {
    reach: 'bg-utility-brand-100 text-utility-brand-700',
    act: 'bg-utility-warning-100 text-utility-warning-700',
    convert: 'bg-success-primary text-success',
    engage: 'bg-utility-purple-100 text-utility-purple-700',
  }
  return map[stage.toLowerCase()] ?? 'bg-secondary text-secondary'
}

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP']

// Which objectives are usable in Phase 1 (benchmark-only coefficients)
const OBJECTIVE_AVAILABILITY: Record<string, 'available' | 'needs-targets' | 'needs-revenue'> = {
  maximize_conversions_with_stage_minimums: 'available',
  maximize_weighted_score: 'available',
  maximize_target_attainment: 'needs-targets',
  maximize_revenue: 'needs-revenue',
  maximize_profit: 'needs-revenue',
}

function fmtKpi(value: number, kpi: string): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ${kpi}`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k ${kpi}`
  return `${Math.round(value)} ${kpi}`
}

function humanConstraintName(constraint: string): string {
  if (constraint === 'total_budget') return 'Total budget cap'
  if (constraint.startsWith('stage_minimum:'))
    return `${constraint.split(':')[1].charAt(0).toUpperCase() + constraint.split(':')[1].slice(1)} stage minimum`
  if (constraint.startsWith('stage_maximum:'))
    return `${constraint.split(':')[1].charAt(0).toUpperCase() + constraint.split(':')[1].slice(1)} stage maximum`
  if (constraint.startsWith('channel_constraint:'))
    return `${constraint.split(':')[1]} channel rule`
  if (constraint.startsWith('funnel_rule:')) return 'Funnel balance rule'
  if (constraint.startsWith('campaign_min:')) return 'Campaign minimum'
  if (constraint.startsWith('campaign_max:')) return 'Campaign maximum'
  if (constraint.startsWith('group_constraint:')) return `Group rule: ${constraint.split(':')[1]}`
  if (constraint.startsWith('stage_target:')) return `${constraint.split(':')[1]} KPI target`
  return constraint.replace(/_/g, ' ')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-secondary border border-secondary rounded-xl p-5 ${className}`}>
      {children}
    </div>
  )
}

const _STAGE_ORDER = ['reach', 'act', 'convert', 'engage']

function AllocationTable({
  allocations,
  totalBudget,
  currency,
}: {
  allocations: OptimizerRunResult['result']['allocations']
  totalBudget: number
  currency: string
}) {
  const [openStages, setOpenStages] = useState<Set<string>>(new Set())

  const byStage = useMemo(() => {
    const map: Record<string, typeof allocations> = {}
    for (const a of allocations) {
      const s = a.stage ?? 'other'
      if (!map[s]) map[s] = []
      map[s].push(a)
    }
    return map
  }, [allocations])

  const stageOrder = _STAGE_ORDER.filter((s) => byStage[s])

  const toggleStage = (stage: string) =>
    setOpenStages((prev) => {
      const next = new Set(prev)
      next.has(stage) ? next.delete(stage) : next.add(stage)
      return next
    })

  return (
    <div className="space-y-2">
      {stageOrder.map((stage) => {
        const rows = byStage[stage]
        const isOpen = openStages.has(stage)
        const stageBudget = rows.reduce((sum, a) => sum + (a.allocated_budget === 0 ? 0 : a.allocated_budget), 0)
        const stagePct = totalBudget > 0 ? Math.round((stageBudget / totalBudget) * 100) : 0
        const channelCount = rows.length

        return (
          <div key={stage} className="border border-secondary rounded-xl overflow-hidden">
            {/* Stage header — click to expand/collapse */}
            <button
              onClick={() => toggleStage(stage)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-secondary hover:bg-tertiary transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className={`inline-block px-2 py-0.5 rounded-full label-xs uppercase tracking-wide ${stageColor(stage)}`}>
                  {stage}
                </span>
                <span className="paragraph-xs text-tertiary">{channelCount} channel{channelCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="label-sm text-primary">{fmtCurrency(stageBudget, currency)}</span>
                  <span className="paragraph-xs text-tertiary ml-1.5">{stagePct}%</span>
                </div>
                <span className="text-tertiary paragraph-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Channel rows — only rendered when open */}
            {isOpen && (
              <div className="divide-y divide-secondary">
                {rows.map((a) => {
                  const pct = totalBudget > 0 ? Math.round((a.allocated_budget / totalBudget) * 100) : 0
                  const channelName = a.name.includes('—') ? a.name.split('—')[1].trim() : a.name
                  const topKpi = a.expected_outputs
                    ? Object.entries(a.expected_outputs)
                        .filter(([, v]) => v > 0)
                        .sort(([, va], [, vb]) => vb - va)[0]
                    : null

                  return (
                    <div key={a.campaign_id} className="bg-primary px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="label-sm text-primary truncate">{channelName}</p>
                        <div className="text-right shrink-0">
                          <p className="label-sm text-primary">{fmtCurrency(a.allocated_budget, currency)}</p>
                          <p className="paragraph-xs text-tertiary">{pct}% of budget</p>
                        </div>
                      </div>
                      {topKpi && (
                        <p className="paragraph-xs text-secondary mt-1.5">
                          Expected: <span className="text-primary font-medium">{fmtKpi(topKpi[1] as number, topKpi[0])}</span>
                        </p>
                      )}
                      {a.allocation_reason && (
                        <p className="paragraph-xs text-tertiary mt-1.5 leading-relaxed border-t border-secondary pt-2">
                          {a.allocation_reason}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ScenarioRow({
  scenario,
  currency,
  isBase,
  objectiveType,
}: {
  scenario: ScenarioResult
  currency: string
  isBase?: boolean
  objectiveType?: string
}) {
  const isTargetAttainment = objectiveType === 'maximize_target_attainment'
  const objDisplay = isTargetAttainment
    ? '—'
    : scenario.objective_value != null
      ? scenario.objective_value.toFixed(1)
      : '—'

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
        isBase ? 'bg-brand-secondary border border-brand' : 'bg-secondary border border-secondary'
      }`}
    >
      <div className="flex-1">
        <p className={`label-sm ${isBase ? 'text-brand' : 'text-primary'}`}>
          {fmtCurrency(scenario.total_budget, currency)}
          {isBase && <span className="ml-2 label-xs text-brand">(base)</span>}
        </p>
        <p className="paragraph-xs text-tertiary mt-0.5">
          Allocated {fmtCurrency(scenario.total_allocated_budget, currency)}
          {scenario.unallocated_budget > 0.5 && (
            <span className="text-warning ml-2">
              · {fmtCurrency(scenario.unallocated_budget, currency)} unallocated
            </span>
          )}
        </p>
      </div>
      <div className="text-right">
        <p className="paragraph-xs text-tertiary">
          {isTargetAttainment ? 'KPI attainment' : 'Objective'}
        </p>
        <p className="label-sm text-primary">{objDisplay}</p>
      </div>
    </div>
  )
}

function CoefficientsTable({ coefficients }: { coefficients: CoefficientSummary[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-secondary">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-tertiary">
            <th className="px-4 py-2 label-sm text-secondary">Phase</th>
            <th className="px-4 py-2 label-sm text-secondary">KPI</th>
            <th className="px-4 py-2 label-sm text-secondary text-right">Rate</th>
            <th className="px-4 py-2 label-sm text-secondary text-right">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {coefficients.map((c, i) => {
            const conf = confidenceLabel(c.confidence)
            const rowLabel = c.channel
              ? `${c.channel.replace(/_/g, ' ')} · ${c.phase}`
              : c.phase
            return (
              <tr key={`${c.phase}-${c.channel ?? i}`} className={i % 2 === 0 ? 'bg-primary' : 'bg-secondary'}>
                <td className="px-4 py-3 paragraph-sm text-primary capitalize">{rowLabel}</td>
                <td className="px-4 py-3 paragraph-xs text-secondary capitalize">{c.kpi}</td>
                <td className="px-4 py-3 paragraph-xs text-secondary text-right font-mono">
                  {c.coefficient.toFixed(4)}
                  <span className="text-tertiary ml-1 text-xs">{c.kpi}/R1</span>
                  {c.observed_spend != null && (
                    <div className="paragraph-xs text-tertiary font-sans mt-0.5">
                      based on {fmtCurrency(c.observed_spend)} spend
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${confidenceDot(c.confidence)}`} />
                    <span className={`label-xs ${conf.color}`}>{conf.text}</span>
                    <span className="paragraph-xs text-tertiary hidden sm:inline">
                      · {sourceLabel(c.source)}
                    </span>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MiaAnalysis({
  analysis,
  isAnalysing,
}: {
  analysis: RunAnalysis | null
  isAnalysing: boolean
}) {
  const [open, setOpen] = useState(false)

  // Auto-open as soon as analysis starts or arrives
  useEffect(() => {
    if (isAnalysing || analysis) setOpen(true)
  }, [isAnalysing, analysis])

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-brand-secondary border border-brand rounded-xl hover:bg-brand-tertiary transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-brand-600 text-base">✦</span>
            <span className="label-sm text-brand-700">Mia's analysis</span>
          </div>
          <span className="paragraph-xs text-brand-600">Show ▼</span>
        </button>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => setOpen(false)}
            className="w-full flex items-center justify-between px-4 py-3 bg-brand-secondary border border-brand rounded-xl hover:bg-brand-tertiary transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-brand-600 text-base">✦</span>
              <span className="label-sm text-brand-700">Mia's analysis</span>
            </div>
            <span className="paragraph-xs text-brand-600">Hide ▲</span>
          </button>

          {isAnalysing && !analysis && (
            <div className="flex items-center gap-3 px-4 py-4 bg-secondary border border-secondary rounded-xl">
              <Spinner size="sm" variant="primary" />
              <span className="paragraph-sm text-secondary">Mia is thinking...</span>
            </div>
          )}

          {analysis && (
            <div className="space-y-3">
              {/* Mia bubble */}
              <div className="flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-brand-solid flex items-center justify-center">
                  <span className="text-xs text-white font-semibold">M</span>
                </div>
                <div className="bg-tertiary rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%]">
                  <p className="paragraph-sm text-primary whitespace-pre-wrap leading-relaxed">
                    {analysis.narrative}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div className="ml-10 space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-brand-solid mt-2" />
                      <p className="paragraph-sm text-secondary">{rec}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PreviousRuns({ runs }: { runs: OptimizerRunSummary[] }) {
  const [open, setOpen] = useState(false)
  if (runs.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary border border-secondary rounded-xl hover:bg-tertiary transition-colors"
      >
        <span className="label-sm text-secondary">Previous runs ({runs.length})</span>
        <span className="paragraph-xs text-tertiary">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {runs.map((r) => (
            <div
              key={r.run_id}
              className="flex items-center gap-3 px-4 py-3 bg-secondary border border-secondary rounded-lg"
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${r.success ? 'bg-success-solid' : 'bg-error-solid'}`}
              />
              <div className="flex-1 min-w-0">
                <p className="paragraph-sm text-primary truncate">
                  {fmtCurrency(r.total_budget, r.currency)} · {r.planning_period ?? 'No period'}
                </p>
                <p className="paragraph-xs text-tertiary">
                  {r.objective_type.replace(/_/g, ' ')} · {fmtDate(r.created_at)}
                </p>
              </div>
              {r.allocated_budget != null && (
                <p className="paragraph-xs text-secondary shrink-0">
                  {fmtCurrency(r.allocated_budget, r.currency)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Why section ───────────────────────────────────────────────────────────────

function WhySection({ result }: { result: OptimizerRunResult }) {
  const [open, setOpen] = useState(false)
  const diagnostics = result.result?.diagnostics
  const bindingConstraints: ConstraintDiagnostic[] =
    diagnostics?.constraint_diagnostics?.filter((c) => c.status === 'binding') ?? []
  const infeasibleReasons = diagnostics?.infeasible_reasons ?? []
  const suggestions = diagnostics?.relaxation_suggestions ?? []

  const hasContent = bindingConstraints.length > 0 || infeasibleReasons.length > 0

  if (!hasContent) return null

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary border border-secondary rounded-xl hover:bg-tertiary transition-colors"
      >
        <span className="label-sm text-secondary">What shaped this allocation?</span>
        <span className="paragraph-xs text-tertiary">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          {/* Infeasibility reasons */}
          {infeasibleReasons.length > 0 && (
            <SectionCard className="bg-error-primary border-error-subtle">
              <p className="label-sm text-error mb-2">Why the allocation couldn't be completed</p>
              <ul className="space-y-1">
                {infeasibleReasons.map((r, i) => (
                  <li key={i} className="paragraph-xs text-secondary flex gap-2">
                    <span className="shrink-0 text-error">×</span>
                    {r}
                  </li>
                ))}
              </ul>
              {suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-error-subtle">
                  <p className="label-xs text-secondary mb-1">Suggestions to fix this:</p>
                  {suggestions.map((s, i) => (
                    <p key={i} className="paragraph-xs text-secondary mt-1">
                      <span className="text-primary font-medium">{s.constraint}:</span>{' '}
                      {s.suggested_action}
                      {s.delta != null && ` (by ${Math.abs(s.delta).toLocaleString()})`}
                    </p>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* Binding constraints */}
          {bindingConstraints.length > 0 && (
            <SectionCard>
              <p className="label-sm text-primary mb-1">Active constraints shaping the result</p>
              <p className="paragraph-xs text-tertiary mb-3">
                These rules were at their limits — changing them would change the allocation.
              </p>
              <div className="space-y-2.5">
                {bindingConstraints.map((c) => (
                  <div key={c.constraint} className="flex items-start gap-3">
                    <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-utility-warning-400 mt-1.5" />
                    <div className="min-w-0">
                      <p className="label-xs text-primary">{humanConstraintName(c.constraint)}</p>
                      <p className="paragraph-xs text-tertiary mt-0.5">{c.details}</p>
                      {c.actual_value != null && (
                        <p className="paragraph-xs text-tertiary">
                          Current value: {c.actual_value.toLocaleString('en-ZA')}
                          {c.upper_bound != null && ` (limit: ${c.upper_bound.toLocaleString('en-ZA')})`}
                          {c.lower_bound != null && ` (minimum: ${c.lower_bound.toLocaleString('en-ZA')})`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  )
}

// ── Results view ──────────────────────────────────────────────────────────────

function ResultsView({
  result,
  totalBudget,
  currency,
  onRunAgain,
  runs,
  analysis,
  isAnalysing,
}: {
  result: OptimizerRunResult
  totalBudget: number
  currency: string
  onRunAgain: () => void
  runs: OptimizerRunSummary[]
  analysis: RunAnalysis | null
  isAnalysing: boolean
}) {
  const res = result.result
  const allocations = res?.allocations ?? []
  const scenarios = result.scenarios ?? []
  const baseScenario = scenarios.find(
    (s) => Math.abs(s.total_budget - totalBudget) < 1,
  )
  const otherScenarios = scenarios.filter((s) => s !== baseScenario)

  const isOptimal = result.success && result.solver_status === 'optimal'
  const isFeasible = result.success && result.solver_status === 'feasible'

  return (
    <div className="space-y-5">
      {/* Status header */}
      <SectionCard
        className={
          isOptimal
            ? 'bg-linear-to-r from-utility-brand-50 to-utility-brand-100 border-utility-brand-200'
            : isFeasible
              ? 'bg-linear-to-r from-utility-warning-50 to-utility-warning-100 border-utility-warning-200'
              : 'bg-error-primary border-error-subtle'
        }
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{isOptimal ? '✅' : isFeasible ? '⚠️' : '❌'}</span>
          <div>
            <p className="label-bg text-primary">
              {isOptimal
                ? 'Optimal allocation found'
                : isFeasible
                  ? 'Good allocation found (not fully optimal)'
                  : 'Could not fully allocate — check constraints'}
            </p>
            <p className="paragraph-xs text-secondary mt-1">
              {fmtCurrency(result.allocated_budget, currency)} allocated from{' '}
              {fmtCurrency(totalBudget, currency)}
              {result.unallocated_budget > 0.5 && (
                <span className="text-warning ml-2">
                  · {fmtCurrency(result.unallocated_budget, currency)} unallocated
                </span>
              )}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Allocation table */}
      {allocations.length > 0 && (
        <div>
          <p className="label-md text-primary mb-3">Budget allocation by RACE phase</p>
          <AllocationTable
            allocations={allocations}
            totalBudget={result.allocated_budget}
            currency={currency}
          />
        </div>
      )}

      {/* Expected KPI totals — only show KPIs with non-zero expected values */}
      {res?.expected_kpi_totals &&
        Object.values(res.expected_kpi_totals).some((v) => (v as number) > 0) && (
        <SectionCard>
          <p className="label-md text-primary mb-3">What Mia expects you'll achieve</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(res.expected_kpi_totals)
              .filter(([, value]) => (value as number) > 0)
              .map(([kpi, value]) => (
                <div key={kpi} className="bg-primary border border-secondary rounded-lg px-3 py-2.5">
                  <p className="label-sm text-primary">{fmtKpi(value as number, '')}</p>
                  <p className="paragraph-xs text-tertiary capitalize mt-0.5">{kpi}</p>
                </div>
              ))}
          </div>
        </SectionCard>
      )}

      {/* Scenarios */}
      {(otherScenarios.length > 0 || baseScenario) && (
        <div>
          <p className="label-md text-primary mb-3">Budget scenarios</p>
          <div className="space-y-2">
            {otherScenarios[0] && (
              <ScenarioRow scenario={otherScenarios[0]} currency={currency} objectiveType={result.objective_type} />
            )}
            {baseScenario && (
              <ScenarioRow scenario={baseScenario} currency={currency} isBase objectiveType={result.objective_type} />
            )}
            {otherScenarios[1] && (
              <ScenarioRow scenario={otherScenarios[1]} currency={currency} objectiveType={result.objective_type} />
            )}
          </div>
        </div>
      )}

      {/* Efficiency assumptions — only show channels with real data or that received budget.
          Benchmark-only disabled channels (brevo, organic_social, email) are excluded. */}
      {result.coefficient_summary.length > 0 && (() => {
        const channelsWithBudget = new Set(
          allocations
            .filter(a => a.allocated_budget > 0)
            .map(a => a.channel)
            .filter((c): c is string => Boolean(c))
        )
        const relevantCoefficients = result.coefficient_summary.filter(
          c => c.source !== 'industry_benchmark' || channelsWithBudget.has(c.channel ?? '')
        )
        return relevantCoefficients.length > 0 ? (
          <div>
            <p className="label-md text-primary mb-1">Efficiency assumptions</p>
            <p className="paragraph-xs text-tertiary mb-3">
              How many KPI units Mia expects per R1 of spend in each phase.
            </p>
            <CoefficientsTable coefficients={relevantCoefficients} />
          </div>
        ) : null
      })()}

      {/* What shaped this allocation */}
      <WhySection result={result} />

      {/* Mia's analysis */}
      <MiaAnalysis
        analysis={analysis}
        isAnalysing={isAnalysing}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onRunAgain} className="flex-1">
          Run again
        </Button>
      </div>

      {/* Previous runs */}
      <PreviousRuns runs={runs} />
    </div>
  )
}

// ── Step form ─────────────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < step ? 'bg-brand-solid w-6' : i === step ? 'bg-brand-solid w-4' : 'bg-tertiary w-3'
          }`}
        />
      ))}
      <span className="paragraph-xs text-tertiary ml-1">
        Step {step + 1} of {total}
      </span>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

const StrategiseView = ({ onBack }: StrategiseViewProps) => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id

  const {
    campaign,
    isLoadingCampaign,
    runs,
    isRunning,
    result,
    error,
    run,
    reset,
    isParsing,
    parsedConstraints,
    parseError,
    parseUserConstraints,
    clearConstraints,
    analysis,
    isAnalysing,
  } = useStrategise(sessionId, tenantId)

  // Form state
  const [step, setStep] = useState(0)
  const [budget, setBudget] = useState('')
  const [period, setPeriod] = useState('')
  const [currency, setCurrency] = useState('ZAR')
  const [objective, setObjective] = useState<ObjectiveType>(
    'maximize_conversions_with_stage_minimums',
  )
  const [budgetError, setBudgetError] = useState<string | null>(null)
  const [periodError, setPeriodError] = useState<string | null>(null)

  // Step 3 constraints
  const [constraintsText, setConstraintsText] = useState('')
  const [showConstraints, setShowConstraints] = useState(false)

  // Pre-fill budget from campaign when loaded
  const [budgetPrefilled, setBudgetPrefilled] = useState(false)
  if (campaign && campaign.budget_total && !budgetPrefilled && !budget) {
    setBudget(String(campaign.budget_total))
    if (campaign.budget_currency) setCurrency(campaign.budget_currency)
    setBudgetPrefilled(true)
  }

  const handleBack = () => {
    if (result) {
      reset()
      setStep(0)
    } else if (step > 0) {
      setStep((s) => s - 1)
    } else {
      onBack?.()
    }
  }

  const handleStep1Next = () => {
    let valid = true
    if (!budget || isNaN(Number(budget)) || Number(budget) <= 0) {
      setBudgetError('Enter a valid budget amount')
      valid = false
    } else {
      setBudgetError(null)
    }
    if (!period.trim()) {
      setPeriodError('Enter a planning period, e.g. "May 2026"')
      valid = false
    } else {
      setPeriodError(null)
    }
    if (valid) setStep(1)
  }

  const handleSubmit = async () => {
    if (!campaign) return

    // Parse constraints if user entered any
    let constraints: ParsedConstraints | null = parsedConstraints
    if (constraintsText.trim() && !parsedConstraints) {
      constraints = await parseUserConstraints(constraintsText, Number(budget), currency)
    }

    // Build transcript from constraint text for audit trail
    const transcript = constraintsText.trim()
      ? [{ role: 'user', content: constraintsText.trim() }]
      : null

    await run({
      campaign_id: campaign.campaign_id,
      total_budget: Number(budget),
      objective_type: objective,
      planning_period: period.trim(),
      currency,
      constraint_overrides: constraints,
      onboarding_transcript: transcript,
    })
  }

  const handleConstraintsChange = (val: string) => {
    setConstraintsText(val)
    if (parsedConstraints) clearConstraints()
  }

  const showBackButton = step > 0 || !!result

  // ── Render ──

  if (isLoadingCampaign) {
    return (
      <div className="w-full h-full flex flex-col bg-primary">
        <TopBar title="Predict" onBack={onBack} className="border-b border-tertiary" />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" variant="primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative flex flex-col bg-primary">
      <TopBar
        title="Predict"
        onBack={showBackButton ? handleBack : onBack}
        className="relative z-20 border-b border-tertiary"
      />

      <div className="flex-1 bg-primary p-5 safe-bottom overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full space-y-5">

          {/* No campaign */}
          {!campaign && (
            <SectionCard className="text-center py-10">
              <p className="text-4xl mb-4">📋</p>
              <p className="label-bg text-primary mb-2">No campaign brief found</p>
              <p className="paragraph-sm text-secondary max-w-xs mx-auto">
                Upload a campaign brief at the Intent Engine to use Predict. Mia needs your
                RACE phases to allocate budget.
              </p>
            </SectionCard>
          )}

          {/* Error */}
          {error && (
            <div className="bg-error-primary border border-error-subtle rounded-xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <p className="label-sm text-error mb-1">Optimisation failed</p>
                <p className="paragraph-sm text-secondary">{error}</p>
                <button
                  onClick={reset}
                  className="mt-3 paragraph-xs text-tertiary underline hover:text-secondary"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Solving spinner */}
          {isRunning && (
            <SectionCard className="text-center py-12">
              <Spinner size="lg" variant="primary" className="mx-auto mb-4" />
              <p className="label-md text-primary">Running optimisation...</p>
            </SectionCard>
          )}

          {/* Results */}
          {!isRunning && result && !error && campaign && (
            <ResultsView
              result={result}
              totalBudget={Number(budget)}
              currency={currency}
              onRunAgain={() => { reset(); setStep(0); setConstraintsText(''); setBudgetPrefilled(false) }}
              runs={runs}
              analysis={analysis}
              isAnalysing={isAnalysing}
            />
          )}

          {/* Form */}
          {!isRunning && !result && campaign && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="label-lg text-primary">{campaign.campaign_name}</p>
                  <p className="paragraph-xs text-tertiary">
                    {campaign.phases.length} RACE phase{campaign.phases.length !== 1 ? 's' : ''} ·{' '}
                    {campaign.client_name}
                  </p>
                </div>
                <StepIndicator step={step} total={3} />
              </div>

              {/* Step 1 — Budget & period */}
              {step === 0 && (
                <SectionCard>
                  <p className="label-md text-primary mb-4">Budget & planning period</p>

                  <div className="space-y-4">
                    <div className="flex gap-3">
                      {/* Currency */}
                      <div className="w-24 shrink-0">
                        <label className="label-sm text-secondary block mb-1.5">Currency</label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full bg-primary border border-secondary rounded-lg px-3 py-2 paragraph-sm text-primary focus:outline-none focus:border-brand"
                        >
                          {CURRENCIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      {/* Budget */}
                      <div className="flex-1">
                        <label className="label-sm text-secondary block mb-1.5">
                          Total budget
                        </label>
                        <input
                          type="number"
                          min={0}
                          placeholder="e.g. 80000"
                          value={budget}
                          onChange={(e) => {
                            setBudget(e.target.value)
                            setBudgetError(null)
                          }}
                          className="w-full bg-primary border border-secondary rounded-lg px-3 py-2 paragraph-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-brand"
                        />
                        {budgetError && (
                          <p className="paragraph-xs text-error mt-1">{budgetError}</p>
                        )}
                      </div>
                    </div>

                    {/* Planning period */}
                    <div>
                      <label className="label-sm text-secondary block mb-1.5">
                        Planning period
                      </label>
                      <input
                        type="text"
                        placeholder='e.g. "May 2026" or "Q2 2026"'
                        value={period}
                        onChange={(e) => {
                          setPeriod(e.target.value)
                          setPeriodError(null)
                        }}
                        className="w-full bg-primary border border-secondary rounded-lg px-3 py-2 paragraph-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-brand"
                      />
                      {periodError && (
                        <p className="paragraph-xs text-error mt-1">{periodError}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    <Button variant="primary" fullWidth onClick={handleStep1Next}>
                      Next →
                    </Button>
                  </div>
                </SectionCard>
              )}

              {/* Step 2 — Objective */}
              {step === 1 && (
                <SectionCard>
                  <p className="label-md text-primary mb-4">What should Mia optimise for?</p>

                  <div className="space-y-2">
                    {OBJECTIVE_OPTIONS.map((opt) => {
                      const selected = objective === opt.value
                      const avail = OBJECTIVE_AVAILABILITY[opt.value] ?? 'available'
                      const needsData = avail !== 'available'
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setObjective(opt.value)}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                            selected
                              ? 'bg-brand-secondary border-brand'
                              : 'bg-primary border-secondary hover:bg-secondary hover:border-tertiary'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                selected ? 'border-brand bg-brand-solid' : 'border-tertiary'
                              }`}
                            >
                              {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="label-sm text-primary">{opt.label}</p>
                                {avail === 'needs-targets' && (
                                  <span className="px-1.5 py-0.5 rounded label-xs bg-utility-warning-100 text-utility-warning-700">
                                    Needs campaign targets
                                  </span>
                                )}
                                {avail === 'needs-revenue' && (
                                  <span className="px-1.5 py-0.5 rounded label-xs bg-secondary text-tertiary">
                                    Needs revenue data · Phase 2
                                  </span>
                                )}
                              </div>
                              <p className="paragraph-xs text-secondary mt-0.5">
                                {opt.description}
                              </p>
                              {needsData && (
                                <p className="paragraph-xs text-tertiary mt-0.5 italic">
                                  {opt.hint}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex gap-3 mt-5">
                    <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">
                      ← Back
                    </Button>
                    <Button variant="primary" onClick={() => setStep(2)} className="flex-1">
                      Next →
                    </Button>
                  </div>
                </SectionCard>
              )}

              {/* Step 3 — Confirm */}
              {step === 2 && (
                <SectionCard>
                  <p className="label-md text-primary mb-4">Review & run</p>

                  {/* Summary */}
                  <div className="bg-primary border border-secondary rounded-lg p-4 space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="paragraph-sm text-tertiary">Budget</span>
                      <span className="label-sm text-primary">
                        {fmtCurrency(Number(budget), currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="paragraph-sm text-tertiary">Period</span>
                      <span className="label-sm text-primary">{period}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="paragraph-sm text-tertiary">Objective</span>
                      <span className="label-sm text-primary">
                        {OBJECTIVE_OPTIONS.find((o) => o.value === objective)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="paragraph-sm text-tertiary">Phases</span>
                      <span className="label-sm text-primary">
                        {campaign.phases.map((p) => p.phase_name).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Constraints — conversational input */}
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => setShowConstraints((v) => !v)}
                      className="flex items-center gap-2 paragraph-xs text-secondary hover:text-primary transition-colors"
                    >
                      <span className="text-base leading-none">{showConstraints ? '▾' : '▸'}</span>
                      <span>Any fixed budgets or special rules? <span className="text-tertiary">(optional)</span></span>
                    </button>

                    {showConstraints && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          rows={3}
                          value={constraintsText}
                          onChange={(e) => handleConstraintsChange(e.target.value)}
                          placeholder={`e.g. "Lock R10,000 on Reach" or "minimum 35% on Convert" or "don't spend more than 20% on Engage"`}
                          className="w-full bg-primary border border-secondary rounded-lg px-3 py-2 paragraph-sm text-primary placeholder:text-placeholder focus:outline-none focus:border-brand resize-none"
                        />
                        {isParsing && (
                          <div className="flex items-center gap-2 paragraph-xs text-secondary">
                            <Spinner size="sm" variant="primary" />
                            Mia is reading your rules...
                          </div>
                        )}
                        {parsedConstraints && !isParsing && (
                          <div className="flex items-start gap-2 px-3 py-2 bg-success-primary border border-success-subtle rounded-lg">
                            <span className="text-success shrink-0">✓</span>
                            <p className="paragraph-xs text-secondary">{parsedConstraints.notes}</p>
                          </div>
                        )}
                        {parseError && (
                          <p className="paragraph-xs text-warning">{parseError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Coefficient note */}
                  <div className="bg-utility-warning-50 border border-utility-warning-200 rounded-lg px-4 py-3 mb-5">
                    <p className="paragraph-xs text-secondary">
                      <span className="label-xs text-primary">About efficiency assumptions: </span>
                      Mia will auto-compute spend efficiency from your platform data. Where data is
                      sparse, industry benchmarks are used. You can review confidence levels in the
                      results.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                      ← Back
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={isRunning || isParsing}
                      className="flex-1"
                    >
                      {isParsing ? 'Parsing rules...' : isRunning ? 'Running...' : 'Run optimisation →'}
                    </Button>
                  </div>
                </SectionCard>
              )}

              {/* Previous runs (shown at bottom of form) */}
              {step === 0 && <PreviousRuns runs={runs} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default StrategiseView
