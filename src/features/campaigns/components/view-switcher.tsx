import { useNavigate } from 'react-router-dom'
import { SegmentedControl } from '../../../components/segmented-control'
import type { CampaignView } from '../types'

// One row of pills is the whole campaign navigation. Linked content, launch readiness
// and rules (ex-Notes) live inside Setup's sub-nav — four pills fit where six overflowed.
const OPTIONS: Array<{ value: CampaignView; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'builder', label: 'Builder' },
  { value: 'setup', label: 'Setup' },
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
    <div className="max-w-full overflow-x-auto sm:shrink-0">
      <SegmentedControl
        options={OPTIONS}
        value={current}
        onChange={(view) => navigate(view === 'setup' ? `/campaigns/${campaignId}/setup/measurement` : `/campaigns/${campaignId}/${view}`)}
        className="w-max [&>button]:whitespace-nowrap"
      />
    </div>
  )
}
