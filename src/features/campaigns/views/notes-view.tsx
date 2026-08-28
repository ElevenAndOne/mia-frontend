import { CampaignIdentityHeader } from '../components/campaign-identity-header'
import { NotesPanel } from '../../notes/components/notes-panel'
import { useCampaignWorkspace } from '../contexts/campaign-context'

// Decisions, rules and things-to-avoid recorded for this campaign — from chat or
// typed here. Mia reads the same list on every turn about the campaign.
export const NotesView = () => {
  const { campaign, sessionId, tenantId } = useCampaignWorkspace()
  return (
    <div className="space-y-6">
      <CampaignIdentityHeader view="notes" />
      <NotesPanel
        sessionId={sessionId}
        tenantId={tenantId}
        scope="campaign"
        campaignId={campaign.campaign_id}
        title="Notes"
        description="What Mia has been told to remember about this campaign. Say it once in chat or add it here; she follows it in every conversation and cites it when it shapes a recommendation. Brand-wide rules live in Workspace Settings → Notes."
        placeholder="Add a rule for this campaign… e.g. “No giveaway in September — test a different wildcard.”"
      />
    </div>
  )
}
