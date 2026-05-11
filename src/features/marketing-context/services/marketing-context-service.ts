import { apiFetch } from '../../../utils/api'
import type { BrandGuideExtracted, MarketingContext, UploadResult } from '../types'

function tenantParam(tenantId?: string | null): string {
  return tenantId ? `&tenant_id=${encodeURIComponent(tenantId)}` : ''
}

export async function fetchMarketingContext(
  sessionId: string,
  tenantId?: string | null
): Promise<MarketingContext | null> {
  const response = await apiFetch(
    `/api/marketing-context?session_id=${encodeURIComponent(sessionId)}${tenantParam(tenantId)}`
  )
  if (!response.ok) return null
  return response.json()
}

export async function uploadBrandGuide(
  sessionId: string,
  file: File,
  tenantId?: string | null
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiFetch(
    `/api/marketing-context/upload-brand-guide?session_id=${encodeURIComponent(sessionId)}${tenantParam(tenantId)}`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(err.detail || 'Upload failed')
  }

  return response.json()
}

export async function saveBrandGuideExtraction(
  sessionId: string,
  filename: string,
  brandGuideRaw: string,
  extracted: BrandGuideExtracted,
  tenantId?: string | null
): Promise<void> {
  const response = await apiFetch('/api/marketing-context/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      brand_guide_filename: filename,
      brand_guide_raw: brandGuideRaw,
      brand_guide_extracted: extracted,
      tenant_id: tenantId ?? null,
    }),
  })
  if (!response.ok) throw new Error('Failed to save brand guide')
}

export async function saveManualOverrides(
  sessionId: string,
  overrides: Partial<BrandGuideExtracted>,
  tenantId?: string | null
): Promise<void> {
  const response = await apiFetch('/api/marketing-context/overrides', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, overrides, tenant_id: tenantId ?? null }),
  })
  if (!response.ok) throw new Error('Failed to save overrides')
}

export async function refreshPlatformSnapshot(sessionId: string): Promise<void> {
  const response = await apiFetch(
    `/api/marketing-context/refresh-snapshot?session_id=${encodeURIComponent(sessionId)}`,
    { method: 'POST' }
  )
  if (!response.ok) throw new Error('Snapshot refresh failed')
}

export async function findCompetitors(
  sessionId: string,
  tenantId?: string | null
): Promise<string[]> {
  const response = await apiFetch(
    `/api/marketing-context/find-competitors?session_id=${encodeURIComponent(sessionId)}${tenantParam(tenantId)}`,
    { method: 'POST' }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Search failed' }))
    throw new Error(err.detail || 'Search failed')
  }
  const data = await response.json()
  return data.competitors ?? []
}

export async function submitSkillFeedback(
  sessionId: string,
  workspaceIds: string[],
  message: string,
  feedback: 1 | -1
): Promise<void> {
  await apiFetch('/api/marketing-context/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      workspace_ids: workspaceIds,
      message,
      feedback,
    }),
  })
}
