import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { fetchBudgetSnapshot, listCampaigns } from '../services/budget-service'
import type { BudgetSnapshot, CampaignSummary } from '../types'

export const useBudgetTracker = () => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id ?? null

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [mode, setMode] = useState<'monthly' | 'campaign'>('monthly')

  const [snapshot, setSnapshot] = useState<BudgetSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const data = await fetchBudgetSnapshot(sessionId, tenantId, campaignId, {
        mode,
        display_currency: 'USD',
      })
      if (data) setSnapshot(data)
      else setError('Could not load budget data for this campaign.')
    } catch {
      setError('Could not load budget data for this campaign.')
    } finally {
      setLoading(false)
    }
  }, [sessionId, tenantId, campaignId, mode])

  useEffect(() => {
    void load()
  }, [load])

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
  }
}
