// API calls for site guides. Staff only: the backend allowlist (the same one as Mia Pulse) is
// the real gate. Files have no public link, so each is fetched with the session and shown from
// a blob URL.

import { apiFetch, createSessionHeaders } from '../../utils/api'
import type { Edits, GuideResponse, WorkspaceRow } from './types'

const BASE = '/api/admin/site-guides'

export class SiteGuideError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'SiteGuideError'
    this.status = status
  }
}

async function fail(resp: Response): Promise<never> {
  if (resp.status === 403) throw new SiteGuideError(403, 'Your account is not on the staff list for this page.')
  let detail = `Request failed (${resp.status})`
  try {
    const body = (await resp.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') detail = body.detail
  } catch {
    // not JSON: keep the plain message
  }
  throw new SiteGuideError(resp.status, detail)
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await apiFetch(path, init)
  if (!resp.ok) return fail(resp)
  return resp.json() as Promise<T>
}

export const fetchWorkspaces = () => call<{ workspaces: WorkspaceRow[] }>(BASE)

export const fetchGuide = (tenantId: string) => call<GuideResponse>(`${BASE}/${encodeURIComponent(tenantId)}`)

export const startBuild = (tenantId: string, fresh: boolean) =>
  call<{ started: boolean; already_building: boolean }>(
    `${BASE}/${encodeURIComponent(tenantId)}/build?fresh=${fresh ? 'true' : 'false'}`,
    { method: 'POST' }
  )

export const saveEdits = (tenantId: string, edits: Edits) =>
  call<GuideResponse>(`${BASE}/${encodeURIComponent(tenantId)}`, {
    method: 'PATCH',
    headers: createSessionHeaders(null, true),
    body: JSON.stringify(edits),
  })

export const setStatus = (tenantId: string, status: 'draft' | 'checked' | 'approved') =>
  call<{ status: string }>(`${BASE}/${encodeURIComponent(tenantId)}/status`, {
    method: 'POST',
    headers: createSessionHeaders(null, true),
    body: JSON.stringify({ status }),
  })

/** A guide file as a blob URL. The caller revokes it when done. */
export async function fetchBlobUrl(path: string): Promise<string> {
  const resp = await apiFetch(path)
  if (!resp.ok) return fail(resp)
  return URL.createObjectURL(await resp.blob())
}

export const pagePath = (tenantId: string, n: number) => `${BASE}/${encodeURIComponent(tenantId)}/page/${n}`
export const pdfPath = (tenantId: string) => `${BASE}/${encodeURIComponent(tenantId)}/pdf`
export const filePath = (tenantId: string, name: string) =>
  `${BASE}/${encodeURIComponent(tenantId)}/file?name=${encodeURIComponent(name)}`

/** Save the whole download (PDF, logos, photographs, colours and fonts) as one zip. */
export async function downloadBundle(tenantId: string, filename: string): Promise<void> {
  const url = await fetchBlobUrl(`${BASE}/${encodeURIComponent(tenantId)}/download`)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
