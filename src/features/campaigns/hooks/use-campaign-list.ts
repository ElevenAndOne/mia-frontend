import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { fetchCampaignList } from '../services/campaign-api'
import type { CampaignSummary } from '../types'

// Loads the workspace's campaign summaries (for the switcher + default
// resolution). Cheap call — no platform API hits.
export function useCampaignList() {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const [list, setList] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!sessionId || !tenantId) return
    setLoading(true)
    setError(null)
    try {
      setList(await fetchCampaignList(sessionId, tenantId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [sessionId, tenantId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { list, setList, loading, error, reload }
}

// The campaign to open by default: primary → first live → first overall.
export function resolveDefaultCampaign(list: CampaignSummary[]): CampaignSummary | null {
  return list.find((c) => c.is_primary) ?? list.find((c) => c.status === 'live') ?? list[0] ?? null
}
