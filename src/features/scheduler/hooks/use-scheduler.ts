import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../../contexts/toast-context'
import {
  applySchedulerRun,
  getAvailability,
  listCampaigns,
  listSchedulerRuns,
  runScheduler,
} from '../services/scheduler-service'
import type { ApplyResult, AvailabilityResult, SchedulerRunResult } from '../types'

export const useScheduler = (sessionId: string | null, tenantId?: string | null) => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const enabled = !!sessionId && !!tenantId

  // Reads go through React Query: revisits render instantly from cache and the
  // two lists fetch in parallel.
  const campaignsQuery = useQuery({
    queryKey: ['scheduler-campaigns', tenantId],
    queryFn: async () => {
      const campaignList = await listCampaigns(sessionId!, tenantId!)
      // Schedulable candidates: anything not archived, primary + live first.
      return campaignList
        .filter((c) => c.status !== 'archived')
        .sort(
          (a, b) =>
            Number(b.is_primary) - Number(a.is_primary) ||
            Number(b.status === 'live') - Number(a.status === 'live')
        )
    },
    enabled,
  })
  const runsQuery = useQuery({
    queryKey: ['scheduler-runs', tenantId],
    queryFn: () => listSchedulerRuns(sessionId!, tenantId!),
    enabled,
  })

  const campaigns = campaignsQuery.data ?? []
  const runs = runsQuery.data ?? []
  const isLoading = enabled && (campaignsQuery.isPending || runsQuery.isPending)
  const loadError = campaignsQuery.isError || runsQuery.isError

  const { refetch: refetchCampaigns } = campaignsQuery
  const { refetch: refetchRuns } = runsQuery
  const load = useCallback(async () => {
    await Promise.all([refetchCampaigns(), refetchRuns()])
  }, [refetchCampaigns, refetchRuns])

  const refreshRuns = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['scheduler-runs', tenantId] })
  }, [queryClient, tenantId])

  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<SchedulerRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [availability, setAvailability] = useState<AvailabilityResult | null>(null)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)

  const [isApplying, setIsApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)

  const run = useCallback(
    async (campaignId: string, horizonDays?: number) => {
      if (!sessionId || !tenantId) return
      try {
        setIsRunning(true)
        setError(null)
        setApplyResult(null)
        const res = await runScheduler(sessionId, tenantId, {
          campaign_id: campaignId,
          horizon_days: horizonDays,
        })
        setResult(res)
        refreshRuns()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Scheduling failed')
      } finally {
        setIsRunning(false)
      }
    },
    [sessionId, tenantId, refreshRuns]
  )

  const loadAvailability = useCallback(
    async (horizonDays: number) => {
      if (!sessionId || !tenantId) return
      try {
        setIsLoadingAvailability(true)
        const res = await getAvailability(sessionId, tenantId, { horizon_days: horizonDays })
        setAvailability(res)
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to load team availability')
      } finally {
        setIsLoadingAvailability(false)
      }
    },
    [sessionId, tenantId, showToast]
  )

  const apply = useCallback(
    async (runId: string) => {
      if (!sessionId || !tenantId) return
      try {
        setIsApplying(true)
        const res = await applySchedulerRun(sessionId, tenantId, runId)
        setApplyResult(res)
        showToast('success', `Schedule applied — ${res.applied.length} flights updated`)
        refreshRuns()
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to apply schedule')
      } finally {
        setIsApplying(false)
      }
    },
    [sessionId, tenantId, showToast, refreshRuns]
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setApplyResult(null)
  }, [])

  return {
    campaigns,
    isLoading,
    loadError,
    reload: load,
    runs,
    isRunning,
    result,
    error,
    run,
    availability,
    isLoadingAvailability,
    loadAvailability,
    isApplying,
    applyResult,
    apply,
    reset,
  }
}
