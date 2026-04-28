import { useCallback, useEffect, useState } from 'react'
import { getActiveCampaign, listOptimizerRuns, runOptimizer } from '../services/strategise-service'
import type {
  CampaignInfo,
  OptimizerRunResult,
  OptimizerRunSummary,
  RunParams,
} from '../types'

export const useStrategise = (sessionId: string | null, tenantId?: string | null) => {
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null)
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(true)
  const [runs, setRuns] = useState<OptimizerRunSummary[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<OptimizerRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId || !tenantId) {
      setIsLoadingCampaign(false)
      return
    }

    setIsLoadingCampaign(true)
    Promise.all([
      getActiveCampaign(sessionId, tenantId),
      listOptimizerRuns(sessionId, tenantId),
    ])
      .then(([cam, runList]) => {
        setCampaign(cam)
        setRuns(runList)
      })
      .catch(() => {
        setCampaign(null)
      })
      .finally(() => setIsLoadingCampaign(false))
  }, [sessionId, tenantId])

  const run = useCallback(
    async (params: RunParams) => {
      if (!sessionId || !tenantId) return
      try {
        setIsRunning(true)
        setError(null)
        const res = await runOptimizer(sessionId, tenantId, params)
        setResult(res)
        // Refresh run history in background
        listOptimizerRuns(sessionId, tenantId).then(setRuns).catch(() => {})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Optimisation failed')
      } finally {
        setIsRunning(false)
      }
    },
    [sessionId, tenantId],
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { campaign, isLoadingCampaign, runs, isRunning, result, error, run, reset }
}
