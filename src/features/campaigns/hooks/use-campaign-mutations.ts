import { useCallback } from 'react'
import { useToast } from '../../../contexts/toast-context'
import { clearTrackerCache } from '../../campaign/services/campaign-tracker-service'
import { clearCampaignDetailCache } from '../campaign-detail-cache'
import { commitPatch } from '../utils/commit-patch'
import * as api from '../services/campaign-api'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import type { CampaignSummary, LinkedCampaign } from '../types'

// Campaign-level edits (header / objectives / guide / status / delete / picker).
// Each applies an optimistic update only after the server confirms.
export function useCampaignMutations() {
  const { tenantId, sessionId, campaign, setCampaign, setList } = useCampaignWorkspace()
  const { showToast } = useToast()
  const id = campaign.campaign_id

  const patchCampaign = useCallback(
    async (fields: Record<string, unknown>) => {
      await commitPatch(
        () => api.updateCampaign(sessionId, tenantId, id, fields),
        () => {
          setCampaign((prev) => (prev ? ({ ...prev, ...fields } as typeof prev) : prev))
          clearTrackerCache()
          if ('status' in fields || 'is_primary' in fields || 'campaign_name' in fields) {
            setList((prev) =>
              prev.map((c) =>
                c.campaign_id === id ? ({ ...c, ...fields } as CampaignSummary) : c,
              ),
            )
          }
        },
        showToast,
      )
    },
    [sessionId, tenantId, id, setCampaign, setList, showToast],
  )

  const cycleStatus = useCallback(() => {
    const next: Record<string, string> = {
      draft: 'live',
      live: 'paused',
      paused: 'live',
      completed: 'live',
    }
    void patchCampaign({ status: next[campaign.status] ?? 'live' })
  }, [campaign.status, patchCampaign])

  const linkGuide = useCallback(
    async (guideId: string | null) => {
      const res = await api.linkCampaignGuide(sessionId, tenantId, id, guideId)
      if (res.ok) setCampaign((prev) => (prev ? { ...prev, campaign_guide_id: guideId } : prev))
    },
    [sessionId, tenantId, id, setCampaign],
  )

  const saveObjectives = useCallback(
    async (objectives: string[]) => {
      const filtered = objectives.filter((o) => o.trim())
      const res = await api.updateObjectives(sessionId, tenantId, id, filtered)
      if (res.ok) setCampaign((prev) => (prev ? { ...prev, objectives: filtered } : prev))
      return res.ok
    },
    [sessionId, tenantId, id, setCampaign],
  )

  const savePickerLinks = useCallback(
    async (actionId: string, selected: LinkedCampaign[]) => {
      const res = await api.patchChannelAction(sessionId, tenantId, id, actionId, {
        linked_platform_campaigns: selected,
      })
      if (!res.ok) return
      setCampaign((prev) =>
        prev
          ? {
              ...prev,
              phases: prev.phases.map((ph) => ({
                ...ph,
                channel_actions: ph.channel_actions.map((ca) =>
                  ca.action_id === actionId
                    ? { ...ca, linked_platform_campaigns: selected }
                    : ca,
                ),
              })),
            }
          : prev,
      )
    },
    [sessionId, tenantId, id, setCampaign],
  )

  const removeCampaign = useCallback(async (): Promise<boolean> => {
    const res = await api.deleteCampaign(sessionId, tenantId, id)
    if (res.ok) {
      clearCampaignDetailCache()
      clearTrackerCache()
      setList((prev) => prev.filter((c) => c.campaign_id !== id))
    }
    return res.ok
  }, [sessionId, tenantId, id, setList])

  return { patchCampaign, cycleStatus, linkGuide, saveObjectives, savePickerLinks, removeCampaign }
}
