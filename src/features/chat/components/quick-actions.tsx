import type { ReactNode } from 'react'
import { Icon } from '../../../components/icon'

interface QuickAction {
  id: string
  label: string
  icon: ReactNode
  description: string
}

interface QuickActionsProps {
  onAction: (actionId: string) => void
  disabled?: boolean
  strategiseReady?: boolean
}

const actions: QuickAction[] = [
  { id: 'grow',     label: 'Grow',     icon: <Icon.trend_up_01 size={18} />,  description: 'Analyse growth opportunities across your connected channels.' },
  { id: 'optimize', label: 'Optimize', icon: <Icon.sliders_01 size={18} />,   description: 'Identify efficiency gains and reduce wasted spend.' },
  { id: 'protect',  label: 'Protect',  icon: <Icon.shield_tick size={18} />,  description: 'Monitor risks and protect your campaign performance.' },
]

export const QuickActions = ({
  onAction,
  disabled = false,
  strategiseReady = false,
}: QuickActionsProps) => {
  return (
    <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto px-4">

      {/* Grow / Optimize / Protect — 3 equal columns on mobile */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
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

      {/* Grow / Optimize / Protect — full-width stacked cards on desktop */}
      <div className="hidden md:flex md:flex-col gap-3">
        {actions.map((action) => (
          <button
            key={`desktop-${action.id}`}
            onClick={() => onAction(action.id)}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-left transition-all w-full ${
              disabled
                ? 'bg-secondary border-tertiary text-placeholder-subtle cursor-not-allowed'
                : 'bg-primary border-secondary hover:shadow-sm active:scale-[0.98]'
            }`}
          >
            <span className={`shrink-0 ${disabled ? 'text-placeholder-subtle' : 'text-quaternary'}`}>
              {action.icon}
            </span>
            <span className={`subheading-sm shrink-0 w-[74px] ${disabled ? 'text-placeholder-subtle' : 'text-primary'}`}>
              {action.label}
            </span>
            {!disabled && (
              <span className="flex-1 min-w-0 paragraph-xs text-quaternary">
                {action.description}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Strategise — full-width, gold data insights */}
      <button
        onClick={() => onAction('strategise')}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-left transition-all w-full ${
          disabled
            ? 'bg-secondary border-tertiary text-placeholder-subtle cursor-not-allowed'
            : 'bg-primary border-utility-warning-400 hover:border-utility-warning-500 hover:shadow-sm active:scale-[0.98]'
        }`}
      >
        <span className={`shrink-0 ${disabled ? 'text-placeholder-subtle' : 'text-quaternary'}`}>
          <Icon.bar_chart_square_02 size={18} />
        </span>
        <span className={`subheading-sm shrink-0 w-[74px] ${disabled ? 'text-placeholder-subtle' : 'text-primary'}`}>
          Strategise
        </span>
        {!disabled && (
          <>
            <span className="flex-1 min-w-0 paragraph-xs text-quaternary">
              ML-powered predictions from your historical data.
            </span>
            {strategiseReady && (
              <span className="shrink-0 ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-secondary text-secondary">
                Ready
              </span>
            )}
          </>
        )}
      </button>

      {/* Predict — full-width, LP optimizer, Pro badge */}
      <button
        onClick={() => onAction('predict')}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-left transition-all w-full ${
          disabled
            ? 'bg-secondary border-tertiary text-placeholder-subtle cursor-not-allowed'
            : 'bg-primary border-utility-warning-400 hover:border-utility-warning-500 hover:shadow-sm active:scale-[0.98]'
        }`}
      >
        <span className={`shrink-0 ${disabled ? 'text-placeholder-subtle' : 'text-brand-600'}`}>
          <Icon.bar_chart_01 size={18} />
        </span>
        <span className={`subheading-sm shrink-0 w-[74px] ${disabled ? 'text-placeholder-subtle' : 'text-primary'}`}>
          Predict
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
