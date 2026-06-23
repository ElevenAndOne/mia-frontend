import { useCallback } from 'react'
import { useToast } from '../../../contexts/toast-context'
import { commitPatch } from '../utils/commit-patch'
import { mapAction, mapAsset, mapPhase } from '../utils/update-helpers'
import * as api from '../services/campaign-api'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import type { Asset, ChannelAction } from '../types'

// Edits scoped to one channel action: its own fields + its assets.
export function useChannelEditor(phaseId: string, actionId: string) {
  const { tenantId, sessionId, campaign, setCampaign } = useCampaignWorkspace()
  const { showToast } = useToast()
  const id = campaign.campaign_id

  const applyAction = useCallback(
    (fn: (action: ChannelAction) => ChannelAction) =>
      setCampaign((prev) => (prev ? mapPhase(prev, phaseId, (p) => mapAction(p, actionId, fn)) : prev)),
    [setCampaign, phaseId, actionId],
  )

  const patchAction = useCallback(
    async (fields: Partial<ChannelAction>) => {
      await commitPatch(
        () => api.patchChannelAction(sessionId, tenantId, id, actionId, fields),
        () => applyAction((a) => ({ ...a, ...fields })),
        showToast,
      )
    },
    [sessionId, tenantId, id, actionId, applyAction, showToast],
  )

  const addAsset = useCallback(async () => {
    const res = await api.createAsset(sessionId, tenantId, id, actionId, {
      asset_name: 'New asset',
      asset_type: 'static',
    })
    if (!res.ok) return
    const d = await res.json()
    const asset: Asset = {
      asset_id: d.asset_id,
      asset_name: d.asset_name,
      asset_type: 'static',
      key_message: null,
      cta: null,
      details: {},
      sort_order: 0,
      budget: null,
      budget_period: null,
      start_date: null,
      end_date: null,
    }
    applyAction((a) => ({ ...a, assets: [...a.assets, { ...asset, sort_order: a.assets.length }] }))
  }, [sessionId, tenantId, id, actionId, applyAction])

  const patchAsset = useCallback(
    async (assetId: string, fields: Partial<Asset>) => {
      await commitPatch(
        () => api.patchAsset(sessionId, tenantId, id, assetId, fields),
        () => applyAction((a) => mapAsset(a, assetId, (asset) => ({ ...asset, ...fields }))),
        showToast,
      )
    },
    [sessionId, tenantId, id, applyAction, showToast],
  )

  const deleteAsset = useCallback(
    async (assetId: string) => {
      const res = await api.deleteAsset(sessionId, tenantId, id, assetId)
      if (res.ok) applyAction((a) => ({ ...a, assets: a.assets.filter((x) => x.asset_id !== assetId) }))
    },
    [sessionId, tenantId, id, applyAction],
  )

  return { patchAction, addAsset, patchAsset, deleteAsset }
}
