import { apiFetch } from '../../../utils/api'
import type { CampaignGuide, CampaignGuideExtracted, CampaignUploadResult } from '../types'

function tenantParam(tenantId?: string | null): string {
  return tenantId ? `&tenant_id=${encodeURIComponent(tenantId)}` : ''
}

export async function uploadCampaignGuide(
  sessionId: string,
  file: File,
  tenantId?: string | null
): Promise<CampaignUploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiFetch(
    `/api/campaign-guides/upload?session_id=${encodeURIComponent(sessionId)}${tenantParam(tenantId)}`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(err.detail || 'Upload failed')
  }

  return response.json()
}

export async function saveCampaignGuide(
  sessionId: string,
  filename: string,
  rawText: string,
  extractedData: CampaignGuideExtracted,
  tenantId?: string | null
): Promise<CampaignGuide> {
  const response = await apiFetch('/api/campaign-guides/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      filename,
      raw_text: rawText,
      extracted_data: extractedData,
      tenant_id: tenantId ?? null,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Save failed' }))
    throw new Error(err.detail || 'Save failed')
  }

  const data = await response.json()
  return data.guide
}

export async function fetchCampaignGuides(
  sessionId: string,
  tenantId?: string | null
): Promise<CampaignGuide[]> {
  const response = await apiFetch(
    `/api/campaign-guides?session_id=${encodeURIComponent(sessionId)}${tenantParam(tenantId)}`
  )
  if (!response.ok) return []
  const data = await response.json()
  return data.guides ?? []
}

export async function deleteCampaignGuide(
  sessionId: string,
  guideId: string,
  tenantId?: string | null
): Promise<void> {
  const response = await apiFetch(
    `/api/campaign-guides/${guideId}?session_id=${encodeURIComponent(sessionId)}${tenantParam(tenantId)}`,
    { method: 'DELETE' }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Delete failed' }))
    throw new Error(err.detail || 'Delete failed')
  }
}
