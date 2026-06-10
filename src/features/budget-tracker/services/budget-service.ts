import { apiFetch, createSessionHeaders } from '../../../utils/api'
import type { BudgetSnapshot, CampaignSummary } from '../types'

export interface BudgetQuery {
  mode?: 'monthly' | 'campaign'
  month?: string // "YYYY-MM"
  display_currency?: string
}

export const fetchBudgetSnapshot = async (
  sessionId: string,
  tenantId: string,
  campaignId: string,
  query: BudgetQuery = {},
): Promise<BudgetSnapshot | null> => {
  const params = new URLSearchParams(
    Object.entries(query).filter(([, v]) => v != null && v !== '') as [string, string][],
  )
  const qs = params.toString()
  const response = await apiFetch(
    `/api/tenants/${tenantId}/budget-tracker/${campaignId}${qs ? `?${qs}` : ''}`,
    { headers: createSessionHeaders(sessionId) },
  )
  if (!response.ok) return null
  return response.json()
}

export const listCampaigns = async (
  sessionId: string,
  tenantId: string,
): Promise<CampaignSummary[]> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/campaigns/`, {
    headers: createSessionHeaders(sessionId),
  })
  if (!response.ok) return []
  return response.json()
}
