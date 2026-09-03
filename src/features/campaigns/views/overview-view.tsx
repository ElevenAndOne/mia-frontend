import { useMemo } from 'react'
import { CampaignIdentityHeader } from '../components/campaign-identity-header'
import { FunnelCards } from '../components/overview/funnel-cards'
import { PhaseBreakdown } from '../components/overview/phase-breakdown'
import { BudgetAllocationBar } from '../components/overview/budget-allocation-bar'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import { buildFunnel, phaseSummaries } from '../utils/overview-data'
import { PerformancePanel } from '../../metrics/views/performance-panel'

export const OverviewView = () => {
  const { campaign } = useCampaignWorkspace()
  const funnel = useMemo(() => buildFunnel(campaign), [campaign])
  const summaries = useMemo(() => phaseSummaries(campaign), [campaign])

  return (
    <div className="space-y-6">
      <CampaignIdentityHeader view="overview" />

      {/* Store-backed performance for this campaign; nothing renders until the
          analytics store covers the workspace. */}
      <PerformancePanel campaignId={campaign.campaign_id} />

      <div>
        <span className="label-xs text-quaternary uppercase tracking-[0.14em]">The Customer Journey</span>
        <div className="mt-3.5">
          <FunnelCards phases={funnel} />
        </div>
      </div>

      <PhaseBreakdown summaries={summaries} />
      <BudgetAllocationBar campaign={campaign} />
    </div>
  )
}
