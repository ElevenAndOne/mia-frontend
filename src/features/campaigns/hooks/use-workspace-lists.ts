import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { fetchCampaignGuides } from '../../campaign-guides/services/campaign-guide-service'
import { fetchBrevoLists, fetchChannelConfig, fetchHubspotLists, updateChannelConfig } from '../services/campaign-api'
import type { ChannelConfig } from '../types'

interface ListOption { list_id: number; name: string; size: number }
interface Guide { id: string; filename: string; campaign_name: string | null }

// Loads workspace-level references the Builder needs: HubSpot/Brevo contact
// lists (for KPI linking), the channel-config, and campaign guides (for linking).
export function useWorkspaceLists() {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const [hubspotLists, setHubspotLists] = useState<ListOption[]>([])
  const [hubspotListsMessage, setHubspotListsMessage] = useState<string | null>(null)
  const [hubspotNeedsReconnect, setHubspotNeedsReconnect] = useState(false)
  const [brevoLists, setBrevoLists] = useState<ListOption[]>([])
  const [channelConfig, setChannelConfig] = useState<ChannelConfig>({ hidden: [], custom: [] })
  const [guides, setGuides] = useState<Guide[]>([])

  useEffect(() => {
    if (!sessionId || !tenantId) return
    fetchHubspotLists(sessionId, tenantId)
      .then((data) => {
        setHubspotNeedsReconnect(Boolean(data?.needs_reconnect))
        if (data?.lists?.length) { setHubspotLists(data.lists); setHubspotListsMessage(null) }
        else setHubspotListsMessage(data?.message ?? 'HubSpot not connected')
      })
      .catch(() => setHubspotListsMessage('Could not load HubSpot lists'))
    fetchBrevoLists(sessionId, tenantId)
      .then((data) => { if (data?.lists?.length) setBrevoLists(data.lists) })
      .catch(() => {})
    fetchChannelConfig(sessionId, tenantId)
      .then((data) => { if (data) setChannelConfig({ hidden: data.hidden || [], custom: data.custom || [] }) })
      .catch(() => {})
  }, [sessionId, tenantId])

  useEffect(() => {
    if (!sessionId || !tenantId) return
    const load = () => {
      fetchCampaignGuides(sessionId, tenantId)
        .then((gs) => setGuides(gs.map((g) => ({ id: g.id, filename: g.filename, campaign_name: g.extracted_data?.campaign_name ?? null }))))
        .catch(() => {})
    }
    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [sessionId, tenantId])

  const saveChannelConfig = useCallback(
    async (config: ChannelConfig): Promise<boolean> => {
      if (!sessionId || !tenantId) return false
      const res = await updateChannelConfig(sessionId, tenantId, config)
      if (res.ok) setChannelConfig(config)
      return res.ok
    },
    [sessionId, tenantId],
  )

  return { hubspotLists, hubspotListsMessage, hubspotNeedsReconnect, brevoLists, channelConfig, saveChannelConfig, guides }
}
