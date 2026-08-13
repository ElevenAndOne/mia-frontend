/**
 * Canva Connect endpoints (backend: routes/canva_oauth.py).
 *
 * Thumbnails in list responses are short-lived (~15 min) — fetch when the
 * picker opens, never cache or persist them. Imported designs come back as
 * permanent CDN URLs (re-hosted server-side), safe for canvas `Media:` lines.
 */
import { apiFetch } from '../../../utils/api'

export interface CanvaDesign {
  design_id: string
  title: string
  updated_at?: number | string
  thumbnail_url?: string | null
  edit_url?: string | null
  page_count?: number | null
}

export interface CanvaStatus {
  connected: boolean
  display_name?: string
  needs_reconnect?: boolean
}

export interface CanvaImportedAsset {
  asset_id: string
  cdn_url: string
  filename: string
  page: number
  type: 'reference'
  media_type: 'image'
  source: 'canva'
  status: 'completed'
}

const base = '/api/oauth/canva'

async function orThrow<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: fallback }))
    throw new Error(err.detail || fallback)
  }
  return res.json()
}

export const canvaApi = {
  status: async (sessionId: string, tenantId: string): Promise<CanvaStatus> => {
    const res = await apiFetch(`${base}/status?tenant_id=${encodeURIComponent(tenantId)}`, {
      headers: { 'X-Session-ID': sessionId },
    })
    if (!res.ok) return { connected: false }
    return res.json()
  },

  listDesigns: async (
    sessionId: string,
    tenantId: string,
    query?: string,
    continuation?: string
  ): Promise<{ designs: CanvaDesign[]; continuation?: string | null }> => {
    let url = `${base}/designs?tenant_id=${encodeURIComponent(tenantId)}`
    if (query) url += `&query=${encodeURIComponent(query)}`
    if (continuation) url += `&continuation=${encodeURIComponent(continuation)}`
    const res = await apiFetch(url, { headers: { 'X-Session-ID': sessionId } })
    return orThrow(res, 'Failed to load Canva designs')
  },

  importDesigns: async (
    sessionId: string,
    tenantId: string,
    designs: Array<{ design_id: string; title?: string; pages?: number[] }>
  ): Promise<{ assets: CanvaImportedAsset[]; imported: number }> => {
    const res = await apiFetch(`${base}/import`, {
      method: 'POST',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, designs }),
    })
    return orThrow(res, 'Failed to import from Canva')
  },
}
