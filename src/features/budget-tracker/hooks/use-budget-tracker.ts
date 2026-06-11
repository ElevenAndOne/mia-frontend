import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { fetchBudgetSnapshot, fetchRecommendation, listCampaigns } from '../services/budget-service'
import type { BudgetRecommendation, BudgetSnapshot, CampaignSummary } from '../types'

export const useBudgetTracker = () => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id ?? null

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [mode, setMode] = useState<'monthly' | 'campaign'>('monthly')

  const [snapshot, setSnapshot] = useState<BudgetSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [spendError, setSpendError] = useState(false)

  // Recommendation is expensive (optimizer + Claude, ~15-30s) → lazy, on demand.
  const [recommendation, setRecommendation] = useState<BudgetRecommendation | null>(null)
  const [recLoading, setRecLoading] = useState(false)

  // Load campaign list and default to the primary (or first) campaign.
  useEffect(() => {
    if (!sessionId || !tenantId) return
    let cancelled = false
    listCampaigns(sessionId, tenantId).then((list) => {
      if (cancelled) return
      setCampaigns(list)
      setCampaignId((current) => {
        if (current && list.some((c) => c.campaign_id === current)) return current
        const primary = list.find((c) => c.is_primary) ?? list[0]
        return primary?.campaign_id ?? null
      })
    })
    return () => {
      cancelled = true
    }
  }, [sessionId, tenantId])

  // Cancels the in-flight spend fetch when the campaign/mode changes or the user leaves
  // the page — otherwise a slow (~50s) prod fetch keeps running server-side and piles up.
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    if (!sessionId || !tenantId || !campaignId) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const { signal } = ctrl
    setLoading(true)
    setError(null)
    setSpendError(false)

    // Phase A — instant: allocations/committed/flexible from the DB (skips the slow
    // spend fetch) so the page paints immediately.
    let fast: BudgetSnapshot | null = null
    try {
      fast = await fetchBudgetSnapshot(
        sessionId, tenantId, campaignId, { mode, display_currency: 'USD', include_spend: false }, signal,
      )
    } catch {
      fast = null
    }
    if (signal.aborted) return
    if (fast) setSnapshot(fast)
    else {
      setError('Could not load budget data for this campaign.')
      setLoading(false)
      return
    }
    setLoading(false)

    // Phase B — fill in live spend. On failure/timeout, clear the pending state so spend
    // shows "—" with a retry, rather than spinning on "…" forever.
    try {
      const full = await fetchBudgetSnapshot(
        sessionId, tenantId, campaignId, { mode, display_currency: 'USD' }, signal,
      )
      if (signal.aborted) return
      if (full) setSnapshot(full)
      else {
        setSpendError(true)
        setSnapshot((prev) => (prev ? { ...prev, spend_pending: false } : prev))
      }
    } catch {
      if (signal.aborted) return
      setSpendError(true)
      setSnapshot((prev) => (prev ? { ...prev, spend_pending: false } : prev))
    }
  }, [sessionId, tenantId, campaignId, mode])

  useEffect(() => {
    void load()
    return () => abortRef.current?.abort()
  }, [load])

  // Recommendation is cleared when the campaign or view (mode) changes — it's scoped to both.
  useEffect(() => {
    setRecommendation(null)
  }, [campaignId, mode])

  const loadRecommendation = useCallback(async () => {
    if (!sessionId || !tenantId || !campaignId) return
    setRecLoading(true)
    try {
      const rec = await fetchRecommendation(sessionId, tenantId, campaignId, mode)
      setRecommendation(rec ?? { available: false, reason: 'Could not generate a recommendation.' })
    } catch {
      setRecommendation({ available: false, reason: 'Could not generate a recommendation.' })
    } finally {
      setRecLoading(false)
    }
  }, [sessionId, tenantId, campaignId, mode])

  return {
    campaigns,
    campaignId,
    setCampaignId,
    mode,
    setMode,
    snapshot,
    loading,
    error,
    spendError,
    reload: load,
    recommendation,
    recLoading,
    loadRecommendation,
  }
}
