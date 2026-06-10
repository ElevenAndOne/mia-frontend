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

  const load = useCallback(async () => {
    if (!sessionId || !tenantId || !campaignId) return
    setLoading(true)
    setError(null)
    try {
      // Phase A — instant: allocations/committed/flexible from the DB (skips the slow
      // spend fetch) so the page paints immediately.
      const fast = await fetchBudgetSnapshot(sessionId, tenantId, campaignId, {
        mode,
        display_currency: 'USD',
        include_spend: false,
      })
      if (fast) setSnapshot(fast)
      else setError('Could not load budget data for this campaign.')
      setLoading(false)

      // Phase B — fill in live spend (cached → fast; cold → ~15s, but cards already show).
      const full = await fetchBudgetSnapshot(sessionId, tenantId, campaignId, {
        mode,
        display_currency: 'USD',
      })
      if (full) setSnapshot(full)
    } catch {
      setError('Could not load budget data for this campaign.')
      setLoading(false)
    }
  }, [sessionId, tenantId, campaignId, mode])

  useEffect(() => {
    void load()
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

  // Warm the OTHER mode's cache in the background after the current view loads, so
  // switching Monthly ⇄ Whole-campaign hits a warm cache instead of a cold ~15s fetch.
  const prewarmedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!snapshot || !sessionId || !tenantId || !campaignId) return
    const other = mode === 'monthly' ? 'campaign' : 'monthly'
    const key = `${campaignId}:${other}`
    if (prewarmedRef.current.has(key)) return
    prewarmedRef.current.add(key)
    void fetchBudgetSnapshot(sessionId, tenantId, campaignId, {
      mode: other,
      display_currency: 'USD',
    })
  }, [snapshot, sessionId, tenantId, campaignId, mode])

  return {
    campaigns,
    campaignId,
    setCampaignId,
    mode,
    setMode,
    snapshot,
    loading,
    error,
    reload: load,
    recommendation,
    recLoading,
    loadRecommendation,
  }
}
