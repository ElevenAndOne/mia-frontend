import { apiFetch, createSessionHeaders } from '../../../utils/api'
import type { BudgetRecommendation, BudgetSnapshot, CampaignSummary } from '../types'

export interface BudgetQuery {
  mode?: 'monthly' | 'campaign'
  month?: string // "YYYY-MM"
  display_currency?: string
  include_spend?: boolean
}

export const fetchBudgetSnapshot = async (
  sessionId: string,
  tenantId: string,
  campaignId: string,
  query: BudgetQuery = {},
  signal?: AbortSignal,
): Promise<BudgetSnapshot | null> => {
  const { include_spend, ...rest } = query
  const params = new URLSearchParams(
    Object.entries(rest).filter(([, v]) => v != null && v !== '') as [string, string][],
  )
  if (include_spend === false) params.set('include_spend', 'false')
  const qs = params.toString()
  const response = await apiFetch(
    `/api/tenants/${tenantId}/budget-tracker/${campaignId}${qs ? `?${qs}` : ''}`,
    { headers: createSessionHeaders(sessionId), signal },
  )
  if (!response.ok) return null
  return response.json()
}

export const fetchRecommendation = async (
  sessionId: string,
  tenantId: string,
  campaignId: string,
  mode?: 'monthly' | 'campaign',
): Promise<BudgetRecommendation | null> => {
  const qs = mode ? `?mode=${mode}` : ''
  const response = await apiFetch(
    `/api/tenants/${tenantId}/budget-tracker/${campaignId}/recommendation${qs}`,
    { method: 'POST', headers: createSessionHeaders(sessionId) },
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
