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
  status: 'completed' | 'processing' | 'failed'
  campaign_id?: string
  created_at: string
}

export const creativeStudioApi = {
  generate: (tenantId: string, sessionId: string, params: GenerateParams) =>
    invoke(tenantId, sessionId, 'generate', params) as Promise<{ job_id: string; status: string }>,

  getJob: (tenantId: string, sessionId: string, jobId: string) =>
    invoke(tenantId, sessionId, 'get_job', { job_id: jobId }) as Promise<GenerateJob>,

  listAssets: (
    tenantId: string,
    sessionId: string,
    filters?: { media_type?: string; asset_type?: string; limit?: number },
  ) =>
    invoke(tenantId, sessionId, 'list_assets', filters ?? {}) as Promise<{
      assets: CreativeAsset[]
    }>,

  deleteAsset: (tenantId: string, sessionId: string, assetId: string) =>
    invoke(tenantId, sessionId, 'delete_asset', { asset_id: assetId }),

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
}
