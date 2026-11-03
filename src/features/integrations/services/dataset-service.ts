/**
 * Uploaded Datasets API client (CSV / Uploaded Datasets integration).
 *
 * Talks to the backend routes/datasets.py endpoints. Identity + tenant are derived
 * server-side from the X-Session-ID header, so callers only pass the session id.
 */
import { apiFetch, createSessionHeaders } from '../../../utils/api'
import { withWorkspace } from '../utils/with-workspace'

export interface DatasetColumn {
  name: string
  dtype: string
  samples?: string[]
}

export interface UploadedDataset {
  dataset_id: string
  name: string
  source_label?: string | null
  original_filename?: string | null
  row_count: number
  column_count: number
  columns: DatasetColumn[]
  status: string
  created_at?: string | null
}

async function _detail(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    return body?.detail || fallback
  } catch {
    return fallback
  }
}

// tenantId: the workspace on screen (backend checks membership). Omitted: the session's.
export async function listDatasets(
  sessionId: string,
  tenantId?: string | null
): Promise<UploadedDataset[]> {
  const res = await apiFetch(withWorkspace('/api/datasets', tenantId), {
    method: 'GET',
    headers: createSessionHeaders(sessionId),
  })
  if (!res.ok) throw new Error(await _detail(res, 'Failed to load datasets'))
  const body = await res.json()
  return body.datasets ?? []
}

export async function uploadDataset(
  sessionId: string,
  file: File,
  opts?: { name?: string; sourceLabel?: string; tenantId?: string | null }
): Promise<UploadedDataset> {
  const formData = new FormData()
  formData.append('file', file)
  if (opts?.name) formData.append('name', opts.name)
  if (opts?.sourceLabel) formData.append('source_label', opts.sourceLabel)

  // NOTE: do NOT set Content-Type — the browser sets the multipart boundary.
  const res = await apiFetch(withWorkspace('/api/datasets/upload', opts?.tenantId), {
    method: 'POST',
    headers: createSessionHeaders(sessionId),
    body: formData,
  })
  if (!res.ok) throw new Error(await _detail(res, 'Failed to upload dataset'))
  return res.json()
}

export async function updateDataset(
  sessionId: string,
  datasetId: string,
  patch: { name?: string; sourceLabel?: string },
  tenantId?: string | null
): Promise<UploadedDataset> {
  const body: Record<string, string> = {}
  if (patch.name !== undefined) body.name = patch.name
  if (patch.sourceLabel !== undefined) body.source_label = patch.sourceLabel

  const res = await apiFetch(
    withWorkspace(`/api/datasets/${encodeURIComponent(datasetId)}`, tenantId),
    {
      method: 'PATCH',
      headers: createSessionHeaders(sessionId, true), // include Content-Type: application/json
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) throw new Error(await _detail(res, 'Failed to update dataset'))
  return res.json()
}

export async function deleteDataset(
  sessionId: string,
  datasetId: string,
  tenantId?: string | null
): Promise<void> {
  const res = await apiFetch(
    withWorkspace(`/api/datasets/${encodeURIComponent(datasetId)}`, tenantId),
    {
      method: 'DELETE',
      headers: createSessionHeaders(sessionId),
    }
  )
  if (!res.ok) throw new Error(await _detail(res, 'Failed to delete dataset'))
}
