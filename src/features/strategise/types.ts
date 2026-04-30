export type ObjectiveType =
  | 'maximize_conversions_with_stage_minimums'
  | 'maximize_target_attainment'
  | 'maximize_revenue'
  | 'maximize_profit'
  | 'maximize_weighted_score'

export interface ObjectiveOption {
  value: ObjectiveType
  label: string
  description: string
  hint: string
}

export const OBJECTIVE_OPTIONS: ObjectiveOption[] = [
  {
    value: 'maximize_conversions_with_stage_minimums',
    label: 'Maximise Conversions',
    description: 'Get the most leads or sign-ups while keeping all 4 RACE stages funded.',
    hint: 'Best default for most campaigns',
  },
  {
    value: 'maximize_target_attainment',
    label: 'Hit KPI Targets',
    description: 'Allocate budget to best meet the KPI targets set in your campaign brief.',
    hint: 'Requires KPI targets to be set on your campaign phases',
  },
  {
    value: 'maximize_revenue',
    label: 'Maximise Revenue',
    description: 'Optimise total revenue across all stages.',
    hint: 'Requires revenue data from connected platforms',
  },
  {
    value: 'maximize_profit',
    label: 'Maximise Profit',
    description: 'Optimise return on investment after costs.',
    hint: 'Requires both revenue and spend data',
  },
  {
    value: 'maximize_weighted_score',
    label: 'Balanced Multi-KPI Score',
    description: 'Balance multiple KPIs across stages with equal weighting.',
    hint: 'Good for awareness + conversion goals together',
  },
]

export interface CampaignPhase {
  phase_id: string
  phase_name: string
  sort_order: number
  kpis: Array<{
    kpi_id?: number
    kpi_name: string
    target_numeric: number | null
  }>
}

export interface CampaignInfo {
  campaign_id: string
  campaign_name: string
  client_name: string
  budget_total: number | null
  budget_currency: string | null
  phases: CampaignPhase[]
}

export interface PhaseAllocation {
  campaign_id: string
  name: string
  stage: string
  channel?: string | null
  allocated_budget: number
  min_budget?: number
  max_budget?: number
  expected_outputs?: Record<string, number>
  allocation_reason?: string
  blockers?: string[]
}

export interface ConstraintDiagnostic {
  constraint: string
  status: 'binding' | 'satisfied' | 'violated' | 'not_applicable'
  actual_value: number | null
  lower_bound: number | null
  upper_bound: number | null
  slack_value: number | null
  penalty: number | null
  details: string | null
}

export interface ScenarioResult {
  total_budget: number
  total_allocated_budget: number
  unallocated_budget: number
  objective_value: number
  status: string
  allocations?: PhaseAllocation[]
}

export interface CoefficientSummary {
  phase: string
  channel?: string
  kpi: string
  coefficient: number
  confidence: number
  source: string
  observed_spend?: number | null
  observed_kpi?: number | null
}

export interface SolverResult {
  success?: boolean
  objective_type?: string
  objective_value?: number | null
  allocations: PhaseAllocation[]
  spend_by_stage?: Record<string, number>
  expected_kpi_totals?: Record<string, number>
  diagnostics?: {
    requested_budget?: number
    allocated_budget?: number
    unallocated_budget?: number
    infeasible_reasons?: string[]
    relaxation_suggestions?: Array<{
      constraint: string
      suggested_action: string
      delta?: number | null
      rationale?: string
    }>
    constraint_diagnostics?: ConstraintDiagnostic[]
  }
}

export interface OptimizerRunResult {
  run_id: string
  success: boolean
  solver_status: string
  allocated_budget: number
  unallocated_budget: number
  objective_value: number
  objective_type: string
  result: SolverResult
  scenarios: ScenarioResult[]
  coefficient_summary: CoefficientSummary[]
  explain: Record<string, unknown> | null
}

export interface OptimizerRunSummary {
  run_id: string
  campaign_id: string | null
  created_at: string
  planning_period: string | null
  currency: string
  total_budget: number
  objective_type: string
  success: boolean
  allocated_budget: number | null
  unallocated_budget: number | null
}

export interface RunParams {
  campaign_id: string
  total_budget: number
  objective_type: ObjectiveType
  planning_period: string
  currency: string
  constraint_overrides?: ParsedConstraints | null
  onboarding_transcript?: Array<{ role: string; content: string }> | null
}

export interface ParsedConstraints {
  stage_minimum_percentages: Record<string, number>
  stage_maximum_percentages: Record<string, number>
  locked_phases: Array<{ phase_id: string; budget: number }>
  notes: string
  raw_text: string
}

export interface RunAnalysis {
  narrative: string
  recommendations: string[]
}

export type ObjectiveAvailability = 'available' | 'needs-targets' | 'needs-revenue'
