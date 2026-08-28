import { CampaignIdentityHeader } from '../components/campaign-identity-header'
import { LinkedContentContent } from '../components/builder/linked-content-panel'
import { useCampaignWorkspace } from '../contexts/campaign-context'

export const LinkedContentView = () => {
  const { campaign, reloadDetail } = useCampaignWorkspace()
  return (
    <div className="space-y-6">
      <CampaignIdentityHeader view="linked" />
      <div className="bg-secondary rounded-2xl border border-secondary overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-tertiary">
          <p className="label-sm text-primary">Linked content</p>
          <p className="paragraph-xs text-quaternary mt-0.5">
            What counts towards this campaign’s KPIs. Anything not linked is not measured.
          </p>
        </div>
        <LinkedContentContent
          campaignId={campaign.campaign_id}
          onSaved={() => void reloadDetail()}
        />
      </div>
    </div>
  )
}
