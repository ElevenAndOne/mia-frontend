import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { fetchPlatformCampaigns } from '../services/campaign-api'
import type { LinkedCampaign } from '../types'

// Loads the linkable platform campaigns / lists for a channel (Meta, Google,
// Brevo, HubSpot, …) for the picker modal. Cache-first: the picker used to hit the
// platform APIs on every open — the last result now shows instantly and refreshes
// in the background.
export function usePlatformCampaigns(channel: string) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const queryClient = useQueryClient()
  const [campaigns, setCampaigns] = useState<LinkedCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId || !tenantId) return
    let active = true
    const cacheKey = ['platform-campaigns', tenantId, channel]
    const cached = queryClient.getQueryData<LinkedCampaign[]>(cacheKey)
    if (cached) {
      setCampaigns(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }
    fetchPlatformCampaigns(sessionId, tenantId, channel)
      .then((d) => {
        if (!active) return
        queryClient.setQueryData(cacheKey, d.campaigns || [])
        setCampaigns(d.campaigns || [])
        if (d.message) setError(d.message)
      })
      .catch(() => active && !cached && setError('Failed to load campaigns'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [channel, sessionId, tenantId, queryClient])

  return { campaigns, loading, error }
}
