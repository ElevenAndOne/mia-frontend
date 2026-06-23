import { ViewSwitcher } from '../components/view-switcher'
import { StatusBadge } from '../components/status-badge'
import { useCampaignWorkspace } from '../contexts/campaign-context'

// Placeholder — the full month-grid Calendar lands in P3.
export const CalendarView = () => {
  const { campaign } = useCampaignWorkspace()
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="title-h5 text-primary">{campaign.campaign_name}</span>
          <StatusBadge status={campaign.status} pulse />
        </div>
        <ViewSwitcher campaignId={campaign.campaign_id} current="calendar" />
      </div>
      <div className="rounded-2xl border border-secondary bg-secondary p-10 text-center">
        <p className="paragraph-sm text-tertiary">Calendar (month grid of scheduled posts) is coming next.</p>
      </div>
    </div>
  )
}
