import { apiFetch } from '../../../utils/api'

// ---------------------------------------------------------------------------
// Cache configuration
// Tracker TTL: 5 minutes — just a DB query, needs to pick up new campaigns quickly
//   (new campaign uploaded at intent.miacreate.ai must appear within one poll cycle)
// Actuals TTL: 23h — platform API calls, expensive; refreshed by nightly cron at 01:00 SAST
// Both layers: module-level Map (fast) + sessionStorage (survives page reload in same session)
// ---------------------------------------------------------------------------
const TRACKER_CACHE_TTL_MS = 5 * 60 * 1000
const ACTUALS_CACHE_TTL_MS = 23 * 60 * 60 * 1000

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
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Cache read/write with dual-layer (Map + sessionStorage)
// ---------------------------------------------------------------------------

function getTrackerEntry(key: string): CacheEntry<CampaignTracker | null> | undefined {
  const mem = trackerCache.get(key)
  if (mem) return mem
  const ss = ssGet<CampaignTracker | null>(SS_TRACKER_PREFIX + key)
  if (ss) {
    trackerCache.set(key, ss) // re-populate in-memory from sessionStorage
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
    actualsCache.set(key, ss) // re-populate in-memory from sessionStorage
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
  kpi_id?: number
  kpi_name: string
  target_value: string | null
  target_numeric: number | null
  unit: string
  hubspot_list_name?: string | null
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
  is_primary: boolean
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
  campaignId?: string | null
): Promise<CampaignTracker | null> => {
  const key = campaignId ? `${tenantId}:${campaignId}` : tenantId
  const cached = getTrackerEntry(key)
  if (cached && Date.now() - cached.ts < TRACKER_CACHE_TTL_MS) {
    console.debug('[RACE] tracker: cache hit', { tenantId, campaignId })
    return cached.data
  }
  try {
    console.debug('[RACE] tracker: fetching from API', { tenantId, campaignId })
    const url = campaignId
      ? `/api/tenants/${tenantId}/campaigns/tracker?campaign_id=${encodeURIComponent(campaignId)}`
      : `/api/tenants/${tenantId}/campaigns/tracker`
    const res = await apiFetch(url, {
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
  startDate?: string | null,
  endDate?: string | null
): Promise<KPIActual[] | null> => {
  const dateKey = startDate && endDate ? `${startDate}:${endDate}` : 'default'
  const key = `${tenantId}:${campaignId}:${phaseName}:${dateKey}`
  const cached = getActualsEntry(key)
  if (cached && Date.now() - cached.ts < ACTUALS_CACHE_TTL_MS) {
    console.debug('[RACE] actuals: cache hit', { phaseName, dateKey })
    return cached.data
  }
  try {
    console.debug('[RACE] actuals: fetching from API', { campaignId, phaseName, startDate, endDate })
    let url = `/api/tenants/${tenantId}/campaigns/${campaignId}/actuals?phase=${encodeURIComponent(phaseName)}`
    if (startDate) url += `&start_date=${startDate}`
    if (endDate) url += `&end_date=${endDate}`
    const res = await apiFetch(url, { headers: { 'X-Session-ID': sessionId } })
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
export const getCachedTracker = (tenantId: string, campaignId?: string | null): CampaignTracker | null | undefined => {
  const key = campaignId ? `${tenantId}:${campaignId}` : tenantId
  const cached = getTrackerEntry(key)
  if (cached && Date.now() - cached.ts < TRACKER_CACHE_TTL_MS) return cached.data
  return undefined // undefined = not in cache (different from null = no campaign)
}

/** Synchronous cache peek for actuals */
export const getCachedActuals = (
  tenantId: string,
  campaignId: string,
  phaseName: string,
  startDate?: string | null,
  endDate?: string | null
): KPIActual[] | null | undefined => {
  const dateKey = startDate && endDate ? `${startDate}:${endDate}` : 'default'
  const key = `${tenantId}:${campaignId}:${phaseName}:${dateKey}`
  const cached = getActualsEntry(key)
  if (cached && Date.now() - cached.ts < ACTUALS_CACHE_TTL_MS) return cached.data
  return undefined
}

/** Clear all caches — call after workspace switch or manual refresh */
export const clearTrackerCache = () => {
  trackerCache.clear()
  actualsCache.clear()
  ssClear(SS_TRACKER_PREFIX)
  ssClear(SS_ACTUALS_PREFIX)
}

/** Trigger a server-side cache clear + re-warm for all phases, then clear local cache */
export const refreshCampaignActuals = async (
  sessionId: string,
  tenantId: string,
  campaignId: string
): Promise<void> => {
  // Clear local JS + sessionStorage caches so stale data isn't shown
  actualsCache.clear()
  ssClear(SS_ACTUALS_PREFIX)
  // Ask the server to clear the DB cache and re-warm
  await apiFetch(`/api/tenants/${tenantId}/campaigns/${campaignId}/actuals/refresh`, {
    method: 'POST',
    headers: { 'X-Session-ID': sessionId },
  })
}
