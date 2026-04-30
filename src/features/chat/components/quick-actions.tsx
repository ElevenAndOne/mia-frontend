import type { ReactNode } from 'react'
import { Icon } from '../../../components/icon'

interface QuickAction {
  id: string
  label: string
  icon: ReactNode
}

interface QuickActionsProps {
  onAction: (actionId: string) => void
  disabled?: boolean
  predictReady?: boolean
}

const actions: QuickAction[] = [
  { id: 'grow',     label: 'Grow',     icon: <Icon.trend_up_01 size={18} /> },
  { id: 'optimize', label: 'Optimize', icon: <Icon.sliders_01 size={18} /> },
  { id: 'protect',  label: 'Protect',  icon: <Icon.shield_tick size={18} /> },
]

export const QuickActions = ({
  onAction,
  disabled = false,
  predictReady = false,
}: QuickActionsProps) => {
  return (
    <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto px-4">

      {/* Grow / Optimize / Protect — always 3 equal columns */}
      <div className="grid grid-cols-3 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            disabled={disabled}
            className={`flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all ${
              disabled
                ? 'bg-secondary border-tertiary text-placeholder-subtle cursor-not-allowed'
                : 'bg-primary border-secondary hover:shadow-sm active:scale-[0.98]'
            }`}
          >
            <span className={`shrink-0 ${disabled ? 'text-placeholder-subtle' : 'text-quaternary'}`}>
              {action.icon}
            </span>
            <span className={`subheading-sm ${disabled ? 'text-placeholder-subtle' : 'text-primary'}`}>
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* Predict — full-width */}
      <button
        onClick={() => onAction('predict')}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-left transition-all w-full ${
          disabled
            ? 'bg-secondary border-tertiary text-placeholder-subtle cursor-not-allowed'
            : 'bg-primary border-brand-300 hover:border-brand-400 hover:shadow-sm active:scale-[0.98]'
        }`}
      >
        <span className={`shrink-0 ${disabled ? 'text-placeholder-subtle' : 'text-quaternary'}`}>
          <Icon.bar_chart_square_02 size={18} />
        </span>
        <span className={`subheading-sm shrink-0 w-[74px] ${disabled ? 'text-placeholder-subtle' : 'text-primary'}`}>
          Predict
        </span>
        {predictReady && !disabled && (
          <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-secondary text-secondary">
            Ready
          </span>
        )}
        {!predictReady && !disabled && (
          <span className="flex-1 min-w-0 paragraph-xs text-quaternary">
            ML-powered predictions from your historical data.
          </span>
        )}
      </button>

      {/* Strategise — full-width, purple accent, Pro badge */}
      <button
        onClick={() => onAction('strategise')}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-left transition-all w-full ${
          disabled
            ? 'bg-secondary border-tertiary text-placeholder-subtle cursor-not-allowed'
            : 'bg-primary border-brand-300 hover:border-brand-400 hover:shadow-sm active:scale-[0.98]'
        }`}
      >
        <span className={`shrink-0 ${disabled ? 'text-placeholder-subtle' : 'text-brand-600'}`}>
          <Icon.bar_chart_01 size={18} />
        </span>
        <span className={`subheading-sm shrink-0 w-[74px] ${disabled ? 'text-placeholder-subtle' : 'text-primary'}`}>
          Strategise
        </span>
        {!disabled && (
          <>
            <span className="flex-1 min-w-0 paragraph-xs text-quaternary">
              Optimise budget allocation across your RACE campaign.
            </span>
            <span className="shrink-0 ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-brand-100 text-brand-700">
              Pro
            </span>
          </>
        )}
      </button>

    </div>
  )
}

export default QuickActions
