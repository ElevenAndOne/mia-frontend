// Shared campaign-detail cache-bust helper.
// Campaign list/detail data lives in the React Query cache (see
// use-campaign-list / use-campaign-detail). This module exists so other
// features — e.g. the chat hook that lets Mia write channel actions — can bust
// that cache WITHOUT importing the campaigns feature's components.

import { queryClient } from '../../lib/query-client'

// Legacy module-level cache. Only the retired campaigns-view still reads it;
// live code goes through React Query.
const detailCache = new Map<string, unknown>()

export function getCachedDetail<T>(id: string): T | undefined {
  return detailCache.get(id) as T | undefined
}

export function setCachedDetail<T>(id: string, detail: T): void {
  detailCache.set(id, detail)
}

/** Invalidate ALL cached campaign data — call after any write that changes a
 *  campaign (e.g. Mia adds a channel action from chat). Mounted queries
 *  refetch in the background; unmounted ones refetch on next view. */
export function clearCampaignDetailCache(): void {
  detailCache.clear()
  void queryClient.invalidateQueries({ queryKey: ['campaign-detail'] })
  void queryClient.invalidateQueries({ queryKey: ['campaign-list'] })
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (k.startsWith('campaigns_detail_')) sessionStorage.removeItem(k)
    }
  } catch {
    /* ignore */
  }
}
