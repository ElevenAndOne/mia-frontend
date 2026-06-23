import { useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { fetchPlatformCampaigns } from '../services/campaign-api'
import type { LinkedCampaign } from '../types'

// Loads the linkable platform campaigns / lists for a channel (Meta, Google,
// Brevo, HubSpot, …) for the picker modal.
export function usePlatformCampaigns(channel: string) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const [campaigns, setCampaigns] = useState<LinkedCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId || !tenantId) return
    let active = true
    setLoading(true)
    fetchPlatformCampaigns(sessionId, tenantId, channel)
      .then((d) => {
        if (!active) return
        setCampaigns(d.campaigns || [])
        if (d.message) setError(d.message)
      })
      .catch(() => active && setError('Failed to load campaigns'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [channel, sessionId, tenantId])

  return { campaigns, loading, error }
}
