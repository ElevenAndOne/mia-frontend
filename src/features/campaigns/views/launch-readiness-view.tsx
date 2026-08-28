import { CampaignIdentityHeader } from '../components/campaign-identity-header'
import { LaunchReadinessContent } from '../components/builder/launch-readiness-panel'
import { useCampaignWorkspace } from '../contexts/campaign-context'

export const LaunchReadinessView = () => {
  const { campaign } = useCampaignWorkspace()
  return (
    <div className="space-y-6">
      <CampaignIdentityHeader view="readiness" />
      <div className="bg-secondary rounded-2xl border border-secondary overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-tertiary">
          <p className="label-sm text-primary">Launch readiness</p>
          <p className="paragraph-xs text-quaternary mt-0.5">
            What the preflight found on every pushable channel, kept with each push — who checked,
            what passed, what was accepted.
          </p>
        </div>
        <LaunchReadinessContent campaignId={campaign.campaign_id} />
      </div>
    </div>
  )
}
