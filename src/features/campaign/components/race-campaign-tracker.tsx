import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { useSession } from '../../../contexts/session-context'
import { apiFetch } from '../../../utils/api'
import {
  fetchCampaignTracker,
  fetchPhaseActuals,
  getCachedTracker,
  getCachedActuals,
  refreshCampaignActuals,
  clearTrackerCache,
} from '../services/campaign-tracker-service'
import type {
  CampaignTracker,
  CampaignPhase,
  KPIActual,
} from '../services/campaign-tracker-service'
import { parseDateRangeValue, isSinceLaunchRange } from '../../../utils/date-range'
import { getCampaignMode, setCampaignMode } from '../../../utils/campaign-mode'
import { isOnTrack, isRateMetric, rateMetricStatus } from '../../../utils/on-track'

// ── Types ──────────────────────────────────────────────────────────────────

export interface CampaignInfo {
  campaignId: string
  campaignName: string
  startDate: string | null
  endDate: string | null
  status: string
}

interface CampaignSummary {
  campaign_id: string
  campaign_name: string
  status: string
  is_primary: boolean
}

interface RaceCampaignTrackerProps {
  disabled?: boolean
  dateRange?: string
  onCampaignChange?: (info: CampaignInfo | null) => void
}

// ── Pure helpers ───────────────────────────────────────────────────────────

function resolveDates(
  dateRange: string | undefined,
  campaignStartDate: string | null,
  campaignEndDate: string | null = null
): { startDate: string | null; endDate: string | null } {
  const today = format(new Date(), 'yyyy-MM-dd')
  // When a campaign is loaded, always use its own date window — never the date picker.
  // The picker is locked in campaign mode, but its stored value may be a stale custom
  // range from a previous session, which would cause actuals to fetch the wrong window.
  if (campaignStartDate) {
    const campaignEnded = campaignEndDate && new Date(campaignEndDate) < new Date()
    return {
      startDate: campaignStartDate,
      endDate: campaignEnded ? campaignEndDate : today,
    }
  }
  if (!dateRange || isSinceLaunchRange(dateRange)) {
    return { startDate: null, endDate: today }
  }
  const span = parseDateRangeValue(dateRange)
  if (!span) return { startDate: null, endDate: today }
  return {
    startDate: format(span.start, 'yyyy-MM-dd'),
    endDate: format(span.end, 'yyyy-MM-dd'),
  }
}

function formatActual(actual: KPIActual): string {
  if (actual.actual_label) return actual.actual_label
  if (actual.actual_value === null || actual.actual_value === undefined) return '—'
  if (actual.unit === 'percent') return `${actual.actual_value.toFixed(1)}%`
  if (actual.actual_value >= 1000000) return `${(actual.actual_value / 1000000).toFixed(1)}M`
  if (actual.actual_value >= 1000) return `${(actual.actual_value / 1000).toFixed(1)}K`
  return actual.actual_value.toFixed(actual.unit === 'percent' ? 1 : 0)
}

function formatTarget(kpi: {
  target_numeric: number | null
  target_value: string | null
  unit: string
}): string {
  if (kpi.target_value) return kpi.target_value
  if (kpi.target_numeric === null) return '—'
  if (kpi.unit === 'percent') return `${kpi.target_numeric}%`
  if (kpi.target_numeric >= 1000000) return `${(kpi.target_numeric / 1000000).toFixed(1)}M`
  if (kpi.target_numeric >= 1000) return `${(kpi.target_numeric / 1000).toFixed(0)}K`
  return kpi.target_numeric.toLocaleString()
}

function progressPercent(actual: KPIActual): number {
  if (actual.actual_value === null || !actual.target_numeric) return 0
  return Math.min(100, Math.round((actual.actual_value / actual.target_numeric) * 100))
}

function overPerformPct(actual: KPIActual): number | null {
  if (actual.actual_value === null || !actual.target_numeric) return null
  const pct = Math.round((actual.actual_value / actual.target_numeric) * 100)
  return pct > 100 ? pct - 100 : null
}

function campaignTimePct(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const now = new Date()
  if (now <= start) return 0
  if (now >= end) return 100
  const total = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  return Math.round((elapsed / total) * 100)
}

function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function PhaseStatusDot({ status }: { status: CampaignPhase['status'] }) {
  if (status === 'completed')
    return <span className="w-1.5 h-1.5 rounded-full bg-utility-success-500 inline-block" />
  return null
}

// ── Component ──────────────────────────────────────────────────────────────

export function RaceCampaignTracker({ disabled = false, dateRange, onCampaignChange }: RaceCampaignTrackerProps) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id

  // Keep latest onCampaignChange in a ref so effects can call it without
  // adding it to their dep arrays (avoids cascading re-renders if parent
  // passes an inline function).
  const onCampaignChangeRef = useRef(onCampaignChange)
  useEffect(() => { onCampaignChangeRef.current = onCampaignChange }, [onCampaignChange])

  // ── Campaign mode state — initialized from localStorage synchronously ────
  // getCampaignMode(tenantId) returns: campaign_id | "all" | null
  // "all"       → All Campaigns mode (no tracker shown)
  // campaign_id → show that specific campaign
  // null        → use primary campaign (default)

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(() => {
    if (!tenantId) return null
    const stored = getCampaignMode(tenantId)
    return stored && stored !== 'all' ? stored : null
  })

  const [campaignModeState, setCampaignModeState] = useState<'campaign' | 'all'>(() => {
    if (!tenantId) return 'campaign'
    return getCampaignMode(tenantId) === 'all' ? 'all' : 'campaign'
  })

  const [campaignSummaries, setCampaignSummaries] = useState<CampaignSummary[]>([])

  // Initialize from synchronous cache so there's zero skeleton flash on re-navigation.
  // Pass the initial campaign ID so we hit the right cache key.
  const initCampaignId = tenantId ? (() => {
    const stored = getCampaignMode(tenantId)
    return stored && stored !== 'all' ? stored : null
  })() : null
  const cachedOnMount = tenantId ? getCachedTracker(tenantId, initCampaignId) : undefined
  const [campaign, setCampaign] = useState<CampaignTracker | null>(cachedOnMount ?? null)
  const [loading, setLoading] = useState(cachedOnMount === undefined && campaignModeState !== 'all')
  const [selectedPhase, setSelectedPhase] = useState<string | null>(() => {
    if (!cachedOnMount) return null
    return (
      (cachedOnMount.current_phase ||
        cachedOnMount.phases.find((p) => p.status === 'active')?.phase_name ||
        cachedOnMount.phases[0]?.phase_name) ??
      null
    )
  })

  // Resolved date range for actuals — depends on dateRange prop + campaign start date
  const resolvedDates = campaign ? resolveDates(dateRange, campaign.start_date, campaign.end_date) : null
  const { startDate, endDate } = resolvedDates ?? { startDate: null, endDate: null }

  // Pre-populate actualsMap from cache for the resolved date range
  const [actualsMap, setActualsMap] = useState<Record<string, KPIActual[] | 'loading' | 'error'>>(
    () => {
      if (!cachedOnMount || !tenantId) return {}
      const { startDate: initStart, endDate: initEnd } = resolveDates(dateRange, cachedOnMount.start_date, cachedOnMount.end_date)
      const map: Record<string, KPIActual[] | 'loading' | 'error'> = {}
      for (const phase of cachedOnMount.phases) {
        const cached = getCachedActuals(tenantId, cachedOnMount.campaign_id, phase.phase_name, initStart, initEnd)
        if (cached !== undefined && cached !== null) map[phase.phase_name] = cached
      }
      return map
    }
  )

  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const forceReloadRef = useRef(false)
  // Holds the last-known good data for each phase during a manual refresh so we
  // can keep showing stale numbers instead of loading dots while re-fetching.
  const staleActualsRef = useRef<Record<string, KPIActual[]>>({})

  const handleRefresh = useCallback(async () => {
    if (!sessionId || !tenantId || !campaign || refreshing) return
    // Snapshot current data as stale BEFORE clearing anything — used to keep
    // showing old numbers while the refresh is in flight instead of loading dots.
    const snapshot = actualsMapRef.current
    staleActualsRef.current = Object.fromEntries(
      Object.entries(snapshot).filter(([, v]) => Array.isArray(v))
    ) as Record<string, KPIActual[]>
    setRefreshing(true)
    forceReloadRef.current = true
    clearTrackerCache()
    try {
      await refreshCampaignActuals(sessionId, tenantId, campaign.campaign_id)
      // Only clear displayed data after server confirms cache is cleared and re-warmed
      actualsMapRef.current = {}
      setActualsMap({})
    } catch {
      // Server refresh failed — restore stale ref so UI keeps showing current data
      staleActualsRef.current = {}
      setRefreshing(false)
      return
    }
    // Re-fetch tracker so KPI structure reflects the current primary campaign
    const freshTracker = await fetchCampaignTracker(sessionId, tenantId, selectedCampaignId)
    if (freshTracker) {
      setCampaign(freshTracker)
    }
    // else: keep existing campaign visible — backend may be temporarily unavailable
    setRefreshKey((k) => k + 1)
    setRefreshing(false)
  }, [sessionId, tenantId, campaign, refreshing, selectedCampaignId])

  const actualsMapRef = useRef(actualsMap)
  useEffect(() => {
    actualsMapRef.current = actualsMap
  }, [actualsMap])

  // ── Fetch campaign summaries for the dropdown ──────────────────────────
  useEffect(() => {
    if (!sessionId || !tenantId) return
    apiFetch(`/api/tenants/${tenantId}/campaigns/`, { headers: { 'X-Session-ID': sessionId } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: CampaignSummary[]) => {
        if (Array.isArray(list) && list.length > 0) {
          setCampaignSummaries(list)
        }
      })
      .catch(() => {})
  }, [sessionId, tenantId])

  // ── Fetch campaign tracker data ────────────────────────────────────────
  // Only runs in 'campaign' mode. Notifies parent once data is loaded.
  useEffect(() => {
    if (!sessionId || !tenantId || campaignModeState !== 'campaign') return
    let cancelled = false
    if (selectedCampaignId !== null) {
      setCampaign(null)
      setSelectedPhase(null)
      setActualsMap({})
      actualsMapRef.current = {}
      setLoading(true)
    }
    fetchCampaignTracker(sessionId, tenantId, selectedCampaignId).then((data) => {
      if (cancelled) return
      // If we asked for a specific campaign and it came back null (archived/deleted),
      // clear the stale localStorage key and fall back to primary.
      if (!data && selectedCampaignId) {
        setCampaignMode(tenantId, '')
        setSelectedCampaignId(null)
        return
      }
      setCampaign(data)
      if (data) {
        const defaultPhase =
          data.current_phase ||
          data.phases.find((p) => p.status === 'active')?.phase_name ||
          data.phases[0]?.phase_name
        setSelectedPhase((prev) =>
          selectedCampaignId !== null ? defaultPhase ?? null : prev ?? defaultPhase ?? null
        )
        // Pre-populate actualsMap from cache for all phases
        const { startDate: fetchStart, endDate: fetchEnd } = resolveDates(dateRange, data.start_date, data.end_date)
        const cached: Record<string, KPIActual[]> = {}
        for (const phase of data.phases) {
          const hit = getCachedActuals(tenantId, data.campaign_id, phase.phase_name, fetchStart, fetchEnd)
          if (hit !== undefined && hit !== null) cached[phase.phase_name] = hit
        }
        if (Object.keys(cached).length > 0) {
          setActualsMap((prev) => ({ ...cached, ...prev }))
        }
        // Notify parent of active campaign info
        onCampaignChangeRef.current?.({
          campaignId: data.campaign_id,
          campaignName: data.campaign_name,
          startDate: data.start_date,
          endDate: data.end_date,
          status: data.status,
        })
      } else {
        // No campaign for this tenant
        onCampaignChangeRef.current?.(null)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [sessionId, tenantId, selectedCampaignId, campaignModeState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear actuals when date range changes ────────────────────────────
  const prevDateRangeRef = useRef(dateRange)
  useEffect(() => {
    if (prevDateRangeRef.current !== dateRange) {
      prevDateRangeRef.current = dateRange
      actualsMapRef.current = {}
      setActualsMap({})
    }
  }, [dateRange])

  // ── Fetch actuals for a phase ────────────────────────────────────────
  const loadActuals = useCallback(
    async (phaseName: string) => {
      if (!sessionId || !tenantId || !campaign) return
      if (campaign.status === 'draft') return

      const force = forceReloadRef.current
      if (force) forceReloadRef.current = false

      if (!force) {
        const jsCache = getCachedActuals(tenantId, campaign.campaign_id, phaseName, startDate, endDate)
        if (jsCache !== undefined && jsCache !== null) {
          if (!actualsMapRef.current[phaseName]) {
            setActualsMap((prev) => ({ ...prev, [phaseName]: jsCache }))
          }
          return
        }
        if (actualsMapRef.current[phaseName]) return
      }

      // Only show loading dots if there's no stale data to display while we wait
      if (!staleActualsRef.current[phaseName]) {
        setActualsMap((prev) => ({ ...prev, [phaseName]: 'loading' }))
      }
      const actuals = await fetchPhaseActuals(sessionId, tenantId, campaign.campaign_id, phaseName, startDate, endDate)
      // Clear stale for this phase — fresh data is ready
      delete staleActualsRef.current[phaseName]
      setActualsMap((prev) => ({
        ...prev,
        [phaseName]: actuals ?? 'error',
      }))
    },
    [sessionId, tenantId, campaign, startDate, endDate, refreshKey]
  )

  // Pre-fetch ALL phases on load
  useEffect(() => {
    if (!campaign) return
    const phaseNames = campaign.phases.map((p) => p.phase_name)
    const ordered = selectedPhase
      ? [selectedPhase, ...phaseNames.filter((n) => n !== selectedPhase)]
      : phaseNames
    for (const phaseName of ordered) {
      loadActuals(phaseName)
    }
  }, [selectedPhase, loadActuals, campaign])

  // ── Campaign select handler ────────────────────────────────────────────
  const handleCampaignSelect = useCallback(
    async (value: string) => {
      if (!tenantId) return
      if (value === 'all') {
        setCampaignMode(tenantId, 'all')
        setCampaignModeState('all')
        onCampaignChangeRef.current?.(null)
      } else {
        setCampaignMode(tenantId, value)
        setCampaignModeState('campaign')
        setSelectedCampaignId(value)
        // Update primary in background — fire and forget
        if (sessionId) {
          apiFetch(`/api/tenants/${tenantId}/campaigns/${value}/set-primary`, {
            method: 'PATCH',
            headers: { 'X-Session-ID': sessionId },
          }).catch(() => {})
        }
      }
    },
    [tenantId, sessionId]
  )

  // ── Early exits ────────────────────────────────────────────────────────

  if (disabled) return null

  // All Campaigns mode: just the header card (same border/padding as full tracker header)
  // min-h on outer div matches full tracker height so layout doesn't shift when switching
  if (campaignModeState === 'all') {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 min-h-[210px]">
        <div className="rounded-xl border border-secondary bg-primary overflow-hidden">
          <div className="px-3 pt-3 pb-3">
            <p className="paragraph-xs text-quaternary leading-none mb-0.5">Campaign</p>
            {campaignSummaries.length > 0 ? (
              <select
                value="all"
                onChange={(e) => handleCampaignSelect(e.target.value)}
                className="subheading-xs text-primary bg-transparent border-none outline-none cursor-pointer -ml-0.5 w-auto"
                style={{ appearance: 'auto' }}
              >
                {campaignSummaries.map((c) => (
                  <option key={c.campaign_id} value={c.campaign_id}>
                    {c.is_primary ? '★ ' : ''}{c.campaign_name}
                  </option>
                ))}
                <option value="all">● All Campaigns</option>
              </select>
            ) : (
              <p className="subheading-xs text-primary">All Campaigns</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // No campaign for this workspace — reserve same height as tracker to prevent layout shift
  if (!loading && !campaign) {
    return <div className="w-full max-w-3xl mx-auto px-4 min-h-[210px]" />
  }

  // Skeleton while loading
  if (loading || !campaign) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="rounded-xl border border-secondary bg-primary overflow-hidden animate-pulse">
          <div className="px-3 pt-3 pb-2 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-2.5 w-14 rounded bg-tertiary" />
              <div className="h-3.5 w-36 rounded bg-tertiary" />
            </div>
            <div className="h-5 w-12 rounded-full bg-tertiary" />
          </div>
          <div className="flex border-t border-secondary">
            {['Reach', 'Act', 'Convert', 'Engage'].map((label) => (
              <div key={label} className="flex-1 py-2 flex justify-center">
                <div className="h-3 w-10 rounded bg-tertiary" />
              </div>
            ))}
          </div>
          <div className="px-3 py-2.5 space-y-2.5 min-h-[116px]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <div className="h-3 w-24 rounded bg-tertiary" />
                  <div className="h-3 w-16 rounded bg-tertiary" />
                </div>
                <div className="h-1 rounded-full bg-tertiary" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Full tracker render ────────────────────────────────────────────────

  const activePhaseData = campaign.phases.find((p) => p.phase_name === selectedPhase)
  const actuals = selectedPhase ? actualsMap[selectedPhase] : undefined
  // Show stale data whenever it exists — covers both 'loading' and undefined (cleared by setActualsMap({}))
  const staleForPhase = selectedPhase ? (staleActualsRef.current[selectedPhase] ?? null) : null
  const actualsLoading = actuals === 'loading' && !staleForPhase
  const actualsError = actuals === 'error'
  const actualsData = staleForPhase ?? (Array.isArray(actuals) ? actuals : null)

  // On-track dots are shown only when campaign has start/end dates
  const canShowOnTrack = !!(campaign.start_date && campaign.end_date)
  const today = todayString()

  // Whether the dropdown is available (≥1 campaigns loaded)
  const hasDropdown = campaignSummaries.length > 0

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="rounded-xl border border-secondary bg-primary overflow-hidden">
        {/* Header */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between">
          <div className="min-w-0">
            <p className="paragraph-xs text-quaternary leading-none mb-0.5">
              Campaign{' '}
              <span className="text-quaternary">
                · {campaign.start_date && campaign.end_date
                  ? `${format(new Date(campaign.start_date), 'd MMM')} – ${format(new Date(campaign.end_date), 'd MMM')}`
                  : (!dateRange || isSinceLaunchRange(dateRange) ? 'Since launch' : dateRange.replace(/_/g, ' ').replace(/(\d+) days/, '$1d'))}
              </span>
            </p>
            {hasDropdown ? (
              <select
                value={selectedCampaignId ?? campaign.campaign_id}
                onChange={(e) => handleCampaignSelect(e.target.value)}
                className="subheading-xs text-primary bg-transparent border-none outline-none cursor-pointer -ml-0.5 w-auto max-w-[200px]"
                style={{ appearance: 'auto' }}
              >
                {campaignSummaries.map((c) => (
                  <option key={c.campaign_id} value={c.campaign_id}>
                    {c.is_primary ? '★ ' : ''}{c.campaign_name}
                  </option>
                ))}
                <option value="all">● All Campaigns</option>
              </select>
            ) : (
              <p className="subheading-xs text-primary truncate">{campaign.campaign_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh actuals"
              className="text-quaternary hover:text-secondary transition-colors disabled:opacity-40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              >
                <path
                  fillRule="evenodd"
                  d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08 1.01.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.344l.842.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.344l-.842-.841v1.371a.75.75 0 0 1-1.5 0V9.682a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5H4.071l.84.841a4.5 4.5 0 0 0 7.08-1.009.75.75 0 0 1 1.934.713Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-utility-success-50 border border-utility-success-200">
              <span className="w-1.5 h-1.5 rounded-full bg-utility-success-500 animate-pulse" />
              <span className="paragraph-xs text-utility-success-700">Live</span>
            </span>
          </div>
        </div>

        {/* Phase tabs */}
        <div className="flex border-t border-secondary">
          {campaign.phases.map((phase) => {
            const isSelected = selectedPhase === phase.phase_name
            return (
              <button
                key={phase.phase_id}
                onClick={() => setSelectedPhase(phase.phase_name)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-center transition-colors border-b-2 ${
                  isSelected
                    ? 'border-utility-brand-500 bg-secondary'
                    : 'border-transparent hover:bg-secondary'
                }`}
              >
                <div className="flex items-center gap-1">
                  <PhaseStatusDot status={phase.status} />
                  <span
                    className={`paragraph-xs font-medium ${isSelected ? 'text-primary' : 'text-tertiary'}`}
                  >
                    {phase.phase_name}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* KPI rows */}
        <div className="px-3 py-2.5 space-y-2.5 min-h-[116px]">
          {actualsLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {!actualsLoading &&
            activePhaseData &&
            (actualsData ?? activePhaseData.kpis).map((kpi, i) => {
              const hasActual = actualsData !== null
              const actual = hasActual ? (actualsData![i] ?? null) : null
              const isRate = isRateMetric(kpi.kpi_name)

              // Rate metrics: bar always 100% wide — colour is the signal, not fill
              // Cumulative metrics: bar fill = actual / target progress
              // Must check actual_value !== null, not just actual object existence
              const hasValue = actual !== null && actual.actual_value !== null
              const pct = hasValue
                ? isRate ? 100 : progressPercent(actual!)
                : 0

              const metTarget =
                actual &&
                actual.actual_value !== null &&
                actual.target_numeric &&
                actual.actual_value >= actual.target_numeric

              const overPct = actual ? overPerformPct(actual) : null
              const timePct = canShowOnTrack ? campaignTimePct(campaign.start_date!, campaign.end_date!) : null

              // Bar colour
              let barColor = 'bg-utility-brand-500'
              if (actual && actual.actual_value !== null && actual.target_numeric !== null) {
                if (isRate) {
                  // 3-state health signal for rate metrics
                  const rs = rateMetricStatus(kpi.kpi_name, actual.target_numeric, actual.actual_value)
                  barColor = rs === 'on-track'
                    ? 'bg-utility-success-500'
                    : rs === 'at-risk'
                      ? 'bg-utility-warning-500'
                      : 'bg-utility-error-500'
                } else if (canShowOnTrack) {
                  // Time-paced signal for cumulative metrics
                  const trackStatus = isOnTrack(
                    kpi.kpi_name,
                    actual.target_numeric,
                    actual.actual_value,
                    campaign.start_date!,
                    campaign.end_date!,
                    today
                  )
                  barColor = trackStatus === true
                    ? 'bg-utility-success-500'
                    : trackStatus === false
                      ? 'bg-utility-error-500'
                      : 'bg-utility-brand-500'
                }
              }

              return (
                <div key={kpi.kpi_name} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="paragraph-xs text-secondary truncate">{kpi.kpi_name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasActual && actual ? (
                        <>
                          <span
                            className={`paragraph-xs font-medium ${metTarget ? 'text-utility-success-600' : 'text-primary'}`}
                          >
                            {formatActual(actual)}
                          </span>
                          {overPct !== null && (
                            <span className="paragraph-xs text-utility-success-600 font-medium">
                              (+{overPct}%)
                            </span>
                          )}
                          <span className="paragraph-xs text-quaternary">/</span>
                        </>
                      ) : hasActual ? (
                        <span className="paragraph-xs text-quaternary">— /</span>
                      ) : null}
                      <span className="paragraph-xs text-quaternary">{formatTarget(kpi)}</span>
                    </div>
                  </div>
                  {hasActual && (
                    <div className="relative h-3">
                      {/* Track + fill */}
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-tertiary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {/* Campaign time-position dot */}
                      {timePct !== null && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 z-10 transition-all duration-500"
                          style={{
                            left: `${timePct}%`,
                            backgroundColor: 'var(--color-text-primary)',
                            borderColor: 'var(--background-color-primary)',
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}

          {actualsError && (
            <p className="paragraph-xs text-quaternary text-center py-3">
              Could not load actuals — try again later
            </p>
          )}
        </div>
      </div>
    </div>
  )
}