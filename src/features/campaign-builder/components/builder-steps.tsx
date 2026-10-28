import { canOpen, currentStep, STEPS, type StepKey, type StepState } from './steps'

const BAR: Record<StepState | 'now', string> = {
  done: 'bg-utility-success-500',
  todo: 'bg-tertiary',
  busy: 'bg-brand-solid animate-pulse',
  recheck: 'bg-utility-warning-500',
  now: 'bg-brand-solid',
}

// Progress you can see (local test 27 Oct: "all these look like the same page, as if we are getting nowhere"): each
// done step carries a ✓, the rail says how many are done, and only the step the PM is looking at is ringed; Mia's
// background work is a small "working" on its own step, never a second current step.
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
  const done = STEPS.filter((st) => states[st.key] === 'done').length
  return (
    <nav aria-label="Campaign steps" className="flex flex-col gap-2">
      <p className="paragraph-xs text-secondary">
        {done} of {STEPS.length} done
        <span className="@xl:hidden">
          {' '}
          · Step {STEPS.findIndex((st) => st.key === step) + 1}: {STEPS.find((st) => st.key === step)?.label}
        </span>
      </p>
      <ol className="grid grid-cols-6 gap-2">
        {STEPS.map((st, i) => {
          const state = states[st.key]
          const open = canOpen(states, st.key)
          const look = st.key === cur && state !== 'busy' && state !== 'recheck' ? 'now' : state
          const here = st.key === step
          return (
            <li key={st.key} className="min-w-0">
              <button
                type="button"
                disabled={!open}
                aria-current={here ? 'step' : undefined}
                onClick={() => onGo(st.key)}
                title={!open ? 'Finish the steps before this one first' : state === 'recheck' ? 'Something earlier changed: check this again' : undefined}
                className="flex w-full flex-col gap-1.5 text-left disabled:cursor-not-allowed"
              >
                <span
                  className={`h-2.5 w-full rounded-full ${BAR[look]} ${here ? 'outline outline-2 outline-offset-2 outline-[var(--color-border-brand)]' : ''}`}
                />
                <span
                  className={`hidden @xl:block truncate paragraph-xs ${
                    here ? 'text-primary font-semibold' : open ? 'text-secondary' : 'text-quaternary'
                  }`}
                >
                  {state === 'done' ? '✓ ' : `${i + 1}. `}
                  {st.label}
                  {state === 'recheck' ? ' · recheck' : state === 'busy' && !here ? ' · Mia working' : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
