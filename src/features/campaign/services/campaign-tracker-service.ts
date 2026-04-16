import { apiFetch } from '../../../utils/api'

// ---------------------------------------------------------------------------
// Cache configuration
// TTL: 23h — matches backend actuals cache, refreshed by nightly cron at 01:00 SAST.
// Data is stored in both module-level Maps (fast in-process) and sessionStorage
// (survives page reloads within the same browser session).
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 23 * 60 * 60 * 1000

const SS_TRACKER_PREFIX = 'race_tracker_'
const SS_ACTUALS_PREFIX = 'race_actuals_'

interface CacheEntry<T> {
  data: T
  ts: number
}

const trackerCache = new Map<string, CacheEntry<CampaignTracker | null>>()
const actualsCache = new Map<string, CacheEntry<KPIActual[] | null>>()

// ---------------------------------------------------------------------------
// sessionStorage helpers — silent on SSR / private-mode failures
// ---------------------------------------------------------------------------

function ssGet<T>(key: string): CacheEntry<T> | undefined {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return undefined
    return JSON.parse(raw) as CacheEntry<T>
  } catch {
    return undefined
  }
}

function ssSet<T>(key: string, entry: CacheEntry<T>): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // storage full or blocked — in-memory cache still works
  }
}


function ssClear(prefix: string): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(prefix)) keys.push(k)
    }
    keys.forEach(k => sessionStorage.removeItem(k))
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Cache read/write with dual-layer (Map + sessionStorage)
// ---------------------------------------------------------------------------

function getTrackerEntry(key: string): CacheEntry<CampaignTracker | null> | undefined {
  const mem = trackerCache.get(key)
  if (mem) return mem
  const ss = ssGet<CampaignTracker | null>(SS_TRACKER_PREFIX + key)
  if (ss) {
    trackerCache.set(key, ss)  // re-populate in-memory from sessionStorage
    return ss
  }
  return undefined
}

function setTrackerEntry(key: string, entry: CacheEntry<CampaignTracker | null>): void {
  trackerCache.set(key, entry)
  ssSet(SS_TRACKER_PREFIX + key, entry)
}

function getActualsEntry(key: string): CacheEntry<KPIActual[] | null> | undefined {
  const mem = actualsCache.get(key)
  if (mem) return mem
  const ss = ssGet<KPIActual[] | null>(SS_ACTUALS_PREFIX + key)
  if (ss) {
    actualsCache.set(key, ss)  // re-populate in-memory from sessionStorage
    return ss
  }
  return undefined
}

function setActualsEntry(key: string, entry: CacheEntry<KPIActual[] | null>): void {
  actualsCache.set(key, entry)
  ssSet(SS_ACTUALS_PREFIX + key, entry)
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

export const fetchCampaignTracker = async (
  sessionId: string,
  tenantId: string,
): Promise<CampaignTracker | null> => {
  const key = `${tenantId}`
  const cached = getTrackerEntry(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    console.debug('[RACE] tracker: cache hit', { tenantId })
    return cached.data
  }
  try {
    console.debug('[RACE] tracker: fetching from API', { tenantId })
    const res = await apiFetch(`/api/tenants/${tenantId}/campaigns/tracker`, {
      headers: { 'X-Session-ID': sessionId },
    })
    if (!res.ok) {
      console.warn('[RACE] tracker: API error', res.status)
      return cached?.data ?? null
    }
    const data = await res.json()
    const result = data.campaign ?? null
    setTrackerEntry(key, { data: result, ts: Date.now() })
    console.debug('[RACE] tracker: loaded', {
      campaign: result?.campaign_name,
      phases: result?.phases?.map((p: CampaignPhase) => p.phase_name),
    })
    return result
  } catch (err) {
    console.warn('[RACE] tracker: fetch failed', err)
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
  const cached = getActualsEntry(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    console.debug('[RACE] actuals: cache hit', { phaseName })
    return cached.data
  }
  try {
    console.debug('[RACE] actuals: fetching from API', { campaignId, phaseName })
    const res = await apiFetch(
      `/api/tenants/${tenantId}/campaigns/${campaignId}/actuals?phase=${encodeURIComponent(phaseName)}`,
      { headers: { 'X-Session-ID': sessionId } },
    )
    if (!res.ok) {
      console.warn('[RACE] actuals: API error', res.status, phaseName)
      return cached?.data ?? null
    }
    const data = await res.json()
    const result = data.kpis ?? null
    setActualsEntry(key, { data: result, ts: Date.now() })
    console.debug('[RACE] actuals: loaded', {
      phase: phaseName,
      kpis: result?.map((k: KPIActual) => ({
        name: k.kpi_name,
        actual: k.actual_label ?? k.actual_value,
        target: k.target_value ?? k.target_numeric,
      })),
    })
    return result
  } catch (err) {
    console.warn('[RACE] actuals: fetch failed', { phaseName, err })
    return cached?.data ?? null
  }
}

// ---------------------------------------------------------------------------
// Synchronous cache peeks (used by component to avoid skeleton flash)
// ---------------------------------------------------------------------------

/** Synchronous cache peek — returns cached tracker if available (not expired), else undefined */
export const getCachedTracker = (tenantId: string): CampaignTracker | null | undefined => {
  const cached = getTrackerEntry(tenantId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data
  return undefined // undefined = not in cache (different from null = no campaign)
}

/** Synchronous cache peek for actuals */
export const getCachedActuals = (tenantId: string, campaignId: string, phaseName: string): KPIActual[] | null | undefined => {
  const key = `${tenantId}:${campaignId}:${phaseName}`
  const cached = getActualsEntry(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data
  return undefined
}

/** Clear all caches — call after workspace switch or manual refresh */
export const clearTrackerCache = () => {
  trackerCache.clear()
  actualsCache.clear()
  ssClear(SS_TRACKER_PREFIX)
  ssClear(SS_ACTUALS_PREFIX)
}
