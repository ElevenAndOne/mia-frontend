import { useMemo, useState } from 'react'
import { CampaignIdentityHeader } from '../components/campaign-identity-header'
import { FunnelCards } from '../components/overview/funnel-cards'
import { CampaignTimeline } from '../components/overview/campaign-timeline'
import { BudgetAllocationBar } from '../components/overview/budget-allocation-bar'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import { buildFunnel, buildTimeline, channelsByPhase } from '../utils/overview-data'

export const OverviewView = () => {
  const { campaign } = useCampaignWorkspace()
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)

  const funnel = useMemo(() => buildFunnel(campaign), [campaign])
  const timeline = useMemo(() => buildTimeline(campaign), [campaign])
  const phaseChannels = useMemo(() => channelsByPhase(campaign), [campaign])

  const selectedChannels = selectedPhaseId ? phaseChannels[selectedPhaseId] ?? null : null
  const selectedName = funnel.find((f) => f.phaseId === selectedPhaseId)?.name

  const toggle = (phaseId: string) => setSelectedPhaseId((cur) => (cur === phaseId ? null : phaseId))

  return (
    <div className="space-y-6">
      <CampaignIdentityHeader view="overview" />

      <div>
        <div className="flex items-center justify-between mb-3.5">
          <span className="label-xs text-quaternary uppercase tracking-[0.14em]">The Customer Journey</span>
          {selectedPhaseId && (
            <button onClick={() => setSelectedPhaseId(null)} className="paragraph-xs text-utility-brand-700 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-utility-brand-600" />
              Filtering timeline by {selectedName} — clear
            </button>
          )}
        </div>
        <FunnelCards phases={funnel} selectedId={selectedPhaseId} onSelect={toggle} />
      </div>

      <CampaignTimeline timeline={timeline} selectedChannels={selectedChannels} />
      <BudgetAllocationBar campaign={campaign} />
    </div>
  )
}
