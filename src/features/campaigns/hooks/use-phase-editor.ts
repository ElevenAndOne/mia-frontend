import { useCallback } from 'react'
import { useToast } from '../../../contexts/toast-context'
import { commitPatch } from '../utils/commit-patch'
import { mapPhase } from '../utils/update-helpers'
import * as api from '../services/campaign-api'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import type { KPI, Phase } from '../types'

// Edits scoped to one phase: phase fields, KPIs, and adding/removing channels.
export function usePhaseEditor(phaseId: string) {
  const { tenantId, sessionId, campaign, setCampaign } = useCampaignWorkspace()
  const { showToast } = useToast()
  const id = campaign.campaign_id

  const applyPhase = useCallback(
    (fn: (phase: Phase) => Phase) =>
      setCampaign((prev) => (prev ? mapPhase(prev, phaseId, fn) : prev)),
    [setCampaign, phaseId],
  )

  const patchPhase = useCallback(
    async (fields: Partial<Phase>) => {
      await commitPatch(
        () => api.patchPhase(sessionId, tenantId, id, phaseId, fields),
        () => applyPhase((p) => ({ ...p, ...fields })),
        showToast,
      )
    },
    [sessionId, tenantId, id, phaseId, applyPhase, showToast],
  )

  const addKpi = useCallback(
    async (name: string, target: string) => {
      const res = await api.createKpi(sessionId, tenantId, id, phaseId, {
        kpi_name: name,
        target_value: target || undefined,
      })
      if (!res.ok) return false
      const d = await res.json()
      const kpi: KPI = {
        kpi_id: d.kpi_id,
        kpi_name: d.kpi_name,
        target_value: target || null,
        target_numeric: null,
        unit: null,
      }
      applyPhase((p) => ({ ...p, kpis: [...p.kpis, kpi] }))
      return true
    },
    [sessionId, tenantId, id, phaseId, applyPhase],
  )

  const patchKpi = useCallback(
    async (kpiId: number, fields: Partial<KPI>) => {
      await commitPatch(
        () => api.patchKpi(sessionId, tenantId, id, kpiId, fields),
        () => applyPhase((p) => ({ ...p, kpis: p.kpis.map((k) => (k.kpi_id === kpiId ? { ...k, ...fields } : k)) })),
        showToast,
      )
    },
    [sessionId, tenantId, id, applyPhase, showToast],
  )

  const deleteKpi = useCallback(
    async (kpiId: number) => {
      const res = await api.deleteKpi(sessionId, tenantId, id, kpiId)
      if (res.ok) applyPhase((p) => ({ ...p, kpis: p.kpis.filter((k) => k.kpi_id !== kpiId) }))
    },
    [sessionId, tenantId, id, applyPhase],
  )

  const addChannel = useCallback(
    async (channel: string) => {
      const res = await api.createChannelAction(sessionId, tenantId, id, phaseId, { channel })
      if (!res.ok) return
      const d = await res.json()
      applyPhase((p) => ({
        ...p,
        channel_actions: [
          ...p.channel_actions,
          {
            action_id: d.action_id,
            channel: d.channel,
            objective: null,
            strategy: null,
            action_notes: null,
            budget: null,
            budget_period: null,
            start_date: null,
            end_date: null,
            assets: [],
            linked_platform_campaigns: null,
          },
        ],
      }))
    },
    [sessionId, tenantId, id, phaseId, applyPhase],
  )

  const removeChannel = useCallback(
    async (actionId: string) => {
      const res = await api.deleteChannelAction(sessionId, tenantId, id, actionId)
      if (res.ok) {
        applyPhase((p) => ({
          ...p,
          channel_actions: p.channel_actions.filter((a) => a.action_id !== actionId),
        }))
      }
    },
    [sessionId, tenantId, id, applyPhase],
  )

  return { patchPhase, addKpi, patchKpi, deleteKpi, addChannel, removeChannel }
}
