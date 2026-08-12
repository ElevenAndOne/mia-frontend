import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { fetchBudgetSnapshot, fetchRecommendation, listCampaigns } from '../services/budget-service'
import type { BudgetRecommendation, BudgetSnapshot } from '../types'

export const useBudgetTracker = () => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const tenantId = activeWorkspace?.tenant_id ?? null

  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [mode, setMode] = useState<'monthly' | 'campaign'>('monthly')
  // null = let the backend pick (current/clamped month); "YYYY-MM" = a specific month.
  const [month, setMonth] = useState<string | null>(null)

  // Campaign list via React Query — shared cache, instant on revisit.
  const { data: campaignsData, isError: campaignsError } = useQuery({
    queryKey: ['budget-campaigns', tenantId],
    queryFn: () => listCampaigns(sessionId!, tenantId!),
    enabled: !!sessionId && !!tenantId,
  })
  const campaigns = campaignsData ?? []

  // Default to the primary (or first) campaign once the list arrives.
  useEffect(() => {
    if (!campaignsData) return
    setCampaignId((current) => {
      if (current && campaignsData.some((c) => c.campaign_id === current)) return current
      const primary = campaignsData.find((c) => c.is_primary) ?? campaignsData[0]
      return primary?.campaign_id ?? null
    })
  }, [campaignsData])

  useEffect(() => {
    if (campaignsError) showToast('error', "Couldn't load your campaigns. Please try again.")
  }, [campaignsError, showToast])

  // Snapshot via React Query, still two-phase for progressive render:
  // Phase A (fast) — allocations/committed/flexible from the DB, paints immediately.
  // Phase B (full) — the slow (~50s prod) live-spend fetch fills in after.
  // Both phases cache, so a revisit shows the complete snapshot instantly.
  // React Query aborts the queryFn's signal when the key changes or the page
  // unmounts — same cancel-the-slow-prod-fetch behavior the old AbortController
  // provided.
  const monthArg = mode === 'monthly' && month ? month : undefined
  const snapshotEnabled = !!sessionId && !!tenantId && !!campaignId

  const fastQuery = useQuery({
    queryKey: ['budget-snapshot', tenantId, campaignId, mode, monthArg ?? null, 'fast'],
    queryFn: async ({ signal }) => {
      const snap = await fetchBudgetSnapshot(
        sessionId!, tenantId!, campaignId!,
        { mode, month: monthArg, display_currency: 'USD', include_spend: false }, signal,
      )
      if (!snap) throw new Error('Could not load budget data for this campaign.')
      return snap
    },
    enabled: snapshotEnabled,
  })

  const fullQuery = useQuery({
    queryKey: ['budget-snapshot', tenantId, campaignId, mode, monthArg ?? null, 'full'],
    queryFn: async ({ signal }) => {
      const snap = await fetchBudgetSnapshot(
        sessionId!, tenantId!, campaignId!,
        { mode, month: monthArg, display_currency: 'USD' }, signal,
      )
      if (!snap) throw new Error('Spend fetch failed.')
      return snap
    },
    enabled: snapshotEnabled,
    // The spend fetch is expensive — surface the failure (spendError + retry
    // button) instead of silently re-running a ~50s request.
    retry: false,
  })

  const spendError = fullQuery.isError
  const snapshot: BudgetSnapshot | null = useMemo(() => {
    if (fullQuery.data) return fullQuery.data
    const fast = fastQuery.data
    if (!fast) return null
    if (!spendError) return fast
    // Spend failed: clear the pending flags so spend shows "—" with a retry,
    // rather than the platform rows pulsing "…" forever.
    return {
      ...fast,
      spend_pending: false,
      platforms: fast.platforms.map((p) => ({ ...p, spend_pending: false })),
    }
  }, [fastQuery.data, fullQuery.data, spendError])

  const loading = snapshotEnabled && (fastQuery.isPending || fastQuery.isFetching) && !fullQuery.data
  const error =
    fastQuery.isError && !snapshot ? 'Could not load budget data for this campaign.' : null

  const { refetch: refetchFast } = fastQuery
  const { refetch: refetchFull } = fullQuery
  const load = useCallback(async () => {
    await Promise.all([refetchFast(), refetchFull()])
  }, [refetchFast, refetchFull])

  // Exposed campaign setter: reset `month` in the SAME update as the campaign change.
  // A specific month doesn't carry across campaigns (different date ranges); doing this
  // in a trailing effect instead fired one phase-A fetch with the stale month and then a
  // second after the reset landed (double fetch + a flash of the wrong window label).
  const selectCampaign = useCallback((id: string | null) => {
    setMonth(null)
    setCampaignId(id)
  }, [])

  // Recommendation is expensive (optimizer + Claude, ~15-30s) → lazy, on demand.
  // enabled:false = never auto-fetches; loadRecommendation (the button) triggers it.
  // Cached per campaign+mode so flipping Monthly/Whole-campaign restores the
  // already-generated one instantly — and, unlike the old per-mount ref cache,
  // it now survives leaving and revisiting the page. Scoped to mode (not month)
  // since the optimizer works on the monthly/total budget, identical across months.
  const recQuery = useQuery({
    queryKey: ['budget-recommendation', tenantId, campaignId, mode],
    queryFn: async () =>
      (await fetchRecommendation(sessionId!, tenantId!, campaignId!, mode)) ??
      ({ available: false, reason: 'Could not generate a recommendation.' } as BudgetRecommendation),
    enabled: false,
    staleTime: Infinity,
    retry: false,
  })

  const recommendation: BudgetRecommendation | null =
    recQuery.data ??
    (recQuery.isError
      ? { available: false, reason: 'Could not generate a recommendation.' }
      : null)
  const recLoading = recQuery.isFetching

  const { refetch: refetchRec } = recQuery
  const loadRecommendation = useCallback(async () => {
    if (!sessionId || !tenantId || !campaignId) return
    await refetchRec()
  }, [sessionId, tenantId, campaignId, refetchRec])

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
