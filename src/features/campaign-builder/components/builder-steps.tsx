import { canOpen, currentStep, STEPS, type StepKey, type StepState } from './steps'

const BAR: Record<StepState | 'now', string> = {
  done: 'bg-utility-success-500',
  todo: 'bg-tertiary',
  busy: 'bg-brand-solid animate-pulse',
  recheck: 'bg-utility-warning-500',
  now: 'bg-brand-solid',
}

export function StepRail({
  states,
  step,
  onGo,
}: {
  states: Record<StepKey, StepState>
  step: StepKey
  onGo: (key: StepKey) => void
}) {
  const cur = currentStep(states)
  return (
    <nav aria-label="Campaign steps" className="flex flex-col gap-2">
      <ol className="grid grid-cols-6 gap-2">
        {STEPS.map((st, i) => {
          const state = states[st.key]
          const open = canOpen(states, st.key)
          const look = st.key === cur && state !== 'busy' && state !== 'recheck' ? 'now' : state
          return (
            <li key={st.key} className="min-w-0">
              <button
                type="button"
                disabled={!open}
                aria-current={st.key === step ? 'step' : undefined}
                onClick={() => onGo(st.key)}
                title={!open ? 'Finish the steps before this one first' : state === 'recheck' ? 'Something earlier changed: check this again' : undefined}
                className="flex w-full flex-col gap-1.5 text-left disabled:cursor-not-allowed"
              >
                <span className={`h-2.5 w-full rounded-full ${BAR[look]}`} />
                <span
                  className={`hidden @xl:block truncate paragraph-xs ${
                    st.key === step ? 'text-primary font-semibold' : open ? 'text-secondary' : 'text-quaternary'
                  }`}
                >
                  {i + 1}. {st.label}
                  {state === 'recheck' ? ' · recheck' : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <p className="@xl:hidden paragraph-xs text-secondary">
        Step {STEPS.findIndex((st) => st.key === step) + 1} of {STEPS.length}: {STEPS.find((st) => st.key === step)?.label}
      </p>
    </nav>
  )
}
