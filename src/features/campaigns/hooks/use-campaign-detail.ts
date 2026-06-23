import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { getCachedDetail, setCachedDetail } from '../campaign-detail-cache'
import { fetchCampaignDetail } from '../services/campaign-api'
import type { CampaignDetail } from '../types'

// Loads one campaign's full detail (cached so view switches are instant). The
// returned setCampaign lets mutation hooks apply optimistic updates; it keeps
// the shared detail cache in sync so chat / budget-tracker see fresh data.
export function useCampaignDetail(campaignId: string | undefined) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const [campaign, setCampaignState] = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setCampaign = useCallback(
    (next: CampaignDetail | null | ((prev: CampaignDetail | null) => CampaignDetail | null)) => {
      setCampaignState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        if (resolved) setCachedDetail(resolved.campaign_id, resolved)
        return resolved
      })
    },
    [],
  )

  const load = useCallback(
    async (id: string, opts?: { bust?: boolean }) => {
      if (!sessionId || !tenantId) return
      if (!opts?.bust) {
        const cached = getCachedDetail<CampaignDetail>(id)
        if (cached) {
          setCampaignState(cached)
          setLoading(false)
          return
        }
      }
      setLoading(true)
      setError(null)
      try {
        const detail = await fetchCampaignDetail(sessionId, tenantId, id)
        setCachedDetail(id, detail)
        setCampaignState(detail)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    },
    [sessionId, tenantId],
  )

  useEffect(() => {
    if (campaignId) void load(campaignId)
    else {
      setCampaignState(null)
      setLoading(false)
    }
  }, [campaignId, load])

  const reload = useCallback(() => {
    if (campaignId) return load(campaignId, { bust: true })
    return Promise.resolve()
  }, [campaignId, load])

  return { campaign, setCampaign, loading, error, reload }
}
