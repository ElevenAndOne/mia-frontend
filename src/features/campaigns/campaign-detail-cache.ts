// Shared campaign-detail cache.
// Lives in its own module (not campaigns-view.tsx) so other features — e.g. the chat
// hook that lets Mia write channel actions — can bust it WITHOUT importing the heavy,
// lazy-loaded CampaignsView component into their bundle.

const detailCache = new Map<string, unknown>()

export function getCachedDetail<T>(id: string): T | undefined {
  return detailCache.get(id) as T | undefined
}

export function setCachedDetail<T>(id: string, detail: T): void {
  detailCache.set(id, detail)
}

/** Clear ALL cached campaign detail — call after any write that changes a campaign
 *  (e.g. Mia adds a channel action from chat) so the Campaigns page re-fetches fresh. */
export function clearCampaignDetailCache(): void {
  detailCache.clear()
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (k.startsWith('campaigns_detail_')) sessionStorage.removeItem(k)
    }
  } catch {
    /* ignore */
  }
}
