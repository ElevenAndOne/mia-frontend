import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { useSession } from '../../../contexts/session-context'
import {
  fetchCampaignTracker,
  fetchPhaseActuals,
  getCachedTracker,
  getCachedActuals,
  refreshCampaignActuals,
} from '../services/campaign-tracker-service'
import type {
  CampaignTracker,
  CampaignPhase,
  KPIActual,
} from '../services/campaign-tracker-service'
import { parseDateRangeValue, isSinceLaunchRange } from '../../../utils/date-range'

interface RaceCampaignTrackerProps {
  disabled?: boolean
  dateRange?: string
}

function resolveDates(
  dateRange: string | undefined,
  campaignStartDate: string | null
): { startDate: string | null; endDate: string | null } {
  const today = format(new Date(), 'yyyy-MM-dd')
  if (!dateRange || isSinceLaunchRange(dateRange)) {
    return { startDate: campaignStartDate ?? null, endDate: today }
  }
  const span = parseDateRangeValue(dateRange)
  if (!span) return { startDate: campaignStartDate ?? null, endDate: today }
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

function PhaseStatusDot({ status }: { status: CampaignPhase['status'] }) {
  // Only show a dot for phases with explicit completed status (has a past end_date).
  // Phases without dates are all "active" concurrently — no dot needed.
  if (status === 'completed')
    return <span className="w-1.5 h-1.5 rounded-full bg-utility-success-500 inline-block" />
  return null
}

export function RaceCampaignTracker({ disabled = false, dateRange }: RaceCampaignTrackerProps) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id

  // Initialize from synchronous cache so there's zero skeleton flash on re-navigation
  const cachedOnMount = tenantId ? getCachedTracker(tenantId) : undefined
  const [campaign, setCampaign] = useState<CampaignTracker | null>(cachedOnMount ?? null)
  const [loading, setLoading] = useState(cachedOnMount === undefined) // false if cache hit
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
  const resolvedDates = campaign ? resolveDates(dateRange, campaign.start_date) : null
  const { startDate, endDate } = resolvedDates ?? { startDate: null, endDate: null }

  // Pre-populate actualsMap from cache for all phases we already have
  const [actualsMap, setActualsMap] = useState<Record<string, KPIActual[] | 'loading' | 'error'>>(
    () => {
      if (!cachedOnMount || !tenantId) return {}
      const map: Record<string, KPIActual[] | 'loading' | 'error'> = {}
      for (const phase of cachedOnMount.phases) {
        const cached = getCachedActuals(tenantId, cachedOnMount.campaign_id, phase.phase_name)
        if (cached !== undefined && cached !== null) map[phase.phase_name] = cached
      }
      return map
    }
  )

  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  // When true, loadActuals skips all cache/ref guards and fetches unconditionally
  const forceReloadRef = useRef(false)

  const handleRefresh = useCallback(async () => {
    if (!sessionId || !tenantId || !campaign || refreshing) return
    setRefreshing(true)
    forceReloadRef.current = true
    actualsMapRef.current = {}
    setActualsMap({})
    try {
      await refreshCampaignActuals(sessionId, tenantId, campaign.campaign_id)
    } catch {
      // best-effort — local cache already cleared, phases will re-fetch on tab click
    }
    setRefreshKey((k) => k + 1) // causes loadActuals to recreate → effect re-fires
    setRefreshing(false)
  }, [sessionId, tenantId, campaign, refreshing])

  // Ref keeps loadActuals from going stale without adding actualsMap as a dep
  const actualsMapRef = useRef(actualsMap)
  useEffect(() => {
    actualsMapRef.current = actualsMap
  }, [actualsMap])

  // Fetch campaign tracker data on mount.
  useEffect(() => {
    if (!sessionId || !tenantId) return
    let cancelled = false
    fetchCampaignTracker(sessionId, tenantId).then((data) => {
      if (cancelled) return
      setCampaign(data)
      if (data) {
        const defaultPhase =
          data.current_phase ||
          data.phases.find((p) => p.status === 'active')?.phase_name ||
          data.phases[0]?.phase_name
        setSelectedPhase((prev) => prev ?? defaultPhase ?? null)
        // Pre-populate actualsMap from JS/sessionStorage cache for all phases
        const cached: Record<string, KPIActual[]> = {}
        for (const phase of data.phases) {
          const hit = getCachedActuals(tenantId, data.campaign_id, phase.phase_name)
          if (hit !== undefined && hit !== null) cached[phase.phase_name] = hit
        }
        if (Object.keys(cached).length > 0) {
          setActualsMap((prev) => ({ ...cached, ...prev }))
        }
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [sessionId, tenantId])

  // Clear actuals cache when date range changes so new range triggers a fresh fetch
  const prevDateRangeRef = useRef(dateRange)
  useEffect(() => {
    if (prevDateRangeRef.current !== dateRange) {
      prevDateRangeRef.current = dateRange
      actualsMapRef.current = {} // clear ref immediately so loadActuals doesn't see stale data
      setActualsMap({})
    }
  }, [dateRange])

  // Fetch actuals when a phase is selected (if not already fetched).
  // Uses ref for actualsMap so we always read current state without recreating the callback.
  const loadActuals = useCallback(
    async (phaseName: string) => {
      if (!sessionId || !tenantId || !campaign) return

      const force = forceReloadRef.current
      if (force) forceReloadRef.current = false // consume immediately — only applies to one call

      if (!force) {
        // Check module-level + sessionStorage cache first
        const jsCache = getCachedActuals(tenantId, campaign.campaign_id, phaseName, startDate, endDate)
        if (jsCache !== undefined && jsCache !== null) {
          if (!actualsMapRef.current[phaseName]) {
            setActualsMap((prev) => ({ ...prev, [phaseName]: jsCache }))
          }
          return
        }
        if (actualsMapRef.current[phaseName]) return // already loading/loaded/errored
      }

      setActualsMap((prev) => ({ ...prev, [phaseName]: 'loading' }))
      const actuals = await fetchPhaseActuals(sessionId, tenantId, campaign.campaign_id, phaseName, startDate, endDate)
      setActualsMap((prev) => ({
        ...prev,
        [phaseName]: actuals ?? 'error',
      }))
    },
    [sessionId, tenantId, campaign, startDate, endDate, refreshKey]
  )

  useEffect(() => {
    if (selectedPhase) loadActuals(selectedPhase)
  }, [selectedPhase, loadActuals])

  if (disabled) return null

  // No campaign for this workspace — render nothing so the greeting/quick-actions
  // stay vertically centered without a ghost skeleton taking up space below.
  if (!loading && !campaign) return null

  // Skeleton — shown while the API call is in flight
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

  const activePhaseData = campaign.phases.find((p) => p.phase_name === selectedPhase)
  const actuals = selectedPhase ? actualsMap[selectedPhase] : undefined
  const actualsLoading = actuals === 'loading'
  const actualsError = actuals === 'error'
  const actualsData = Array.isArray(actuals) ? actuals : null

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-xl border border-secondary bg-primary overflow-hidden">
        {/* Header */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between">
          <div className="min-w-0">
            <p className="paragraph-xs text-quaternary leading-none mb-0.5">
              Campaign{' '}
              <span className="text-quaternary">
                · {!dateRange || isSinceLaunchRange(dateRange) ? 'Since launch' : dateRange.replace(/_/g, ' ').replace(/(\d+) days/, '$1d')}
              </span>
            </p>
            <p className="subheading-xs text-primary truncate">{campaign.campaign_name}</p>
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

        {/* KPI rows — fixed min-height matches 3 KPIs so box size is consistent */}
        <div className="px-3 py-2.5 space-y-2.5 min-h-[116px]">
          {actualsLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="flex gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          )}

          {!actualsLoading &&
            activePhaseData &&
            (actualsData ?? activePhaseData.kpis).map((kpi, i) => {
              const hasActual = actualsData !== null
              const actual = hasActual ? (actualsData![i] ?? null) : null
              const pct = actual ? progressPercent(actual) : 0
              const metTarget =
                actual &&
                actual.actual_value !== null &&
                actual.target_numeric &&
                actual.actual_value >= actual.target_numeric

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
                          <span className="paragraph-xs text-quaternary">/</span>
                        </>
                      ) : hasActual ? (
                        <span className="paragraph-xs text-quaternary">— /</span>
                      ) : null}
                      <span className="paragraph-xs text-quaternary">{formatTarget(kpi)}</span>
                    </div>
                  </div>
                  {hasActual && (
                    <div className="h-1 rounded-full bg-tertiary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${metTarget ? 'bg-utility-success-500' : 'bg-utility-brand-500'}`}
                        style={{ width: `${pct}%` }}
                      />
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
