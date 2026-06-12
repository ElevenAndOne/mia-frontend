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
  // null = let the backend pick (current/clamped month); "YYYY-MM" = a specific month.
  const [month, setMonth] = useState<string | null>(null)

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
    const monthArg = mode === 'monthly' && month ? month : undefined
    let fast: BudgetSnapshot | null = null
    try {
      fast = await fetchBudgetSnapshot(
        sessionId, tenantId, campaignId,
        { mode, month: monthArg, display_currency: 'USD', include_spend: false }, signal,
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
        sessionId, tenantId, campaignId, { mode, month: monthArg, display_currency: 'USD' }, signal,
      )
      if (signal.aborted) return
      if (full) setSnapshot(full)
      else {
        setSpendError(true)
        setSnapshot((prev) =>
          prev
            ? {
                ...prev,
                spend_pending: false,
                // Clear per-row pending too — otherwise the platform rows pulse "…"
                // forever even though the summary recovers and shows the retry.
                platforms: prev.platforms.map((p) => ({ ...p, spend_pending: false })),
              }
            : prev,
        )
      }
    } catch {
      if (signal.aborted) return
      setSpendError(true)
      setSnapshot((prev) => (prev ? { ...prev, spend_pending: false } : prev))
    }
  }, [sessionId, tenantId, campaignId, mode, month])

  useEffect(() => {
    void load()
    return () => abortRef.current?.abort()
  }, [load])

  // Exposed campaign setter: reset `month` in the SAME update as the campaign change.
  // A specific month doesn't carry across campaigns (different date ranges); doing this
  // in a trailing effect instead fired one phase-A fetch with the stale month and then a
  // second after the reset landed (double fetch + a flash of the wrong window label).
  const selectCampaign = useCallback((id: string | null) => {
    setMonth(null)
    setCampaignId(id)
  }, [])

  // Cache the recommendation per view (campaign + mode) so flipping between Monthly /
  // Whole-campaign restores the already-generated one instantly instead of re-running the
  // expensive optimizer. Only the manual refresh button re-fetches. Scoped to mode (not
  // month) since the optimizer works on the monthly/total budget, identical across months.
  const recCacheRef = useRef<Record<string, BudgetRecommendation>>({})
  const recKey = campaignId ? `${campaignId}:${mode}` : null
  // Track the live view so a slow fetch that resolves after a view-flip doesn't land on
  // the wrong view (it still gets cached for when the user flips back).
  const recKeyRef = useRef(recKey)
  recKeyRef.current = recKey

  // On view change, show the cached recommendation for this view (or nothing if none yet).
  useEffect(() => {
    setRecommendation(recKey ? (recCacheRef.current[recKey] ?? null) : null)
  }, [recKey])

  const loadRecommendation = useCallback(async () => {
    if (!sessionId || !tenantId || !campaignId) return
    const key = `${campaignId}:${mode}`
    setRecLoading(true)
    try {
      const rec =
        (await fetchRecommendation(sessionId, tenantId, campaignId, mode)) ??
        ({ available: false, reason: 'Could not generate a recommendation.' } as BudgetRecommendation)
      recCacheRef.current[key] = rec
      if (recKeyRef.current === key) setRecommendation(rec)
    } catch {
      if (recKeyRef.current === key)
        setRecommendation({ available: false, reason: 'Could not generate a recommendation.' })
    } finally {
      setRecLoading(false)
    }
  }, [sessionId, tenantId, campaignId, mode])

  return {
    campaigns,
    campaignId,
    setCampaignId: selectCampaign,
    mode,
    setMode,
    month,
    setMonth,
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
