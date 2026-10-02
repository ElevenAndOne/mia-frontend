import { Link } from 'react-router-dom'

interface CampaignSavedCardProps {
  campaignId: string
  campaignName?: string
}

// Under the reply that saved a campaign from home chat: the draft exists now, here's the way in.
export const CampaignSavedCard = ({ campaignId, campaignName }: CampaignSavedCardProps) => (
  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-secondary bg-primary px-4 py-3">
    <div className="min-w-0">
      <p className="label-sm text-primary truncate">{campaignName || 'Campaign'} saved as a draft</p>
      <p className="paragraph-xs text-tertiary">Keep building here, or open it to review and launch.</p>
    </div>
    <Link
      to={`/campaigns/${campaignId}/overview`}
      className="shrink-0 px-3 py-1.5 rounded-full border border-secondary paragraph-sm text-secondary hover:bg-secondary transition-colors"
    >
      Open campaign →
    </Link>
  </div>
)

export default CampaignSavedCard
