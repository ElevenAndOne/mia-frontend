import { apiFetch } from '../../../utils/api'
import type {
  ClientReport,
  ClickUpSpace,
  GenerateReportParams,
  ReportSummary,
} from '../types'

export const generateReport = async (
  sessionId: string,
  tenantId: string,
  params: GenerateReportParams,
): Promise<ClientReport> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg = err?.detail || `Report generation failed (${response.status})`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return response.json()
}

export const listReports = async (
  sessionId: string,
  tenantId: string,
): Promise<ReportSummary[]> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/reports`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) return []
  return response.json()
}

export const getReport = async (
  sessionId: string,
  tenantId: string,
  reportId: string,
): Promise<ClientReport | null> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/reports/${reportId}`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) return null
  return response.json()
}

export const patchReport = async (
  sessionId: string,
  tenantId: string,
  reportId: string,
  overrides: Record<string, unknown>,
): Promise<ClientReport> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/reports/${reportId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
    body: JSON.stringify({ manual_overrides: overrides }),
  })
  if (!response.ok) throw new Error('Failed to save changes')
  return response.json()
}

export const deleteReport = async (
  sessionId: string,
  tenantId: string,
  reportId: string,
): Promise<void> => {
  await apiFetch(`/api/tenants/${tenantId}/reports/${reportId}`, {
    method: 'DELETE',
    headers: { 'X-Session-ID': sessionId },
  })
}

export const getClickUpSpaces = async (
  sessionId: string,
  tenantId: string,
): Promise<ClickUpSpace[]> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/reports/clickup/spaces`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) return []
  const data = await response.json()
  return data.spaces ?? []
}

export interface CampaignOption {
  campaign_id: string
  campaign_name: string
  client_name: string | null
  status: string
  channels: string[] | null
  clickup_list_id: string | null
}

export const listCampaignOptions = async (
  sessionId: string,
  tenantId: string,
): Promise<CampaignOption[]> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/campaigns/`, {
    headers: { 'X-Session-ID': sessionId },
  })
  if (!response.ok) return []
  return response.json()
}

export const linkClickUpList = async (
  sessionId: string,
  tenantId: string,
  campaignId: string,
  clickupListId: string,
): Promise<void> => {
  await apiFetch(`/api/tenants/${tenantId}/reports/campaigns/${campaignId}/clickup-list`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
    body: JSON.stringify({ clickup_list_id: clickupListId }),
  })
}
