import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../../contexts/toast-context'
import {
  applySchedulerRun,
  getAvailability,
  listCampaigns,
  listSchedulerRuns,
  runScheduler,
} from '../services/scheduler-service'
import type {
  ApplyResult,
  AvailabilityResult,
  SchedulerCampaign,
  SchedulerRunResult,
  SchedulerRunSummary,
} from '../types'

export const useScheduler = (sessionId: string | null, tenantId?: string | null) => {
  const { showToast } = useToast()

  const [campaigns, setCampaigns] = useState<SchedulerCampaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [runs, setRuns] = useState<SchedulerRunSummary[]>([])

  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<SchedulerRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [availability, setAvailability] = useState<AvailabilityResult | null>(null)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)

  const [isApplying, setIsApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)

  const load = useCallback(async () => {
    if (!sessionId || !tenantId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setLoadError(false)
    try {
      const [campaignList, runList] = await Promise.all([
        listCampaigns(sessionId, tenantId),
        listSchedulerRuns(sessionId, tenantId),
      ])
      // Schedulable candidates: anything not archived, primary + live first.
      const ranked = campaignList
        .filter((c) => c.status !== 'archived')
        .sort(
          (a, b) =>
            Number(b.is_primary) - Number(a.is_primary) ||
            Number(b.status === 'live') - Number(a.status === 'live')
        )
      setCampaigns(ranked)
      setRuns(runList)
    } catch {
      setLoadError(true)
      showToast('error', "Couldn't load campaigns. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, tenantId, showToast])

  useEffect(() => {
    void load()
  }, [load])

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
        listSchedulerRuns(sessionId, tenantId)
          .then(setRuns)
          .catch(() => {})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Scheduling failed')
      } finally {
        setIsRunning(false)
      }
    },
    [sessionId, tenantId]
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
        listSchedulerRuns(sessionId, tenantId)
          .then(setRuns)
          .catch(() => {})
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to apply schedule')
      } finally {
        setIsApplying(false)
      }
    },
    [sessionId, tenantId, showToast]
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
