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
  predictReady?: boolean
}

const actions: QuickAction[] = [
  {
    id: 'grow',
    label: 'Grow',
    description: 'Discover growth opportunities.',
    icon: <Icon.trend_up_01 size={20} />,
  },
  {
    id: 'optimize',
    label: 'Optimize',
    description: 'Improve campaign performance.',
    icon: <Icon.sliders_01 size={20} />,
  },
  {
    id: 'protect',
    label: 'Protect',
    description: 'Safeguard your investments.',
    icon: <Icon.shield_tick size={20} />,
  },
]

export const QuickActions = ({
  onAction,
  disabled = false,
  predictReady = false,
}: QuickActionsProps) => {
  return (
    <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto px-4">
      {/* Grow / Optimize / Protect grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            disabled={disabled}
            className={`flex flex-col items-start gap-1 px-3 py-3 rounded-xl border text-left transition-all ${
              disabled
                ? 'bg-secondary border-tertiary text-placeholder-subtle cursor-not-allowed'
                : 'bg-primary border-secondary hover:border-primary hover:shadow-sm active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`shrink-0 ${disabled ? 'text-placeholder-subtle' : 'text-quaternary'}`}
              >
                {action.icon}
              </div>

              <div
                className={`subheading-md ${disabled ? 'text-placeholder-subtle' : 'text-primary'}`}
              >
                {action.label}
              </div>
            </div>
            <div className="min-w-0">
              <div
                className={`paragraph-xs mt-0.5 ${disabled ? 'text-placeholder-subtle' : 'text-quaternary'}`}
              >
                {action.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Predict — full-width, amber/gold accent, pulses when report ready */}
      <button
        onClick={() => onAction('predict')}
        disabled={disabled}
        className={`flex flex-col items-start gap-1 px-3 py-3 rounded-xl border text-left transition-all w-full ${
          disabled
            ? 'bg-secondary border-tertiary text-placeholder-subtle cursor-not-allowed'
            : predictReady
              ? 'bg-primary border-utility-warning-400 hover:border-utility-warning-500 hover:shadow-sm active:scale-[0.98] animate-pulse-gold shadow-[0_0_12px_rgba(212,175,55,0.3)]'
              : 'bg-primary border-utility-warning-300 hover:border-utility-warning-400 hover:shadow-sm active:scale-[0.98]'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`shrink-0 ${disabled ? 'text-placeholder-subtle' : 'text-utility-warning-600'}`}
          >
            <Icon.bar_chart_square_02 size={20} />
          </div>
          <div className={`subheading-md ${disabled ? 'text-placeholder-subtle' : 'text-primary'}`}>
            Predict
          </div>
          {predictReady && !disabled && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-utility-warning-100 text-utility-warning-700">
              Ready
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div
            className={`paragraph-xs mt-0.5 ${disabled ? 'text-placeholder-subtle' : 'text-quaternary'}`}
          >
            ML-powered predictions from your historical data.
          </div>
        </div>
      </button>

      {/* Strategise — full-width, purple accent, Pro badge */}
      <button
        onClick={() => onAction('strategise')}
        disabled={disabled}
        className={`flex flex-col items-start gap-1 px-3 py-3 rounded-xl border text-left transition-all w-full ${
          disabled
            ? 'bg-secondary border-tertiary text-placeholder-subtle cursor-not-allowed'
            : 'bg-primary border-brand-300 hover:border-brand-400 hover:shadow-sm active:scale-[0.98]'
        }`}
      >
        <div className="flex items-center gap-2 w-full">
          <div
            className={`shrink-0 ${disabled ? 'text-placeholder-subtle' : 'text-brand-600'}`}
          >
            <Icon.bar_chart_01 size={20} />
          </div>
          <div className={`subheading-md ${disabled ? 'text-placeholder-subtle' : 'text-primary'}`}>
            Strategise
          </div>
          {!disabled && (
            <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-brand-100 text-brand-700">
              Pro
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div
            className={`paragraph-xs mt-0.5 ${disabled ? 'text-placeholder-subtle' : 'text-quaternary'}`}
          >
            Optimise budget allocation across your RACE campaign.
          </div>
        </div>
      </button>
    </div>
  )
}

export default QuickActions
