import { apiFetch } from '../../utils/api'

const BASE = (tenantId: string) =>
  `/api/tenants/${tenantId}/plugins/mia-creative-studio/invoke`

const invoke = async (
  tenantId: string,
  sessionId: string,
  action: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any = {},
) => {
  const res = await apiFetch(`${BASE(tenantId)}/${action}`, {
    method: 'POST',
    headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || 'Plugin action failed')
  }
  const json = await res.json()
  return json.result ?? json
}

export interface GenerateParams {
  type: 'image' | 'video'
  model: string
  prompt: string
  // video-specific
  duration?: number
  aspect_ratio?: string
  quality?: string
  camera_movement?: string | null
  vfx_template?: string | null
  // image-specific
  num_images?: number
  // shared
  reference_images?: string[]
  style_presets?: Record<string, any>
  iterative_edit?: boolean
  base_image?: string
  // optional tagging
  client_name?: string
  campaign_id?: string
  phase_id?: string
}

export interface GenerateJob {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  output_urls?: string[]
  output_url?: string
  optimized_prompt?: string
  error_message?: string
  type?: string
  model?: string
  original_prompt?: string
}

export interface CreativeAsset {
  asset_id: string
  tenant_id: string
  client_name?: string
  job_id?: string
  type: 'generated' | 'reference' | 'brand'
  media_type: 'image' | 'video'
  cdn_url: string
  filename?: string
  prompt?: string
  model?: string
  source?: string
  status: 'completed' | 'processing' | 'failed'
  campaign_id?: string
  created_at: string
}

export interface FigmaFile {
  file_key: string
  name: string
  project_name: string
  thumbnail_url?: string
  last_modified?: string
}

export interface FigmaFrame {
  node_id: string
  name: string
  page_name: string
}

export const creativeStudioApi = {
  generate: (tenantId: string, sessionId: string, params: GenerateParams) =>
    invoke(tenantId, sessionId, 'generate', params) as Promise<{ job_id: string; status: string }>,

  getJob: (tenantId: string, sessionId: string, jobId: string) =>
    invoke(tenantId, sessionId, 'get_job', { job_id: jobId }) as Promise<GenerateJob>,

  // Direct /api/mia-create path (reads/writes the DB), NOT the plugin-host invoke layer —
  // the invoke path 503s unless the plugin-host worker is running (it isn't in local dev).
  listAssets: async (
    tenantId: string,
    sessionId: string,
    filters?: { media_type?: string; asset_type?: string; limit?: number },
  ): Promise<{ assets: CreativeAsset[] }> => {
    const params = new URLSearchParams({
      tenant_id: tenantId,
      limit: String(filters?.limit ?? 50),
    })
    if (filters?.asset_type) params.set('asset_type', filters.asset_type)
    if (filters?.media_type) params.set('media_type', filters.media_type)
    const res = await apiFetch(`/api/mia-create/assets?${params.toString()}`, {
      headers: { 'X-Session-ID': sessionId },
    })
    if (!res.ok) return { assets: [] }
    return res.json()
  },

  deleteAsset: async (tenantId: string, sessionId: string, assetId: string) => {
    const res = await apiFetch(
      `/api/mia-create/assets/${assetId}?tenant_id=${encodeURIComponent(tenantId)}`,
      { method: 'DELETE', headers: { 'X-Session-ID': sessionId } },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Delete failed' }))
      throw new Error(err.detail || 'Delete failed')
    }
    return res.json()
  },

  linkCampaign: (
    tenantId: string,
    sessionId: string,
    assetId: string,
    campaignId: string,
    phaseId?: string,
  ) =>
    invoke(tenantId, sessionId, 'link_campaign', {
      asset_id: assetId,
      campaign_id: campaignId,
      phase_id: phaseId,
    }),

  getBrandContext: (tenantId: string, sessionId: string) =>
    invoke(tenantId, sessionId, 'get_brand_context') as Promise<{
      brand_context: string
      has_context: boolean
      brand_guide_filename: string | null
    }>,

  listCampaigns: async (tenantId: string, sessionId: string): Promise<{
    campaigns: {
      campaign_id: string
      campaign_name: string
      client_name: string
      status: string
      phases: { phase_id: string; phase_name: string }[]
    }[]
  }> => {
    const url = `/api/creative-studio/campaigns?session_id=${encodeURIComponent(sessionId)}&tenant_id=${encodeURIComponent(tenantId)}`
    const res = await apiFetch(url)
    if (!res.ok) return { campaigns: [] }
    return res.json()
  },

  listFigmaFiles: (tenantId: string, sessionId: string, query?: string) =>
    invoke(tenantId, sessionId, 'list_figma_files', { query }) as Promise<{
      files: FigmaFile[]
    }>,

  getFigmaFrames: (tenantId: string, sessionId: string, fileKey: string) =>
    invoke(tenantId, sessionId, 'get_figma_frames', { file_key: fileKey }) as Promise<{
      frames: FigmaFrame[]
    }>,

  importFigmaFrames: (tenantId: string, sessionId: string, fileKey: string, frames: FigmaFrame[]) =>
    invoke(tenantId, sessionId, 'import_figma_frames', { file_key: fileKey, frames }) as Promise<{
      assets: CreativeAsset[]
      imported: number
    }>,
}

// ── Figma browser (calls backend directly — no plugin host needed) ──────────────

const figmaBase = () => `/api/oauth/figma`

export const figmaApi = {
  listFiles: async (sessionId: string, tenantId: string, query?: string): Promise<{ files: FigmaFile[] }> => {
    let url = `${figmaBase()}/files?tenant_id=${encodeURIComponent(tenantId)}`
    if (query) url += `&query=${encodeURIComponent(query)}`
    const res = await apiFetch(url, { headers: { 'X-Session-ID': sessionId } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to load files' }))
      throw new Error(err.detail || 'Failed to load files')
    }
    return res.json()
  },

  listFrames: async (sessionId: string, tenantId: string, fileKey: string): Promise<{ frames: FigmaFrame[] }> => {
    const res = await apiFetch(`${figmaBase()}/frames`, {
      method: 'POST',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, file_key: fileKey }),
    })
    if (!res.ok) throw new Error('Failed to load frames')
    return res.json()
  },

  importFrames: async (sessionId: string, tenantId: string, fileKey: string, frames: FigmaFrame[]): Promise<{ assets: CreativeAsset[]; imported: number }> => {
    const res = await apiFetch(`${figmaBase()}/import-frames`, {
      method: 'POST',
      headers: { 'X-Session-ID': sessionId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, file_key: fileKey, frames }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Import failed' }))
      throw new Error(err.detail || 'Import failed')
    }
    return res.json()
  },

  uploadFile: async (sessionId: string, tenantId: string, file: File): Promise<CreativeAsset> => {
    const form = new FormData()
    form.append('tenant_id', tenantId)
    form.append('file', file)
    const res = await apiFetch(`${figmaBase()}/upload-reference`, {
      method: 'POST',
      headers: { 'X-Session-ID': sessionId },
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  },
}

// ── Mia Create — Design DNA + jobs/sets/feedback (session-authed REST) ──────────
// These hit /api/mia-create/* directly (NOT the plugin-host invoke layer, NOT /api/figma/*
// which strips X-Session-ID). They back the conversational Imagine tab.

const miaBase = () => `/api/mia-create`

const sessionHeaders = (sessionId: string) => ({ 'X-Session-ID': sessionId })

export interface BrandColour {
  name?: string | null
  hex: string
}

export interface DnaSummary {
  file_key: string
  file_name?: string
  palette_source?: 'named_styles' | 'frequency' | string
  brand_palette: BrandColour[]
  named_text_styles: { name?: string; fontFamily: string; fontSize?: number }[]
  fonts_by_frequency?: { fontFamily: string; count?: number }[]
  pages: { page: string; frame_count: number }[]
  brand_pages?: string[]
  image_fill_count?: number
  cached_at?: string
}

export interface VisionScore {
  on_brand: number
  focal_point: number
  headline_space: boolean
  matches_brief: number
  overall: number
  notes?: string
}

export interface MiaAsset {
  asset_id: string
  cdn_url: string
  media_type: 'image' | 'video'
  filename?: string
  job_id?: string | null
  variant_group?: string | null
  figma_file_key?: string | null
  selected?: boolean | null
  vision_score?: VisionScore | null
  vision_description?: string | null
  prompt?: string
  model?: string
  ratio?: string | null // set for placement-set images → shown as a size badge
  created_at?: string
}

export interface MiaJob {
  job_id: string
  type: string
  model: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  output_urls: string[]
  original_prompt?: string
  optimized_prompt?: string
  error_message?: string
  variant_group?: string | null
  destination?: string | null
  vision_descriptions?: { url: string; description: string }[]
  created_at?: string
  completed_at?: string
}

export interface SetDiversity {
  diversity: number
  near_duplicate_pairs: number
  notes?: string
}

export interface MiaSet {
  variant_group: string
  destination?: string | null
  set_diversity?: SetDiversity | null
  complete: boolean
  jobs: MiaJob[]
  assets: MiaAsset[]
}

export const figmaDnaApi = {
  // Cache-first extract; returns a compact DNA summary (palette/fonts/pages).
  extract: async (sessionId: string, tenantId: string, fileUrlOrKey: string, campaignId?: string): Promise<DnaSummary> => {
    const res = await apiFetch(`${miaBase()}/dna/extract`, {
      method: 'POST',
      headers: { ...sessionHeaders(sessionId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, file_url_or_key: fileUrlOrKey, campaign_id: campaignId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Could not read that Figma file' }))
      throw new Error(err.detail || 'Could not read that Figma file')
    }
    return res.json()
  },

  refresh: async (sessionId: string, tenantId: string, fileUrlOrKey: string): Promise<DnaSummary> => {
    const res = await apiFetch(`${miaBase()}/dna/refresh`, {
      method: 'POST',
      headers: { ...sessionHeaders(sessionId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, file_url_or_key: fileUrlOrKey }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Refresh failed' }))
      throw new Error(err.detail || 'Refresh failed')
    }
    return res.json()
  },

  // Cached full DNA for a file (pages/copy) — returns {cached:false} if nothing is cached.
  get: async (sessionId: string, tenantId: string, fileKey: string): Promise<{ cached: boolean; dna?: Record<string, unknown> }> => {
    const url = `${miaBase()}/dna?tenant_id=${encodeURIComponent(tenantId)}&file_key=${encodeURIComponent(fileKey)}`
    const res = await apiFetch(url, { headers: sessionHeaders(sessionId) })
    if (!res.ok) return { cached: false }
    return res.json()
  },

  // Render a page's frames as thumbnails so the user can pick a specific visual reference frame.
  listPageFrames: async (
    sessionId: string,
    tenantId: string,
    fileKey: string,
    page: string,
  ): Promise<{ frames: PageFrame[]; truncated: boolean }> => {
    const url = `${miaBase()}/dna/frames?tenant_id=${encodeURIComponent(tenantId)}&file_key=${encodeURIComponent(fileKey)}&page=${encodeURIComponent(page)}`
    const res = await apiFetch(url, { headers: sessionHeaders(sessionId) })
    if (!res.ok) return { frames: [], truncated: false }
    return res.json()
  },
}

export interface PageFrame {
  node_id: string
  name: string
  thumbnail_url: string | null
}

export const miaCreateApi = {
  getJob: async (sessionId: string, tenantId: string, jobId: string): Promise<MiaJob> => {
    const url = `${miaBase()}/jobs/${jobId}?tenant_id=${encodeURIComponent(tenantId)}`
    const res = await apiFetch(url, { headers: sessionHeaders(sessionId) })
    if (!res.ok) throw new Error(`Job poll failed (${res.status})`)
    return res.json()
  },

  getSet: async (sessionId: string, tenantId: string, variantGroup: string): Promise<MiaSet> => {
    const url = `${miaBase()}/sets/${variantGroup}?tenant_id=${encodeURIComponent(tenantId)}`
    const res = await apiFetch(url, { headers: sessionHeaders(sessionId) })
    if (!res.ok) throw new Error(`Set poll failed (${res.status})`)
    return res.json()
  },

  listAssets: async (sessionId: string, tenantId: string, variantGroup?: string, limit = 50): Promise<{ assets: MiaAsset[] }> => {
    let url = `${miaBase()}/assets?tenant_id=${encodeURIComponent(tenantId)}&limit=${limit}`
    if (variantGroup) url += `&variant_group=${encodeURIComponent(variantGroup)}`
    const res = await apiFetch(url, { headers: sessionHeaders(sessionId) })
    if (!res.ok) return { assets: [] }
    return res.json()
  },

  makePlacementSet: async (
    sessionId: string,
    tenantId: string,
    body: {
      asset_id?: string
      sizes: string[]
      headline?: string
      subhead?: string
      text_color?: string
      text_position?: string
    },
  ): Promise<{ variant_group: string; used_fallback_font: boolean; assets: MiaAsset[] }> => {
    const res = await apiFetch(`${miaBase()}/placement-set`, {
      method: 'POST',
      headers: { ...sessionHeaders(sessionId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Placement set failed' }))
      throw new Error(err.detail || 'Placement set failed')
    }
    return res.json()
  },

  uploadReference: async (
    sessionId: string,
    tenantId: string,
    file: File,
  ): Promise<{ asset_id: string; cdn_url: string }> => {
    const form = new FormData()
    form.append('tenant_id', tenantId)
    form.append('file', file)
    const res = await apiFetch(`${miaBase()}/upload-reference`, {
      method: 'POST',
      headers: sessionHeaders(sessionId), // no Content-Type — browser sets multipart boundary
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  },

  submitFeedback: async (
    sessionId: string,
    tenantId: string,
    body: { asset_id: string; job_id?: string; rating?: number; tags?: string[]; note?: string },
  ): Promise<{ ok: boolean; feedback_id?: string }> => {
    const res = await apiFetch(`${miaBase()}/feedback`, {
      method: 'POST',
      headers: { ...sessionHeaders(sessionId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, ...body }),
    })
    if (!res.ok) return { ok: false }
    return res.json()
  },
}

// ── Creative Intelligence (Phase 4) ─────────────────────────────────────────────

export interface IntelligenceStatus {
  status: 'never_run' | 'analyzing' | 'completed' | 'failed'
  analyzed_at?: string
  top_ad_count?: number
  date_range_days?: number
  campaign_id?: string | null
  visual_patterns?: {
    composition?: string
    color_palette?: string
    lighting?: string
    subject_matter?: string
    emotional_tone?: string
    text_overlay?: string
    winning_patterns_summary?: string
  }
  performance_summary?: {
    avg_ctr?: number
    top_ad_count?: number
    date_range_days?: number
  }
  error_message?: string
}

export const creativeIntelligenceApi = {
  getStatus: async (
    sessionId: string,
    tenantId: string,
    campaignId?: string,
  ): Promise<IntelligenceStatus> => {
    let url = `/api/creative-intelligence/status?session_id=${encodeURIComponent(sessionId)}&tenant_id=${encodeURIComponent(tenantId)}`
    if (campaignId) url += `&campaign_id=${encodeURIComponent(campaignId)}`
    const res = await apiFetch(url)
    if (!res.ok) return { status: 'never_run' }
    return res.json()
  },

  refresh: async (
    sessionId: string,
    tenantId: string,
    campaignId?: string,
  ): Promise<{ status: string; message: string }> => {
    const res = await apiFetch('/api/creative-intelligence/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, tenant_id: tenantId, campaign_id: campaignId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to start analysis' }))
      throw new Error(err.detail || 'Failed to start analysis')
    }
    return res.json()
  },
}
