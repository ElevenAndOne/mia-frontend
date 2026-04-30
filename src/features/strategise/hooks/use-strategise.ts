import { useCallback, useEffect, useState } from 'react'
import {
  analyzeRun,
  getActiveCampaign,
  listOptimizerRuns,
  parseConstraints,
  runOptimizer,
} from '../services/strategise-service'
import type {
  CampaignInfo,
  OptimizerRunResult,
  OptimizerRunSummary,
  ParsedConstraints,
  RunAnalysis,
  RunParams,
} from '../types'

export const useStrategise = (sessionId: string | null, tenantId?: string | null) => {
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null)
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(true)
  const [runs, setRuns] = useState<OptimizerRunSummary[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<OptimizerRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Constraint parsing
  const [isParsing, setIsParsing] = useState(false)
  const [parsedConstraints, setParsedConstraints] = useState<ParsedConstraints | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  // Post-run analysis
  const [analysis, setAnalysis] = useState<RunAnalysis | null>(null)
  const [isAnalysing, setIsAnalysing] = useState(false)

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

  const parseUserConstraints = useCallback(
    async (freeText: string, totalBudget: number, currency: string) => {
      if (!sessionId || !tenantId || !campaign || !freeText.trim()) return null
      try {
        setIsParsing(true)
        setParseError(null)
        const result = await parseConstraints(sessionId, tenantId, {
          free_text: freeText,
          phases: campaign.phases.map((p) => ({ phase_id: p.phase_id, phase_name: p.phase_name })),
          total_budget: totalBudget,
          currency,
        })
        setParsedConstraints(result)
        return result
      } catch {
        setParseError('Could not parse constraints — they will not be applied.')
        return null
      } finally {
        setIsParsing(false)
      }
    },
    [sessionId, tenantId, campaign],
  )

  const clearConstraints = useCallback(() => {
    setParsedConstraints(null)
    setParseError(null)
  }, [])

  const run = useCallback(
    async (params: RunParams) => {
      if (!sessionId || !tenantId) return
      try {
        setIsRunning(true)
        setError(null)
        setAnalysis(null)
        const res = await runOptimizer(sessionId, tenantId, params)
        setResult(res)
        listOptimizerRuns(sessionId, tenantId).then(setRuns).catch(() => {})
        // Auto-trigger analysis immediately so it's ready when user scrolls down
        if (res.run_id) {
          setIsAnalysing(true)
          analyzeRun(sessionId, tenantId, res.run_id)
            .then(setAnalysis)
            .catch(() => {})
            .finally(() => setIsAnalysing(false))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Optimisation failed')
      } finally {
        setIsRunning(false)
      }
    },
    [sessionId, tenantId],
  )

  const fetchAnalysis = useCallback(
    async (runId: string) => {
      if (!sessionId || !tenantId) return
      try {
        setIsAnalysing(true)
        const res = await analyzeRun(sessionId, tenantId, runId)
        setAnalysis(res)
      } catch {
        // non-fatal — analysis is optional
      } finally {
        setIsAnalysing(false)
      }
    },
    [sessionId, tenantId],
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setAnalysis(null)
    setParsedConstraints(null)
    setParseError(null)
  }, [])

  return {
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
    fetchAnalysis,
  }
}
