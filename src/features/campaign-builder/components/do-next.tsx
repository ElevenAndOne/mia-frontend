import { Button } from '../../../components/button'
import type { BuildState } from '../types'
import type { StepKey } from './steps'

// Do this next (26 Oct): what an earlier change needs from the PM, shown at the top of whichever step they're on,
// with its button right there, so a change never sends them back through the steps. Only cross-step items live here;
// each step's own work stays in its Your turn list.
export function DoNext({
  state,
  busy,
  onMakePlan,
  onKeepPlan,
  onRewrite,
  onGo,
  step,
}: {
  step?: StepKey
  state: BuildState
  busy: string | null
  onMakePlan: () => unknown
  onKeepPlan: () => unknown
  onRewrite: (jobIds: string[]) => unknown
  onGo: (k: StepKey) => void
}) {
  const plan = state.plan
  if (!plan || !state.campaign.building || state.plan_run?.status === 'running') return null
  const stale = plan.assets.filter((a) => a.words_stale && a.job_id)
  const recheck = plan.decisions.kpi_targets.filter((t) => t.recheck && t.value != null)
  const items: { key: string; text: string; actions: React.ReactNode }[] = []
  // Key facts closes with the same choice itself; and while the brief is newer than the plan, nothing else here is
  // worth doing first (a rewrite would be for a plan about to be updated or kept; review 26 Oct)
  if (state.plan_from_older_brief && step === 'facts') return null
  if (state.plan_from_older_brief)
    items.push({
      key: 'brief',
      text: 'The budget, dates, channels or goal changed. Update the plan for it (everything you decided is kept where it still fits), or keep this plan and fix what no longer fits.',
      actions: (
        <>
          <Button size="sm" variant="primary" loading={busy === 'plan'} onClick={() => void onMakePlan()}>
            Update the plan
          </Button>
          <Button size="sm" loading={busy === 'keep'} onClick={() => void onKeepPlan()}>
            Keep this plan
          </Button>
        </>
      ),
    })
  else if (stale.length)
    items.push({
      key: 'words',
      text: `${stale.length} job${stale.length === 1 ? '' : 's'}’ words were written before something changed (${[
        ...new Set(stale.flatMap((a) => a.words_stale_why ?? [])),
      ]
        .slice(0, 3)
        .join(', ')}).`,
      actions: (
        <Button size="sm" variant="primary" loading={busy === 'words'} onClick={() => void onRewrite(stale.map((a) => a.job_id!))}>
          Rewrite their words
        </Button>
      ),
    })
  if (!state.plan_from_older_brief && recheck.length)
    items.push({
      key: 'targets',
      text: `${recheck.length} target${recheck.length === 1 ? '' : 's'} you kept were worked out before a change. Keep them or use Mia’s new number.`,
      actions: (
        <Button size="sm" onClick={() => onGo('targets')}>
          Check the targets
        </Button>
      ),
    })
  if (!items.length) return null
  return (
    <section aria-label="Do this next" className="rounded-xl border border-brand bg-primary px-4 py-3 flex flex-col gap-2">
      <p className="label-sm text-primary">Do this next</p>
      {items.map((i) => (
        <div key={i.key} className="flex flex-wrap items-center justify-between gap-2">
          <p className="paragraph-sm text-secondary min-w-0 flex-1">{i.text}</p>
          <div className="flex flex-wrap gap-2">{i.actions}</div>
        </div>
      ))}
    </section>
  )
}
