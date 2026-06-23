import { useNavigate } from 'react-router-dom'
import { SegmentedControl } from '../../../components/segmented-control'
import type { CampaignView } from '../types'

const OPTIONS: Array<{ value: CampaignView; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'builder', label: 'Builder' },
]

interface ViewSwitcherProps {
  campaignId: string
  current: CampaignView
}

// Overview · Calendar · Builder switch. Navigates between the campaign's nested
// view routes so each view is deep-linkable; the layout stays mounted so the
// switch is instant (no refetch).
export const ViewSwitcher = ({ campaignId, current }: ViewSwitcherProps) => {
  const navigate = useNavigate()
  return (
    <SegmentedControl
      options={OPTIONS}
      value={current}
      onChange={(view) => navigate(`/campaigns/${campaignId}/${view}`)}
    />
  )
}
