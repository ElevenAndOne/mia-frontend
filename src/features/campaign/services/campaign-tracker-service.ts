import { apiFetch } from '../../../utils/api'

// ---------------------------------------------------------------------------
// Module-level in-memory cache (survives React re-mounts / navigation)
// TTL: 5 minutes — stale data still shows instantly, fresh fetch runs in bg
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry<T> {
  data: T
  ts: number
}

const trackerCache = new Map<string, CacheEntry<CampaignTracker | null>>()
const actualsCache = new Map<string, CacheEntry<KPIActual[] | null>>()

export interface CampaignKPI {
  kpi_name: string
  target_value: string | null
  target_numeric: number | null
  unit: string
}

export interface CampaignPhase {
  phase_id: string
  phase_name: string
  sort_order: number
  status: 'completed' | 'active' | 'upcoming'
  kpis: CampaignKPI[]
}

export interface CampaignTracker {
  campaign_id: string
  campaign_name: string
  client_name: string
  status: string
  start_date: string | null
  end_date: string | null
  current_phase: string | null
  phases: CampaignPhase[]
}

export interface KPIActual {
  kpi_name: string
  target_numeric: number | null
  target_value: string | null
  unit: string
  actual_value: number | null
  actual_label: string | null
}

export const fetchCampaignTracker = async (
  sessionId: string,
  tenantId: string,
): Promise<CampaignTracker | null> => {
  const key = `${tenantId}`
  const cached = trackerCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data
  }
  try {
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/tracker`, {
      headers: { 'X-Session-ID': sessionId },
    })
    if (!res.ok) return cached?.data ?? null
    const data = await res.json()
    const result = data.campaign ?? null
    trackerCache.set(key, { data: result, ts: Date.now() })
    return result
  } catch {
    return cached?.data ?? null
  }
}

export const fetchPhaseActuals = async (
  sessionId: string,
  tenantId: string,
  campaignId: string,
  phaseName: string,
): Promise<KPIActual[] | null> => {
  const key = `${tenantId}:${campaignId}:${phaseName}`
  const cached = actualsCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data
  }
  try {
    const res = await apiFetch(
      `/api/tenants/${tenantId}/campaigns/${campaignId}/actuals?phase=${encodeURIComponent(phaseName)}`,
      { headers: { 'X-Session-ID': sessionId } },
    )
    if (!res.ok) return cached?.data ?? null
    const data = await res.json()
    const result = data.kpis ?? null
    actualsCache.set(key, { data: result, ts: Date.now() })
    return result
  } catch {
    return cached?.data ?? null
  }
}

/** Synchronous cache peek — returns cached tracker if available (not expired), else null */
export const getCachedTracker = (tenantId: string): CampaignTracker | null | undefined => {
  const cached = trackerCache.get(tenantId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data
  return undefined // undefined = not in cache (different from null = no campaign)
}

/** Synchronous cache peek for actuals */
export const getCachedActuals = (tenantId: string, campaignId: string, phaseName: string): KPIActual[] | null | undefined => {
  const key = `${tenantId}:${campaignId}:${phaseName}`
  const cached = actualsCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data
  return undefined
}

/** Clear the in-memory cache — call after workspace switch or manual refresh */
export const clearTrackerCache = () => {
  trackerCache.clear()
  actualsCache.clear()
}
