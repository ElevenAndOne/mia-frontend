import { useNavigate } from 'react-router-dom'
import { SegmentedControl } from '../../../components/segmented-control'
import type { CampaignView } from '../types'

// One row of pills is the whole campaign navigation. Linked content and launch
// readiness used to open from buttons buried in the builder's controls card; notes is
// new. Six pills overflow narrow screens, so the control scrolls sideways.
const OPTIONS: Array<{ value: CampaignView; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'builder', label: 'Builder' },
  { value: 'linked', label: 'Linked content' },
  { value: 'readiness', label: 'Launch readiness' },
  { value: 'notes', label: 'Notes' },
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
        onChange={(view) => navigate(`/campaigns/${campaignId}/${view}`)}
        className="w-max [&>button]:whitespace-nowrap"
      />
    </div>
  )
}
