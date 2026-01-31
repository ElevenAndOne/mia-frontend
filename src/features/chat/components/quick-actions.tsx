import type { ReactNode } from 'react'
import { Icon } from '../../../components/icon'

interface QuickAction {
  id: string
  label: string
  description: string
  icon: ReactNode
}

interface QuickActionsProps {
  onAction: (actionId: string) => void
  disabled?: boolean
}

const actions: QuickAction[] = [
  {
    id: 'grow',
    label: 'Grow',
    description: 'Discover opportunities to expand your reach and revenue.',
    icon: <Icon.trend_up_01 size={20} />
  },
  {
    id: 'optimize',
    label: 'Optimize',
    description: 'Fine-tune campaigns for better performance and efficiency.',
    icon: <Icon.sliders_01 size={20} />
  },
  {
    id: 'protect',
    label: 'Protect',
    description: 'Identify risks and safeguard your marketing investments.',
    icon: <Icon.shield_tick size={20} />
  }
]

export const QuickActions = ({ onAction, disabled = false }: QuickActionsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl mx-auto px-4">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          disabled={disabled}
          className={`flex flex-col items-start gap-1 px-3 py-3 rounded-xl border text-left transition-all ${disabled
              ? 'bg-secondary border-tertiary text-placeholder-subtle cursor-not-allowed'
              : 'bg-primary border-secondary hover:border-primary hover:shadow-sm active:scale-[0.98]'
            }`}
        >
          <div className="flex items-center gap-2">
            <div className={`shrink-0 ${disabled ? 'text-placeholder-subtle' : 'text-quaternary'}`}>
              {action.icon}
            </div>

            <div className={`subheading-md ${disabled ? 'text-placeholder-subtle' : 'text-primary'}`}>
              {action.label}
            </div>
          </div>
          <div className="min-w-0">
            <div className={`paragraph-xs mt-0.5 ${disabled ? 'text-placeholder-subtle' : 'text-quaternary'}`}>
              {action.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

export default QuickActions
