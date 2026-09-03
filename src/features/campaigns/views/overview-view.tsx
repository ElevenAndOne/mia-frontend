import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CampaignIdentityHeader } from '../components/campaign-identity-header'
import { FunnelCards } from '../components/overview/funnel-cards'
import { PhaseBreakdown } from '../components/overview/phase-breakdown'
import { BudgetAllocationBar } from '../components/overview/budget-allocation-bar'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import { buildFunnel, phaseSummaries } from '../utils/overview-data'
import {
  fetchPhaseActuals,
  isAbort,
  type KPIActual,
} from '../../campaign/services/campaign-tracker-service'

export const OverviewView = () => {
  const { campaign, sessionId, tenantId } = useCampaignWorkspace()
  const navigate = useNavigate()
  const funnel = useMemo(() => buildFunnel(campaign), [campaign])
  const summaries = useMemo(() => phaseSummaries(campaign), [campaign])

  // Actuals per phase — Overview used to show targets only, so a KPI nothing could
  // measure looked exactly like a healthy one. Same cached fetch as the Home widget
  // (23h sessionStorage + server cache, warmed nightly), aborted on navigate-away.
  const [actualsByPhase, setActualsByPhase] = useState<Record<string, KPIActual[] | null>>({})
  useEffect(() => {
    if (!sessionId || !tenantId) return
    const controller = new AbortController()
    for (const phase of campaign.phases) {
      void fetchPhaseActuals(
        sessionId, tenantId, campaign.campaign_id, phase.phase_name,
        null, null, controller.signal,
      )
        .then((rows) => {
          setActualsByPhase((prev) => ({ ...prev, [phase.phase_name]: rows }))
        })
        .catch((err) => {
          if (!isAbort(err)) setActualsByPhase((prev) => ({ ...prev, [phase.phase_name]: null }))
        })
    }
    return () => controller.abort()
  }, [sessionId, tenantId, campaign.campaign_id, campaign.phases])

  // KPIs no source can measure — surfaced up here, not just inside Setup, or the
  // problem sits one click out of sight.
  const notTracked = useMemo(() => {
    const names: string[] = []
    for (const rows of Object.values(actualsByPhase)) {
      for (const r of rows ?? []) if (r.state === 'none') names.push(r.kpi_name)
    }
    return names
  }, [actualsByPhase])

  return (
    <div className="space-y-6">
      <CampaignIdentityHeader view="overview" />

      {notTracked.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-utility-brand-400 bg-utility-brand-100 px-4 py-3">
          <p className="paragraph-sm text-utility-brand-700">
            {notTracked.length === 1
              ? `1 KPI on this campaign has no data source — ${notTracked[0]} can't show a number until something is connected to it.`
              : `${notTracked.length} KPIs on this campaign have no data source — ${notTracked.join(', ')} can't show numbers until something is connected.`}
          </p>
          <button
            onClick={() => navigate(`/campaigns/${campaign.campaign_id}/setup/sources`)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-utility-brand-600 label-sm text-white hover:bg-utility-brand-700"
          >
            Set it up
          </button>
        </div>
      )}

      <div>
        <span className="label-xs text-quaternary uppercase tracking-[0.14em]">The Customer Journey</span>
        <div className="mt-3.5">
          <FunnelCards phases={funnel} actualsByPhase={actualsByPhase} />
        </div>
      </div>

      <PhaseBreakdown summaries={summaries} />
      <BudgetAllocationBar campaign={campaign} />
    </div>
  )
}
