import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { fetchCampaignList } from '../services/campaign-api'
import type { CampaignSummary } from '../types'

export const campaignListKey = (tenantId: string | undefined) => ['campaign-list', tenantId]

// Loads the workspace's campaign summaries (for the switcher + default
// resolution). Cheap call — no platform API hits. Backed by React Query, so
// every consumer (the /campaigns resolver, the workspace page, pickers…)
// shares one cached fetch and revisits render instantly.
export function useCampaignList() {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const queryClient = useQueryClient()

  const { data, isPending, error, refetch } = useQuery({
    queryKey: campaignListKey(tenantId),
    queryFn: () => fetchCampaignList(sessionId!, tenantId!),
    enabled: !!sessionId && !!tenantId,
  })

  // Mutation hooks patch the list in place after the server confirms — write
  // straight into the shared cache so every consumer sees the update.
  const setList = useCallback(
    (next: CampaignSummary[] | ((prev: CampaignSummary[]) => CampaignSummary[])) => {
      queryClient.setQueryData<CampaignSummary[]>(campaignListKey(tenantId), (prev) =>
        typeof next === 'function' ? next(prev ?? []) : next
      )
    },
    [queryClient, tenantId]
  )

  const reload = useCallback(async () => {
    await refetch()
  }, [refetch])

  return {
    list: data ?? [],
    setList,
    loading: isPending,
    error: error ? (error instanceof Error ? error.message : 'Something went wrong') : null,
    reload,
  }
}

// The campaign to open by default: primary → first live → first overall.
export function resolveDefaultCampaign(list: CampaignSummary[]): CampaignSummary | null {
  return list.find((c) => c.is_primary) ?? list.find((c) => c.status === 'live') ?? list[0] ?? null
}
