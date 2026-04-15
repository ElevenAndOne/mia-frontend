import { apiFetch } from '../../../utils/api'

export interface CampaignKPI {
  kpi_name: string
  target_value: string | null
  target_numeric: number | null
  unit: string
}

export interface CampaignPhase {
  phase_id: string
  phase_name: string
  sort_order: number
  status: 'completed' | 'active' | 'upcoming'
  kpis: CampaignKPI[]
}

export interface CampaignTracker {
  campaign_id: string
  campaign_name: string
  client_name: string
  status: string
  start_date: string | null
  end_date: string | null
  current_phase: string | null
  phases: CampaignPhase[]
}

export interface KPIActual {
  kpi_name: string
  target_numeric: number | null
  target_value: string | null
  unit: string
  actual_value: number | null
  actual_label: string | null
}

export const fetchCampaignTracker = async (
  sessionId: string,
  tenantId: string,
): Promise<CampaignTracker | null> => {
  try {
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/tracker`, {
      headers: { 'X-Session-ID': sessionId },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.campaign ?? null
  } catch {
    return null
  }
}

export const fetchPhaseActuals = async (
  sessionId: string,
  tenantId: string,
  campaignId: string,
  phaseName: string,
): Promise<KPIActual[] | null> => {
  try {
    const res = await apiFetch(
      `/api/tenants/${tenantId}/campaigns/${campaignId}/actuals?phase=${encodeURIComponent(phaseName)}`,
      { headers: { 'X-Session-ID': sessionId } },
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.kpis ?? null
  } catch {
    return null
  }
}
