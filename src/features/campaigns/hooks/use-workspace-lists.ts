import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { fetchCampaignGuides } from '../../campaign-guides/services/campaign-guide-service'
import { fetchBrevoLists, fetchChannelConfig, fetchHubspotLists, updateChannelConfig } from '../services/campaign-api'
import type { ChannelConfig } from '../types'

interface ListOption { list_id: number; name: string; size: number }
interface Guide { id: string; filename: string; campaign_name: string | null }

const EMPTY_CHANNEL_CONFIG: ChannelConfig = { hidden: [], custom: [] }

// Loads workspace-level references the Builder needs: HubSpot/Brevo contact
// lists (for KPI linking), the channel-config, and campaign guides (for linking).
// All via React Query: the four fetches run in parallel, are cached across
// Builder visits, and dedupe when several components mount the hook at once.
export function useWorkspaceLists() {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const queryClient = useQueryClient()
  const enabled = !!sessionId && !!tenantId

  const hubspotQuery = useQuery({
    queryKey: ['hubspot-lists', tenantId],
    queryFn: () => fetchHubspotLists(sessionId!, tenantId!),
    enabled,
  })
  const hubspotData = hubspotQuery.data
  const hubspotLists: ListOption[] = hubspotData?.lists?.length ? hubspotData.lists : []
  const hubspotNeedsReconnect = Boolean(hubspotData?.needs_reconnect)
  const hubspotListsMessage = hubspotQuery.isError
    ? 'Could not load HubSpot lists'
    : hubspotData && !hubspotData.lists?.length
      ? (hubspotData.message ?? 'HubSpot not connected')
      : null

  const brevoQuery = useQuery({
    queryKey: ['brevo-lists', tenantId],
    queryFn: () => fetchBrevoLists(sessionId!, tenantId!),
    enabled,
  })
  const brevoLists: ListOption[] = brevoQuery.data?.lists ?? []

  const channelConfigQuery = useQuery({
    queryKey: ['channel-config', tenantId],
    queryFn: () => fetchChannelConfig(sessionId!, tenantId!),
    enabled,
  })
  const channelConfig: ChannelConfig = channelConfigQuery.data
    ? {
        hidden: channelConfigQuery.data.hidden || [],
        custom: channelConfigQuery.data.custom || [],
      }
    : EMPTY_CHANNEL_CONFIG

  // Guides refetch on window focus so the list stays current after someone
  // uploads one in another tab. staleTime keeps that from firing more than
  // once per 30s — same throttle the old hand-rolled focus listener enforced.
  const guidesQuery = useQuery({
    queryKey: ['campaign-guides', tenantId],
    queryFn: () => fetchCampaignGuides(sessionId!, tenantId!),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
  const guides: Guide[] = (guidesQuery.data ?? []).map((g) => ({
    id: g.id,
    filename: g.filename,
    campaign_name: g.extracted_data?.campaign_name ?? null,
  }))

  const saveChannelConfig = useCallback(
    async (config: ChannelConfig): Promise<boolean> => {
      if (!sessionId || !tenantId) return false
      const res = await updateChannelConfig(sessionId, tenantId, config)
      if (res.ok) queryClient.setQueryData(['channel-config', tenantId], config)
      return res.ok
    },
    [sessionId, tenantId, queryClient],
  )

  return { hubspotLists, hubspotListsMessage, hubspotNeedsReconnect, brevoLists, channelConfig, saveChannelConfig, guides }
}
