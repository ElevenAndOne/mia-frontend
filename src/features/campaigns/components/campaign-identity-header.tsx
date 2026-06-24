import { StatusBadge } from './status-badge'
import { ViewSwitcher } from './view-switcher'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import { formatBudget, formatShortDate } from '../utils/campaign-dates'
import type { CampaignView } from '../types'

// Compact campaign identity + view switcher, shared by the Overview and Calendar
// views (the Builder has its own editable header).
export const CampaignIdentityHeader = ({ view }: { view: CampaignView }) => {
  const { campaign } = useCampaignWorkspace()
  const initials = (campaign.client_name || campaign.campaign_name).slice(0, 2).toUpperCase()
  const total = formatBudget(campaign.budget_total, campaign.budget_currency)

  return (
    <div className="bg-secondary rounded-2xl border border-secondary p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#df6a1f] flex items-center justify-center text-xs font-bold text-white shrink-0">{initials}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {campaign.is_primary && <span className="text-utility-warning-700 text-sm shrink-0">★</span>}
              <span className="title-h5 text-primary truncate min-w-0">{campaign.campaign_name}</span>
              <span className="shrink-0">
                <StatusBadge status={campaign.status} pulse />
              </span>
            </div>
            <div className="paragraph-xs text-tertiary mt-0.5 truncate">
              {[campaign.client_name, `${formatShortDate(campaign.start_date)} → ${formatShortDate(campaign.end_date)}`, total !== '—' ? `${total} total` : null]
                .filter(Boolean)
                .join('  ·  ')}
            </div>
          </div>
        </div>
        <ViewSwitcher campaignId={campaign.campaign_id} current={view} />
      </div>
    </div>
  )
}
