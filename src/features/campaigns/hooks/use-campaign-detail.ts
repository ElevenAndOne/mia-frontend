import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { fetchCampaignDetail } from '../services/campaign-api'
import type { CampaignDetail } from '../types'

export const campaignDetailKey = (tenantId: string | undefined, campaignId: string | undefined) =>
  ['campaign-detail', tenantId, campaignId]

// Loads one campaign's full detail. Backed by React Query (shared cache), so
// view switches and back-navigation render instantly and chat's
// clearCampaignDetailCache() invalidation triggers a background refetch. The
// returned setCampaign lets mutation hooks apply confirmed updates — it writes
// straight into the shared cache so every consumer sees fresh data.
export function useCampaignDetail(campaignId: string | undefined) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const queryClient = useQueryClient()

  const { data, isPending, error, refetch } = useQuery({
    queryKey: campaignDetailKey(tenantId, campaignId),
    queryFn: () => fetchCampaignDetail(sessionId!, tenantId!, campaignId!),
    enabled: !!sessionId && !!tenantId && !!campaignId,
  })

  const setCampaign = useCallback(
    (next: CampaignDetail | null | ((prev: CampaignDetail | null) => CampaignDetail | null)) => {
      queryClient.setQueryData<CampaignDetail | null>(
        campaignDetailKey(tenantId, campaignId),
        (prev) => (typeof next === 'function' ? next(prev ?? null) : next)
      )
    },
    [queryClient, tenantId, campaignId]
  )

  const reload = useCallback(async () => {
    if (campaignId) await refetch()
  }, [campaignId, refetch])

  return {
    campaign: data ?? null,
    setCampaign,
    loading: campaignId ? isPending : false,
    error: error ? (error instanceof Error ? error.message : 'Something went wrong') : null,
    reload,
  }
}
