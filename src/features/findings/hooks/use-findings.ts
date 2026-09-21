import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { logger } from '../../../utils/logger'
import {
  FindingsRequestError,
  acknowledgeFinding,
  fetchFindings,
  runFindings,
} from '../services/findings-service'
import {
  SEVERITY_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  buildFindingCard,
  emptyLabelFor,
  filterBySeverity,
  groupBySeverity,
} from '../utils/findings-view-model'
import type {
  FindingsGroup,
  RunFindingsResponse,
  SeverityFilter,
  SeverityFilterOption,
  StatusFilter,
  StatusFilterOption,
} from '../types'

export interface FindingsOptions {
  /** Mia campaign id — scopes the feed to that campaign. */
  campaignId?: string
  /** Cap on cards shown (compact panels). Undefined = everything the API returns. */
  maxItems?: number
}

export interface FindingsState {
  loading: boolean
  available: boolean
  groups: FindingsGroup[]
  /** Findings matching the status filter before the severity filter and cap. */
  total: number
  emptyLabel: string | null
  severityFilter: SeverityFilter
  setSeverityFilter: (value: SeverityFilter) => void
  severityOptions: SeverityFilterOption[]
  statusFilter: StatusFilter
  setStatusFilter: (value: StatusFilter) => void
  statusOptions: StatusFilterOption[]
  acknowledge: (findingId: number) => void
  acknowledgingId: number | null
  /** Owners and admins may trigger a fresh analysis run. */
  canRun: boolean
  run: () => void
  running: boolean
}

const API_LIMIT = 50

const runSummary = (result: RunFindingsResponse): string => {
  const parts = [
    result.new !== undefined ? `${result.new} new` : null,
    result.resolved !== undefined ? `${result.resolved} resolved` : null,
  ].filter(Boolean)
  return parts.length > 0 ? `Analysis refreshed · ${parts.join(' · ')}` : 'Analysis refreshed'
}

const runErrorMessage = (error: unknown): string =>
  error instanceof FindingsRequestError && error.status === 403
    ? 'Only workspace owners and admins can refresh the analysis.'
    : "Couldn't refresh the analysis. Please try again."

// The nightly-analysis feed for the active workspace. Quiet on `available: false`
// and on fetch errors (nothing rendered, one warning logged). Severity filtering is
// client-side so toggling it never refetches; status changes the query.
export const useFindings = ({ campaignId, maxItems }: FindingsOptions = {}): FindingsState => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const tenantId = activeWorkspace?.tenant_id ?? null
  const role = activeWorkspace?.role
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')

  const enabled = !!sessionId && !!tenantId
  const limit = maxItems ?? API_LIMIT

  const query = useQuery({
    queryKey: ['findings', tenantId, campaignId ?? null, statusFilter, limit],
    queryFn: ({ signal }) =>
      fetchFindings(
        sessionId!,
        tenantId!,
        { status: statusFilter, campaign_id: campaignId, limit },
        signal
      ),
    enabled,
    retry: false,
  })
  const data = query.data?.available ? query.data : null
  const unavailableReason =
    query.data && !query.data.available ? (query.data.reason ?? 'not configured') : null

  useEffect(() => {
    if (query.error) logger.warn('[findings] unavailable:', query.error)
  }, [query.error])
  useEffect(() => {
    if (unavailableReason) logger.warn('[findings] semantic layer not available:', unavailableReason)
  }, [unavailableReason])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['findings', tenantId] })

  const ackMutation = useMutation({
    mutationFn: (findingId: number) => acknowledgeFinding(sessionId!, tenantId!, findingId),
    onSuccess: invalidate,
    onError: (error) => {
      logger.warn('[findings] acknowledge failed:', error)
      showToast('error', "Couldn't acknowledge this finding. Please try again.")
    },
  })

  const runMutation = useMutation({
    mutationFn: () => runFindings(sessionId!, tenantId!),
    onSuccess: (result) => {
      showToast('success', runSummary(result))
      void invalidate()
    },
    onError: (error) => {
      logger.warn('[findings] run failed:', error)
      showToast(error instanceof FindingsRequestError && error.status === 403 ? 'warning' : 'error', runErrorMessage(error))
    },
  })

  const groups = useMemo(() => {
    if (!data) return []
    const shown = filterBySeverity(data.findings, severityFilter).slice(0, limit)
    return groupBySeverity(shown.map(buildFindingCard))
  }, [data, severityFilter, limit])
  const shownCount = groups.reduce((sum, group) => sum + group.items.length, 0)

  return {
    loading: enabled && query.isPending,
    available: !!data,
    groups,
    total: data?.findings.length ?? 0,
    emptyLabel: data ? emptyLabelFor(data.findings.length, shownCount) : null,
    severityFilter,
    setSeverityFilter,
    severityOptions: SEVERITY_FILTER_OPTIONS,
    statusFilter,
    setStatusFilter,
    statusOptions: STATUS_FILTER_OPTIONS,
    acknowledge: (findingId) => ackMutation.mutate(findingId),
    acknowledgingId: ackMutation.isPending ? (ackMutation.variables ?? null) : null,
    canRun: role === 'owner' || role === 'admin',
    run: () => runMutation.mutate(),
    running: runMutation.isPending,
  }
}
