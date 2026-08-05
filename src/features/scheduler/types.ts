// Mia Scheduler — types mirroring routes/scheduler.py responses (mia-backend).

export interface SchedulerCampaign {
  campaign_id: string
  campaign_name: string
  client_name: string | null
  status: string
  is_primary: boolean
  budget_total: number | null
  budget_currency: string | null
  start_date: string | null
  end_date: string | null
}

export interface SchedulerAssignment {
  task_id: string
  name: string
  action_id: string | null
  is_prep: boolean
  scheduled: boolean
  reason: string | null
  value: number
  assigned_people: string[]
  start_date?: string
  end_date?: string
}

export interface ResourceSlotUsage {
  slot: number
  capacity: number
  used: number
  free: number
  date?: string
}

export interface ResourceUtilization {
  resource_id: string
  name?: string
  kind: 'renewable' | 'non_renewable'
  capabilities: string[]
  peak_usage: number
  total_capacity: number | null
  total_used: number
  utilization_rate: number
  by_slot: ResourceSlotUsage[]
}

export interface ScheduleDiagnostics {
  requested_tasks: number
  scheduled_tasks: number
  dropped_tasks: string[]
  makespan: number | null
  infeasible_reasons: string[]
}

export interface SkippedAction {
  action_id: string
  channel: string
  reason: string
}

export interface SchedulerRunResult {
  run_id: string
  success: boolean
  stage: 'validate' | 'schedule'
  error?: string
  validation?: {
    valid: boolean
    errors: Array<{ severity: string; location: string; message: string }>
    warnings: Array<{ severity: string; location: string; message: string }>
    infeasible_reasons: string[]
  }
  horizon_start?: string
  horizon_days?: number
  assignments?: SchedulerAssignment[]
  resource_utilization?: ResourceUtilization[]
  diagnostics?: ScheduleDiagnostics
  skipped_actions?: SkippedAction[]
  production_overdue?: string[]
  value_sources?: Record<string, string>
  optimizer_allocations_used?: boolean
}

export interface SchedulerRunSummary {
  run_id: string
  campaign_id: string | null
  created_at: string | null
  horizon_start: string | null
  horizon_days: number
  success: boolean
  solver_status: string | null
  requested_tasks: number | null
  scheduled_tasks: number | null
  dropped_tasks: number | null
  error: string | null
  applied_at: string | null
}

export interface AvailabilityResult {
  horizon: number
  horizon_start: string
  resources: ResourceUtilization[]
}

export interface ApplyResult {
  run_id: string
  applied: Array<{ action_id: string; name: string; old: string[]; new: string[] }>
  skipped: Array<{ action_id: string; reason: string }>
}
