import { apiFetch } from '../../../utils/api'

// Pictures in chat and Posts: jobs, sets, the asset library, uploads and the image editor.
// All of it hits /api/mia-create/* directly. Moved out of the old Creative Studio page's API
// file when that page was removed (11 Nov 2026); only the calls live surfaces use are here.

const miaBase = () => `/api/mia-create`

const sessionHeaders = (sessionId: string) => ({ 'X-Session-ID': sessionId })

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
  /** Chat conversation the asset was generated in (scopes edits + iteration). */
  conversation_id?: string | null
  /** Composited text recipe — seeds the editor's drag handles at their current spots. */
  headline?: string | null
  headline_xy?: [number, number] | null
  logo_xy?: [number, number] | null
  logo_scale?: number | null
  /** Asset this edit supersedes — see collapseEdits. */
  replaces?: string | null
  /** Edit-drift QA: did the edit change more than asked? Arrives shortly after the image. */
  drift?: {
    changed_beyond_request: boolean
    note?: string | null
    source_asset_id?: string | null
    source_url?: string | null
  } | null
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

/** What the editor overlay can change about a composited image. */
export interface RecomposeOverrides {
  headline?: string // '' removes the text
  subhead?: string
  text_color?: string
  text_position?: 'top' | 'center' | 'bottom'
  font_family?: string
  text_scale?: number
  max_lines?: number
  headline_xy?: [number, number] // 0-1 fractions — free placement
  logo_asset_id?: string
  logo_position?: string
  logo_xy?: [number, number]
  logo_scale?: number // multiplier on the default 18%-of-width logo
  ratio?: string
}

export interface EditedAsset {
  asset_id: string
  cdn_url: string
  ratio?: string | null
  width?: number | null
  height?: number | null
  /** 'adjust' = done locally in a moment; 'repaint' = went through the fill model. */
  method?: 'adjust' | 'repaint'
}

/**
 * An edit REPLACES the image it came from rather than adding a tile.
 *
 * Every edit writes a new asset row carrying the same conversation_id, so a reopened
 * thread used to restore all of them — the grid grew every time you came back to a chat
 * (2026-08-20). Drop anything a later version supersedes.
 */
export const collapseEdits = <T extends { asset_id: string; replaces?: string | null }>(
  assets: T[],
): T[] => {
  const superseded = new Set(assets.map((a) => a.replaces).filter(Boolean) as string[])
  return assets.filter((a) => !superseded.has(a.asset_id))
}

/** Everything the editor needs to preview edits live in the browser. */
export interface EditState {
  asset_id: string
  base_asset_id: string
  base_cdn_url: string
  composited_cdn_url: string
  /** Keyed transparent PNG (data URL) when the upload had a white background baked in. */
  logo_cdn_url: string | null
  /** Size of the COMPOSITED canvas — the aspect the preview must use and the pixel space
   *  a click maps into. Sending the base's size instead made every selection miss. */
  width: number | null
  height: number | null
  recipe: RecomposeOverrides & { logo_asset_id?: string }
}

export const picturesApi = {
  /** The text-free base + its composited recipe, for the live preview. */
  getEditState: async (
    sessionId: string,
    tenantId: string,
    assetId: string,
  ): Promise<EditState> => {
    const url = `${miaBase()}/edit-state?tenant_id=${encodeURIComponent(tenantId)}&asset_id=${encodeURIComponent(assetId)}`
    const res = await apiFetch(url, { headers: sessionHeaders(sessionId) })
    if (!res.ok) throw new Error(`Couldn't open that image for editing (${res.status})`)
    return res.json()
  },

  /** Re-render text/logo from the clean base — called once on Apply, not per drag. */
  recompose: async (
    sessionId: string,
    tenantId: string,
    assetId: string,
    overrides: RecomposeOverrides,
    conversationId?: string | null,
  ): Promise<EditedAsset> => {
    const res = await apiFetch(`${miaBase()}/recompose`, {
      method: 'POST',
      headers: { ...sessionHeaders(sessionId), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        asset_id: assetId,
        conversation_id: conversationId ?? undefined,
        ...overrides,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Could not apply that change' }))
      throw new Error(err.detail || 'Could not apply that change')
    }
    return res.json()
  },

  /** Warm the segmentation model on editor open so the first click isn't the slow one. */
  prewarmEditor: async (sessionId: string, tenantId: string, assetId: string): Promise<void> => {
    try {
      await apiFetch(`${miaBase()}/prewarm`, {
        method: 'POST',
        headers: { ...sessionHeaders(sessionId), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, asset_id: assetId }),
      })
    } catch {
      // Purely an optimisation — a failed pre-warm just means a slower first click.
    }
  },

  /** Click-to-select: clicks (fractions) → a precise object mask to outline. */
  segment: async (
    sessionId: string,
    tenantId: string,
    assetId: string,
    points: { x: number; y: number; label: number }[],
    box?: { x_min: number; y_min: number; x_max: number; y_max: number },
    // Known pixel dims, used only as a hint if the server can't infer them.
    dims?: { width: number; height: number },
    // Select everything EXCEPT the clicked object — the reliable way to get a background.
    invert?: boolean,
  ): Promise<{ mask_url: string; width: number; height: number; coverage?: number | null }> => {
    const res = await apiFetch(`${miaBase()}/segment`, {
      method: 'POST',
      headers: { ...sessionHeaders(sessionId), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        asset_id: assetId,
        points,
        box,
        width: dims?.width,
        height: dims?.height,
        invert: !!invert,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Selection failed' }))
      throw new Error(err.detail || 'Selection failed')
    }
    return res.json()
  },

  /** Repaint inside the selection; everything outside stays as it was. */
  inpaint: async (
    sessionId: string,
    tenantId: string,
    assetId: string,
    maskUrl: string,
    prompt: string,
    conversationId?: string | null,
  ): Promise<EditedAsset> => {
    const res = await apiFetch(`${miaBase()}/inpaint`, {
      method: 'POST',
      headers: { ...sessionHeaders(sessionId), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        asset_id: assetId,
        mask_url: maskUrl,
        prompt,
        conversation_id: conversationId ?? undefined,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Edit failed' }))
      throw new Error(err.detail || 'Edit failed')
    }
    return res.json()
  },

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

  // Assets produced by ONE job — how a chat image card resolves its images (with
  // vision scores) once the job it is watching completes.
  listJobAssets: async (sessionId: string, tenantId: string, jobId: string): Promise<{ assets: MiaAsset[] }> => {
    const url = `${miaBase()}/assets?tenant_id=${encodeURIComponent(tenantId)}&job_id=${encodeURIComponent(jobId)}&limit=12`
    const res = await apiFetch(url, { headers: sessionHeaders(sessionId) })
    if (!res.ok) return { assets: [] }
    return res.json()
  },

  // Everything generated in ONE chat conversation — restores a reopened
  // conversation's image cards (image_job events aren't persisted in chat history).
  listConversationAssets: async (sessionId: string, tenantId: string, conversationId: string): Promise<{ assets: MiaAsset[] }> => {
    const url = `${miaBase()}/assets?tenant_id=${encodeURIComponent(tenantId)}&conversation_id=${encodeURIComponent(conversationId)}&limit=60`
    const res = await apiFetch(url, { headers: sessionHeaders(sessionId) })
    if (!res.ok) return { assets: [] }
    return res.json()
  },

  /** Generations still running in this conversation, so a reload mid-generation can put
   *  the polling card back instead of losing it until the thread is reopened. */
  listPendingJobs: async (
    sessionId: string,
    tenantId: string,
    conversationId: string,
  ): Promise<{ jobs: MiaJob[] }> => {
    const url = `${miaBase()}/pending-jobs?tenant_id=${encodeURIComponent(tenantId)}&conversation_id=${encodeURIComponent(conversationId)}`
    const res = await apiFetch(url, { headers: sessionHeaders(sessionId) })
    if (!res.ok) return { jobs: [] }
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

  /** The workspace's picture library (reference uploads, generated images), newest first. */
  listLibrary: async (
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
    const res = await apiFetch(`${miaBase()}/assets?${params.toString()}`, {
      headers: sessionHeaders(sessionId),
    })
    // Throw (not empty) so a failed load surfaces as "couldn't load" rather than an empty library.
    if (!res.ok) throw new Error(`Failed to load assets (${res.status})`)
    return res.json()
  },
}
