import { SegmentedControl } from '../../../components/segmented-control'
import type {
  SeverityFilter,
  SeverityFilterOption,
  StatusFilter,
  StatusFilterOption,
} from '../types'

interface Props {
  severity: SeverityFilter
  severityOptions: SeverityFilterOption[]
  onSeverityChange: (value: SeverityFilter) => void
  status: StatusFilter
  statusOptions: StatusFilterOption[]
  onStatusChange: (value: StatusFilter) => void
}

// Two segmented controls: what to show (All / Critical / Warnings) and which
// lifecycle bucket (Active / Acknowledged).
export const FindingsFilter = ({
  severity,
  severityOptions,
  onSeverityChange,
  status,
  statusOptions,
  onStatusChange,
}: Props) => (
  <div className="flex items-center gap-2 flex-wrap">
    <SegmentedControl options={severityOptions} value={severity} onChange={onSeverityChange} />
    <SegmentedControl options={statusOptions} value={status} onChange={onStatusChange} />
  </div>
)
