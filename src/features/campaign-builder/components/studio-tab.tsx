import { Fragment, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/button'
import { useSession } from '../../../contexts/session-context'
import * as api from '../api'
import type { LaunchJob, StudioJob, StudioState } from '../types'
import { JobCard } from './launch-tab'
import { Card, NeedsYou, channelLabel, day, num } from './parts'
import { AskMia, PrimaryAction, YourTurn, type TurnItem } from './your-turn'

// The Studio tab (plan §8.2): the approved jobs, priced from the Credit Ledger and placed in the
// client's sprints, sent to Flex in one go. After that, Flex is where the work is managed; this tab
// shows each job's stage and review round and links to it.

export function StudioTab({ campaignId, approved, onChanged }: { campaignId: string; approved: boolean; onChanged?: () => void }) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const qc = useQueryClient()
  const key = ['campaign-studio', tenantId, campaignId]
  const q = useQuery({
    queryKey: key,
    queryFn: () => api.fetchStudio(sessionId!, tenantId!, campaignId),
    enabled: !!sessionId && !!tenantId && approved,
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sender, setSender] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const s = q.data
  useEffect(() => {
    if (s && !sender) setSender(s.you ?? '')
  }, [s, sender])
  // Studio and Launch are one page (19 Oct). The launch read refreshes from Flex first, so it is the page's
  // 45-second check; when it moves, the studio list is re-read too.
  const anySent = !!s?.jobs.some((j) => j.flex.task_id)
  const lkey = ['campaign-launch', tenantId, campaignId]
  const lq = useQuery({
    queryKey: lkey,
    queryFn: () => api.fetchLaunch(sessionId!, tenantId!, campaignId),
    enabled: !!sessionId && !!tenantId && approved && anySent,
    refetchInterval: 45 * 1000,
    refetchOnWindowFocus: true,
  })
  useEffect(() => {
    if (!lq.dataUpdatedAt) return
    qc.invalidateQueries({ queryKey: key })
    onChanged?.() // the header's next step follows what Flex says
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lq.dataUpdatedAt])
  const launchJobs = new Map((lq.data?.jobs ?? []).map((j) => [j.asset_id, j]))
  const [openRows, setOpenRows] = useState<Set<string>>(() => new Set())
  const reloadLaunch = async () => {
    await qc.invalidateQueries({ queryKey: lkey })
  }
  const openAndGo = (ids: string[]) => {
    setOpenRows((o) => new Set([...o, ...ids]))
    setTimeout(() => document.getElementById(`row-${ids[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }

  const act = async (label: string, fn: () => Promise<unknown>, after?: (out: unknown) => void) => {
    setBusy(label)
    setError(null)
    try {
      const out = await fn()
      await qc.invalidateQueries({ queryKey: key })
      onChanged?.() // the page header's next step follows a send (it said "Send the jobs" after sending, 16 Oct)
      after?.(out)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }
  const ids = [sessionId!, tenantId!, campaignId] as const

  if (!approved) {
    return <Card className="paragraph-sm text-secondary">Approve the plan first: the studio gets the approved jobs.</Card>
  }
  if (q.isPending) return <p className="paragraph-sm text-tertiary">Loading the jobs…</p>
  if (!s) return <p className="paragraph-sm text-error">{q.error instanceof Error ? q.error.message : 'Could not load the studio.'}</p>

  const toSend = s.jobs.filter((j) => j.include && !j.flex.task_id)
  // Show the tick at once and save in the background: waiting for the round trip made every box flash (18 Oct).
  const setJobs = (jobs: StudioJob[], change: { credits?: number | null; include?: boolean }) => {
    const idsToSet = new Set(jobs.map((x) => x.asset_id))
    qc.setQueryData<StudioState>(key, (old) =>
      old ? { ...old, jobs: old.jobs.map((x) => (idsToSet.has(x.asset_id) ? { ...x, ...change } : x)) } : old,
    )
    api
      .editStudio(...ids, jobs.map((x) => ({ asset_id: x.asset_id, ...change })))
      .then(() => qc.invalidateQueries({ queryKey: key }))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Could not save that')
        qc.invalidateQueries({ queryKey: key })
      })
  }
  const setAll = (jobs: StudioJob[], include: boolean) => setJobs(jobs.filter((x) => x.include !== include), { include })
  const groups = [
    { title: 'In Flex', jobs: s.jobs.filter((j) => j.flex.task_id), pick: false },
    { title: 'Not sent yet', jobs: s.jobs.filter((j) => !j.flex.task_id), pick: true },
  ]
  const unconfirmed = toSend.filter((j) => !j.credits_confirmed).length
  const otherBlockers = s.blockers.filter((b) => !/^Confirm the credits/.test(b))
  const inFlex = s.jobs.filter((j) => j.flex.task_id)
  const backCount = inFlex.filter((j) => j.flex.stage === 'done').length
  const senderPick = s.you ? (
    <span className="paragraph-xs text-tertiary">Sending as you ({s.you})</span>
  ) : (
    // Only someone without a Flex account picks one to send as; a Flex user always sends as themselves.
    <label className="flex items-center gap-1 paragraph-xs text-tertiary">
      Send as
      <select
        className="rounded-md border border-secondary bg-primary px-2 py-1 paragraph-xs text-primary"
        value={sender}
        onChange={(e) => setSender(e.target.value)}
      >
        <option value="">Pick a Flex account</option>
        {s.senders.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
    </label>
  )
  const items: TurnItem[] = []
  otherBlockers.forEach((b, k) => items.push({ key: `b${k}`, title: b, actions: <AskMia label="Before sending" detail={b} /> }))
  if (toSend.length || !s.sent) {
    items.push({
      key: 'confirm',
      title: unconfirmed ? `Check the credits on ${unconfirmed} job${unconfirmed === 1 ? '' : 's'}` : 'Credits checked',
      done: !unconfirmed,
      detail: 'Each job is priced from the studio rate card. Change a number in the list below if it is wrong, then confirm.',
      actions: (
        <PrimaryAction loading={busy === 'confirm'} onClick={() => act('confirm', () => api.editStudio(...ids, [], true))}>
          Confirm credits
        </PrimaryAction>
      ),
    })
    items.push({
      key: 'send',
      title: toSend.length ? `Send ${toSend.length} job${toSend.length === 1 ? '' : 's'} to Flex` : 'Pick the jobs to send',
      detail: toSend.length
        ? 'Each becomes an Open task in Flex with its credits and the full brief for the designer. Untick any you are not sending yet.'
        : 'Tick the jobs to send in the list below.',
      actions: toSend.length ? (
        <>
          {senderPick}
          <PrimaryAction
            loading={busy === 'send'}
            disabled={!!s.blockers.length || !sender}
            onClick={() =>
              act('send', () => api.sendToFlex(...ids, sender), (out) => setDone(`Sent: ${(out as { sent: number }).sent} new task(s) in Flex.`))
            }
          >
            Send to Flex
          </PrimaryAction>
        </>
      ) : null,
    })
  }
  const unsent = s.jobs.filter((j) => !j.flex.task_id)
  if (s.sent && unsent.length && !toSend.length) {
    items.push({
      key: 'rest',
      title: `${unsent.length} job${unsent.length === 1 ? '' : 's'} not sent yet`,
      detail: 'Tick the ones to send in the list below when they are ready for the studio.',
      actions: (
        <Button size="sm" onClick={() => setAll(unsent, true)}>
          Tick them all
        </Button>
      ),
    })
  }
  const byState = (st: string) => (lq.data?.jobs ?? []).filter((j) => j.state === st)
  const back = byState('ready')
  const toLaunch = byState('taken_in')
  const studioCount = byState('in_studio').length
  if (back.length) {
    items.push({
      key: 'check-back',
      title: `Check ${back.length} job${back.length === 1 ? '' : 's'} back from the studio`,
      detail: 'Look at the artwork and add the page people land on (Mia adds the UTM tags).',
      actions: <PrimaryAction onClick={() => openAndGo(back.map((j) => j.asset_id))}>Check {back.length === 1 ? 'it' : 'them'}</PrimaryAction>,
    })
  }
  if (toLaunch.length) {
    items.push({
      key: 'launch',
      title: `Launch ${toLaunch.length} job${toLaunch.length === 1 ? '' : 's'}`,
      detail: 'Push ads up paused, schedule posts, or mark them launched if you set them up yourself.',
      actions: <PrimaryAction onClick={() => openAndGo(toLaunch.map((j) => j.asset_id))}>Launch {toLaunch.length === 1 ? 'it' : 'them'}</PrimaryAction>,
    })
  }
  if (s.sent) {
    items.push({
      key: 'follow',
      title: studioCount ? `${studioCount} still in the studio` : 'Nothing left in the studio',
      detail: `${backCount} of ${inFlex.length} back from the studio. Mia checks Flex every 45 seconds while this page is open.`,
      done: !studioCount,
      actions: (
        <Button size="sm" loading={busy === 'refresh' || lq.isFetching} onClick={() => act('refresh', () => api.refreshFromFlex(...ids), () => void reloadLaunch())}>
          Check Flex now
        </Button>
      ),
    })
  }
  return (
    <div className="flex flex-col gap-4">
      {error ? <Card warn className="paragraph-sm text-primary">{error}</Card> : null}
      {done ? <Card className="paragraph-sm text-primary">{done}</Card> : null}
      <YourTurn items={items} />

      {s.credit_fit.length ? (
        <Card className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="subheading-sm text-primary">Credits for this send</p>
          {s.credit_fit.map((f) => (
            <span key={f.sprint} className="paragraph-sm text-secondary">
              {f.sprint}: {num(f.planned)}
              {f.free == null ? ' (room unknown)' : ` of ${num(f.free)} free`}
              {f.over ? (
                <>
                  {' '}
                  <NeedsYou>over: carry-over or extra credits needed</NeedsYou>
                </>
              ) : null}
            </span>
          ))}
        </Card>
      ) : null}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] paragraph-sm">
          <thead>
            <tr className="text-left label-xs text-tertiary">
              <th className="py-2 pr-2">Send</th>
              <th className="py-2 pr-2">Job</th>
              <th className="py-2 pr-2">Type · size</th>
              <th className="py-2 pr-2 text-right">Credits</th>
              <th className="py-2 pr-2">Due</th>
              <th className="py-2 pr-2">Sprint</th>
              <th className="py-2 pr-2 min-w-[7.5rem]">In Flex</th>
            </tr>
          </thead>
          <tbody>
            {/* Two groups, sent first (live test 18 Oct: one long mixed table was hard to read). */}
            {groups.map((g) =>
              g.jobs.length ? (
                <Fragment key={g.title}>
                  <tr>
                    <td colSpan={7} className="pt-4 pb-1">
                      <span className="flex flex-wrap items-center gap-3">
                        <span className="subheading-sm text-primary">
                          {g.title} ({g.jobs.length})
                        </span>
                        {g.pick ? (
                          <>
                            <button type="button" className="paragraph-xs text-tertiary hover:text-primary" onClick={() => setAll(g.jobs, true)}>
                              Tick all
                            </button>
                            <button type="button" className="paragraph-xs text-tertiary hover:text-primary" onClick={() => setAll(g.jobs, false)}>
                              Untick all
                            </button>
                          </>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                  {g.jobs.map((j) => {
                    const lj = launchJobs.get(j.asset_id)
                    const open = openRows.has(j.asset_id)
                    return (
                      <Fragment key={j.asset_id}>
                        <Row
                          j={j}
                          launch={lj}
                          open={open}
                          onToggle={lj ? () => setOpenRows((o) => { const n = new Set(o); if (n.has(j.asset_id)) n.delete(j.asset_id); else n.add(j.asset_id); return n }) : undefined}
                          disabled={busy === 'send'}
                          onChange={(change) => setJobs([j], change)}
                        />
                        {open && lj ? (
                          <tr className="bg-secondary">
                            <td colSpan={7} className="px-3 py-3">
                              <JobCard j={lj} campaignId={campaignId} onDone={reloadLaunch} bare />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </Fragment>
              ) : null,
            )}
          </tbody>
        </table>
      </Card>

    </div>
  )
}

function Row({
  j,
  launch,
  open,
  onToggle,
  disabled,
  onChange,
}: {
  j: StudioJob
  launch?: LaunchJob
  open?: boolean
  onToggle?: () => void
  disabled: boolean
  onChange: (c: { credits?: number | null; include?: boolean }) => void
}) {
  const [c, setC] = useState(j.credits == null ? '' : String(j.credits))
  useEffect(() => setC(j.credits == null ? '' : String(j.credits)), [j.credits])
  const inFlex = !!j.flex.task_id
  const missing = j.include && !inFlex && j.credits == null
  return (
    <tr id={`row-${j.asset_id}`} className="border-t border-secondary align-top scroll-mt-24">
      <td className="py-2 pr-2">
        {inFlex ? (
          <span className="label-xs text-utility-success-700 whitespace-nowrap" title="Sent to Flex">✓ sent</span>
        ) : (
        <input
          type="checkbox"
          className="size-4 accent-[var(--color-background-brand-solid)] cursor-pointer disabled:cursor-default"
          aria-label={`Send ${j.name}`}
          checked={j.include}
          disabled={disabled || inFlex}
          onChange={(e) => onChange({ include: e.target.checked })}
        />
        )}
      </td>
      <td className="py-2 pr-2 min-w-0">
        <span className="text-primary">{j.name}</span>
        <span className="block paragraph-xs text-tertiary">
          {j.phase} · {channelLabel(j.channel)}
          {j.setup_work ? ' · setup work (credits for setup still to be agreed)' : ''}
        </span>
      </td>
      <td className="py-2 pr-2 text-secondary">
        {j.ledger_type ?? '—'}
        {j.ledger_tier ? ` · ${j.ledger_tier}` : ''}
      </td>
      <td className="py-2 pr-2 text-right">
        {inFlex ? (
          num(j.credits)
        ) : (
          <span className="inline-flex flex-col items-end gap-0.5">
            <input
              aria-label={`${j.name} credits`}
              className={`w-16 rounded-md bg-primary px-2 py-1 text-right paragraph-sm text-primary ${missing ? 'border-2 border-utility-warning-300' : 'border border-secondary'}`}
              inputMode="decimal"
              placeholder="?"
              value={c}
              disabled={disabled}
              onChange={(e) => setC(e.target.value)}
              onBlur={() => {
                const v = c.trim() === '' ? null : Number(c)
                if (v !== j.credits) onChange({ credits: v })
              }}
            />
            {missing ? <NeedsYou>no rate: set it</NeedsYou> : null}
          </span>
        )}
      </td>
      <td className="py-2 pr-2 text-secondary">{day(j.due_date)}</td>
      <td className="py-2 pr-2 text-secondary">
        {(() => {
          const sp = j.flex.sprint_name ?? j.sprint ?? '—'
          const m = /^(.*?)\s*\(projected\)$/.exec(sp)
          return m ? (
            <>
              {m[1]} <span className="paragraph-xs text-tertiary">projected</span>
            </>
          ) : (
            sp
          )
        })()}
      </td>
      <td className="py-2 pr-2">
        {inFlex ? (
          <span className="flex flex-col gap-0.5">
            {launch && launch.state !== 'in_studio' ? (
              <LaunchChip state={launch.state} how={launch.launch?.how} />
            ) : (
              <StageChip label={j.flex.stage_label ?? j.flex.status ?? 'Open'} />
            )}
            {j.flex.review_rounds && (j.flex.review_rounds.internal || j.flex.review_rounds.client) ? (
              <span className="paragraph-xs text-tertiary">
                review: internal {j.flex.review_rounds.internal}, client {j.flex.review_rounds.client}
              </span>
            ) : null}
            {j.flex.url ? (
              <a className="inline-flex w-fit items-center whitespace-nowrap rounded-md border border-brand px-2 py-0.5 paragraph-xs text-brand-secondary hover:bg-brand-primary"
                href={j.flex.url} target="_blank" rel="noreferrer">
                Open in Flex ↗
              </a>
            ) : (
              <span className="paragraph-xs text-tertiary">in Flex</span>
            )}
          </span>
        ) : (
          <span className="paragraph-xs text-tertiary">Not sent</span>
        )}
        {onToggle ? (
          <button type="button" aria-expanded={!!open} onClick={onToggle} className="mt-1 block paragraph-xs underline text-primary">
            {open ? 'Hide launch' : launch?.state === 'ready' || launch?.state === 'taken_in' ? 'Launch it' : 'Details'}
          </button>
        ) : null}
      </td>
    </tr>
  )
}

// Where a job stands once it's back from the studio, in the same chip style as the Flex stages.
function LaunchChip({ state, how }: { state: string; how?: string }) {
  const [label, cls] =
    state === 'ready'
      ? ['Back: check it', 'bg-utility-warning-100 text-utility-warning-700 border-utility-warning-300']
      : state === 'taken_in'
        ? ['Ready to launch', 'bg-utility-blue-100 text-utility-blue-700 border-utility-blue-300']
        : state === 'launched'
          ? [how === 'scheduled' ? '✓ Scheduled' : how === 'manual' ? '✓ Launched' : '✓ Pushed, paused', 'bg-success-primary text-success border-transparent']
          : ['Cancelled', 'bg-tertiary text-tertiary border-secondary']
  return <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 label-xs whitespace-nowrap ${cls}`}>{label}</span>
}

// Each Flex stage its own colour, so where the jobs stand reads at a glance (16 Oct).
const STAGE_STYLE: Record<string, string> = {
  Open: 'bg-utility-gray-100 text-utility-gray-700 border-utility-gray-300',
  Ready: 'bg-utility-blue-100 text-utility-blue-700 border-utility-blue-300',
  'In progress': 'bg-utility-warning-100 text-utility-warning-700 border-utility-warning-300',
  'In review': 'bg-utility-purple-100 text-utility-purple-700 border-utility-purple-300',
  Done: 'bg-utility-success-100 text-utility-success-700 border-utility-success-300',
  Cancelled: 'bg-utility-error-100 text-utility-error-700 border-utility-error-300',
}

function StageChip({ label }: { label: string }) {
  return (
    <span className={`inline-flex w-fit items-center whitespace-nowrap rounded-full border px-2 py-0.5 label-xs ${STAGE_STYLE[label] ?? STAGE_STYLE.Open}`}>
      {label}
    </span>
  )
}
