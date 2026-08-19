import { apiFetch } from '../../../utils/api'
import type {
  GoldCampaignEvidence,
  GoldTopPost,
  StructuredGoldReport,
} from '../components/gold-report/types'

export interface GoldInsightsResponse {
  success: boolean
  status: 'no_data' | 'triggered' | 'running' | 'completed' | 'failed'
  summary: string | null
  // Structured rendition for the designed report page; null while the backend
  // builds it in the background (fall back to the markdown summary).
  report?: StructuredGoldReport | null
  // Which tier produced the report: paid ML analysis, or the organic
  // performance pipeline for workspaces with no usable paid data.
  report_type?: 'ml' | 'organic'
  // Organic tier: the real posts behind the report's numbers, with permalinks.
  top_posts?: GoldTopPost[]
  // Paid tier: real campaign metrics from the ad platforms (24h cache, so null
  // on the very first view while the background refresh runs).
  campaign_evidence?: GoldCampaignEvidence | null
  created_at: string | null
  job_status: string | null
  failure_reason: string | null
  refresh_in_progress?: boolean
}

export const fetchGoldInsights = async (sessionId: string): Promise<GoldInsightsResponse> => {
  const response = await apiFetch('/api/gold-insights/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({ session_id: sessionId }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export const triggerGoldRefresh = async (sessionId: string): Promise<GoldInsightsResponse> => {
  const response = await apiFetch('/api/gold-insights/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
    },
    body: JSON.stringify({ session_id: sessionId }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}
