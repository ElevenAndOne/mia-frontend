import { Icon } from '../../../components/icon'
import { SegmentedCircularProgress } from './progress-dots'

interface ChatHeaderProps {
  current: number
  total: number
  onManageIntegrations: () => void
}

export const ChatHeader = ({ current, total, onManageIntegrations }: ChatHeaderProps) => (
  <div className="sticky top-0 w-full p-3 gap-3 border-b border-secondary">

    <div className='w-full max-w-3xl mx-auto flex items-center justify-between'>
      <div className="flex items-center gap-3 bg-secondary px-3 py-2 rounded-xl w-full">
        <SegmentedCircularProgress current={current} total={total} size={32} />
        <h1 className="label-sm">Onboarding</h1>
      </div>
      <button
        type="button"
        onClick={onManageIntegrations}
        className="p-2 text-placeholder-subtle hover:text-tertiary hover:bg-tertiary rounded-full transition-colors"
        title="Manage Integrations"
        aria-label="Manage Integrations"
      >
        <Icon.settings_01 size={20} />
      </button>
    </div>
  </div>
)
