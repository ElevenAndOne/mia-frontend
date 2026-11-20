import { JobId, JobNames } from './job-names'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/button'
import { useSession } from '../../../contexts/session-context'
import { CopyButton } from './copy-button'
import * as api from '../api'
import type { LaunchJob, StudioChangeRequest, StudioIdea, StudioJob, StudioState } from '../types'
import { JobCard } from './launch-tab'
import { Card, NeedsYou, channelLabel, day, num } from './parts'
import { AskMia, PrimaryAction, YourTurn, askMia, type TurnItem } from './your-turn'

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
    refetchInterval: 2 * 60 * 1000, // the server reads Flex at most every 15 minutes (review 22 Oct, 4.6)
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
  // Jobs that can go to Flex: not there yet and not tracked in ClickUp (3 Nov: a campaign moved from the old builder
  // listed all its ClickUp work as "Not sent yet" and asked the PM to pick jobs to send)
  const outside = (j: StudioJob) => !j.flex.task_id && !!(j.clickup || j.kept_out)
  const unsent = s.jobs.filter((j) => !j.flex.task_id && !outside(j))
  const groups = [
    { title: 'In Flex', jobs: s.jobs.filter((j) => j.flex.task_id), pick: false },
    { title: 'Made outside Flex', jobs: s.jobs.filter(outside), pick: false },
    { title: 'Not sent yet', jobs: unsent, pick: true },
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
        <option value="">{s.flex_down ? 'Flex isn’t answering: try again soon' : 'Pick a Flex account'}</option>
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
  if (toSend.length || (!s.sent && unsent.length)) {
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
      // Flex not answering is said on the item, not only inside the account picker (review 2 Nov)
      detail: s.flex_down
        ? 'Flex isn’t answering right now, so nothing can be sent. Try again in a few minutes.'
        : toSend.length
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
      // a job done in Flex with no file is asked for its file, not its artwork (browser pass 16 Nov)
      detail: back.some((j) => j.no_file)
        ? `${back.filter((j) => j.no_file).length} came back with no file: paste its link. Then add the page people land on (Mia adds the UTM tags).`
        : 'Look at the artwork and add the page people land on (Mia adds the UTM tags).',
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
  // jobs worked in ClickUp and closed there, not live in Mia yet: sent from Brevo or the like, so the PM marks them
  // live (a task set to live/running in ClickUp is marked live by Mia herself; 18 Nov)
  const closedInClickUp = s.jobs.filter(
    (j) => j.clickup?.done_at && !j.flex.task_id && launchJobs.get(j.asset_id)?.state === 'elsewhere',
  )
  if (closedInClickUp.length) {
    items.push({
      key: 'clickup-closed',
      title: `${closedInClickUp.length} job${closedInClickUp.length === 1 ? '' : 's'} closed in ClickUp, not live in Mia`,
      detail: 'Once each is out (sent from Brevo, posted, running), mark it live with its link so Mia tracks its results.',
      actions: (
        <PrimaryAction onClick={() => openAndGo(closedInClickUp.map((j) => j.asset_id))}>
          Mark {closedInClickUp.length === 1 ? 'it' : 'them'} live
        </PrimaryAction>
      ),
    })
  }
  const newIdeas = (s.ideas?.items ?? []).filter((i) => i.status === 'new')
  if (newIdeas.length) {
    items.push({
      key: 'ideas',
      title: `${newIdeas.length} idea${newIdeas.length === 1 ? '' : 's'} from the studio`,
      detail: 'Sent from the plan in Flex. Ask Mia to make one a job, or set it aside. Nothing changes until you apply her card.',
      actions: (
        <Button size="sm" onClick={() => document.getElementById('studio-ideas')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
          See {newIdeas.length === 1 ? 'it' : 'them'}
        </Button>
      ),
    })
  }
  if (s.sent) {
    items.push({
      key: 'follow',
      title: studioCount ? `${studioCount} still in the studio` : 'Nothing left in the studio',
      detail: `${backCount} of ${inFlex.length} back from the studio. Mia checks Flex every 15 minutes, or now with Check Flex now.`,
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
      {s.outline?.version ? (
        // the whole plan in Flex, read only at the top of the campaign (the outline, 17 Nov)
        <p className="paragraph-xs text-tertiary">
          {s.outline.current
            ? 'Flex has the whole plan as it is now, shown at the top of the campaign there; the studio can send ideas from it.'
            : s.outline.error ?? 'The plan’s latest changes go to Flex shortly.'}
        </p>
      ) : null}
      {s.ideas?.items.length || s.ideas?.set_aside ? (
        <Ideas
          ideas={s.ideas.items}
          aside={s.ideas.set_aside_items ?? []}
          busy={busy}
          onDecide={(i, status) => act(`idea-${i.id}`, () => api.decideIdea(...ids, i.id, status))}
        />
      ) : null}
      {s?.job_code?.code ? (
        // Mia's job numbers (step 7, 16 Nov): code + number on every job, sent to Flex and at the end of each ad's name
        <Card className="flex flex-wrap items-center justify-between gap-2">
          <p className="paragraph-sm text-secondary">
            Job numbers: <span className="text-primary tabular-nums">{s.job_code.code}-01</span>,{' '}
            <span className="text-primary tabular-nums">{s.job_code.code}-02</span>…{' '}
            {/* under the naming scheme (20 Nov) the ad's name ends with the Job ID, not the number */}
            {s.jobs.some((j) => j.names)
              ? 'They go to Flex with each job. Each job also has a Job ID, at the end of every name and link it carries.'
              : "They go to Flex with each job and at the end of each ad's name, so an ad traces back to its job."}
            {s.job_code.locked ? ' The code is fixed now: Flex tasks and ads carry it.' : ''}
          </p>
          {!s.job_code.locked ? (
            <Button size="sm" loading={busy === 'code'} onClick={() => {
              const next = window.prompt('The campaign\'s job code: 2 to 6 letters or digits, starting with a letter', s.job_code?.code ?? '')
              if (!next || !sessionId || !tenantId) return
              setBusy('code')
              setError(null)
              api.setJobCode(sessionId, tenantId, campaignId, next)
                .then(() => qc.invalidateQueries({ queryKey: key }))
                .catch((e) => setError(e instanceof Error ? e.message : 'Could not change the code'))
                .finally(() => setBusy(null))
            }}>
              Change the code
            </Button>
          ) : null}
        </Card>
      ) : null}

      {/* Jobs are added on this page through Mia, not from the old campaign screen or the home chat; nothing here said so
          (live 5 Nov: "I am not sure how to add new tasks"). The chat starts the line, the PM finishes it. */}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="paragraph-sm text-secondary max-w-[60ch]">
          Need more jobs in this campaign? Ask Mia in the chat: type them, add a file (a spreadsheet, a Word document or a
          ClickUp export), or paste ClickUp links. She sorts them into phases, prices them from the credit table, and shows
          one card for you to check and apply before anything changes.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => askMia({ label: 'Add a job', draft: 'Add a job: ' })}>
            Add a job
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => askMia({ label: 'Add jobs from a file', draft: 'Add the jobs in this file to the campaign. ', pickFile: true })}
          >
            Add jobs from a file
          </Button>
        </div>
      </Card>

      {lq.data?.tag ? (
        // The one manual step a PM can get wrong: an ad they set up by hand must carry the tag for its results to come
        // back (26 Oct). Mia puts it in every link she tracks.
        <Card className="flex flex-col gap-1">
          <p className="paragraph-sm text-primary flex flex-wrap items-center gap-2">
            This campaign’s tag: <code className="rounded bg-secondary px-1.5 py-0.5">{lq.data.tag}</code>
            <CopyButton value={lq.data.tag} />
          </p>
          <p className="paragraph-xs text-secondary">
            Mia adds it to every link when you take a job in. For ads you set up by hand, like LinkedIn, start the ad
            campaign’s name with it, or link that campaign to this one, so its results come back here.
          </p>
        </Card>
      ) : null}

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
                          onWithdraw={(r) => act(`withdraw-${r.mia_request_id}`, () => api.withdrawChangeRequest(...ids, r.mia_request_id))}
                          busy={busy}
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
  onWithdraw,
  busy,
}: {
  j: StudioJob
  launch?: LaunchJob
  open?: boolean
  onToggle?: () => void
  disabled: boolean
  onChange: (c: { credits?: number | null; include?: boolean }) => void
  onWithdraw?: (r: StudioChangeRequest) => void
  busy?: string | null
}) {
  const [c, setC] = useState(j.credits == null ? '' : String(j.credits))
  const typing = useRef(false) // a refresh never overwrites the box while the PM is typing (review 26 Oct)
  useEffect(() => {
    if (!typing.current) setC(j.credits == null ? '' : String(j.credits))
  }, [j.credits])
  const inFlex = !!j.flex.task_id
  const inClickUp = !inFlex && !!j.clickup
  const madeElsewhere = !inFlex && !inClickUp && !!j.kept_out
  const missing = j.include && !inFlex && j.credits == null
  return (
    <tr id={`row-${j.asset_id}`} className="border-t border-secondary align-top scroll-mt-24">
      <td className="py-2 pr-2">
        {inFlex ? (
          <span className="label-xs text-utility-success-700 whitespace-nowrap" title="Sent to Flex">✓ sent</span>
        ) : inClickUp ? (
          <span className="label-xs text-tertiary whitespace-nowrap" title="Tracked in ClickUp, so it isn't sent to Flex">ClickUp</span>
        ) : madeElsewhere ? (
          <span className="label-xs text-tertiary whitespace-nowrap" title={j.kept_out ?? undefined}>Done</span>
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
        {j.job_no ? <span className="ml-1.5 paragraph-xs text-tertiary tabular-nums">{j.job_no}</span> : null}
        <JobId id={j.job_id} />
        <span className="block paragraph-xs text-tertiary">
          {j.phase} · {channelLabel(j.channel)}
          {j.setup_work ? ' · setup work (credits for setup still to be agreed)' : ''}
        </span>
        <JobNames names={j.names} />
        {inFlex ? <Requests rs={j.change_requests ?? []} onWithdraw={onWithdraw} busy={busy} /> : null}
        {inFlex && j.clickup_not_linked ? (
          <span className="block label-xs text-utility-warning-700" title={j.clickup_not_linked}>
            Not linked to its ClickUp task yet: Mia tries again on the next Flex read
          </span>
        ) : null}
      </td>
      <td className="py-2 pr-2 text-secondary">
        {j.ledger_type ?? '—'}
        {j.ledger_tier ? ` · ${j.ledger_tier}` : ''}
      </td>
      <td className="py-2 pr-2 text-right">
        {inFlex || inClickUp || madeElsewhere ? (
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
              onFocus={() => {
                typing.current = true
              }}
              onChange={(e) => setC(e.target.value)}
              onBlur={() => {
                typing.current = false
                // numbers only, never below zero (review 22 Oct, 5.3: letters cleared the credits, negatives passed)
                const v = c.trim() === '' ? null : Number(c)
                if (v != null && (!Number.isFinite(v) || v < 0)) {
                  setC(j.credits == null ? '' : String(j.credits))
                  return
                }
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
        ) : inClickUp && j.clickup ? (
          <span className="flex flex-col gap-0.5">
            {/* what ClickUp says now (read every 15 minutes); live once it's live/running there or marked live (18 Nov) */}
            {launch?.state === 'launched' ? (
              <LaunchChip state="launched" how={launch.launch?.how} />
            ) : j.clickup.clickup_status ? (
              <span className="inline-flex w-fit items-center whitespace-nowrap rounded-full border border-secondary px-2 py-0.5 label-xs text-secondary">
                ClickUp: {j.clickup.clickup_status}
              </span>
            ) : null}
            {j.clickup.done_at && launch?.state === 'elsewhere' ? <NeedsYou>closed in ClickUp: mark it live once it's out</NeedsYou> : null}
            {j.clickup.state === 'deleted' ? null : (
              <a className="inline-flex w-fit items-center whitespace-nowrap rounded-md border border-secondary px-2 py-0.5 paragraph-xs text-secondary hover:bg-secondary"
                href={j.clickup.url} target="_blank" rel="noreferrer">
                Open in ClickUp ↗
              </a>
            )}
            {/* the nightly ClickUp check: re-link the job to the task the team works in, or drop it */}
            {j.clickup.state === 'archived' || j.clickup.state === 'deleted' ? (
              <NeedsYou>{j.clickup.state === 'archived' ? 'task archived in ClickUp' : 'task deleted in ClickUp'}</NeedsYou>
            ) : null}
          </span>
        ) : madeElsewhere ? (
          launch?.state === 'launched' ? (
            <LaunchChip state="launched" how={launch.launch?.how} />
          ) : (
            <span className="paragraph-xs text-tertiary">{j.kept_out}</span>
          )
        ) : (
          <span className="paragraph-xs text-tertiary">Not sent</span>
        )}
        {onToggle ? (
          <button type="button" aria-expanded={!!open} onClick={onToggle} className="mt-1 block paragraph-xs underline text-primary">
            {open ? 'Hide launch' : launch?.state === 'ready' || launch?.state === 'taken_in' ? 'Launch it' : launch?.state === 'elsewhere' ? 'Mark live' : 'Details'}
          </button>
        ) : null}
      </td>
    </tr>
  )
}

// Changes asked of the studio for a job in Flex: what was asked and where it stands (17 Nov). An open one can be taken
// back; a decided one says who decided and their note.
const SAID: Record<StudioChangeRequest['status'], string> = {
  to_send: 'asked, going to Flex',
  open: 'asked, waiting on the studio lead',
  to_withdraw: 'being taken back',
  accepted: 'accepted',
  declined: 'declined',
  withdrawn: 'taken back',
  refused: 'Flex couldn’t take it',
}

function Requests({ rs, onWithdraw, busy }: { rs: StudioChangeRequest[]; onWithdraw?: (r: StudioChangeRequest) => void; busy?: string | null }) {
  // everything still waiting, and the latest answer on each field (older answers are in Flex's history)
  const shown = rs.filter(
    (r, k) => ['to_send', 'open', 'to_withdraw'].includes(r.status) || !rs.slice(k + 1).some((x) => x.field === r.field),
  )
  if (!shown.length) return null
  // dates read as the job row does ("18 Nov 2026"); names and credits as they are
  const v = (r: StudioChangeRequest, x: string | number | null) =>
    x == null || x === '' ? '—' : r.field === 'due_date' || r.field === 'launch_date' ? day(String(x)) : String(x)
  return (
    <span className="mt-1 flex flex-col gap-0.5">
      {shown.map((r) => {
        const waiting = r.status === 'to_send' || r.status === 'open'
        const tone =
          r.status === 'accepted'
            ? 'text-utility-success-700'
            : r.status === 'declined' || r.status === 'refused'
              ? 'text-utility-error-700'
              : 'text-utility-warning-700'
        return (
          <span key={r.mia_request_id} className={`label-xs ${tone}`}>
            {r.label} {v(r, r.old)} → {v(r, r.new)}: {SAID[r.status]}
            {r.decided_by && !waiting ? ` by ${r.decided_by}` : ''}
            {r.note ? ` (“${r.note}”)` : ''}
            {r.error && r.status !== 'accepted' ? <span className="block text-tertiary">{r.error}</span> : null}
            {waiting && onWithdraw ? (
              <button
                type="button"
                className="ml-2 underline text-tertiary hover:text-primary disabled:opacity-50"
                disabled={busy === `withdraw-${r.mia_request_id}`}
                onClick={() => onWithdraw(r)}
              >
                Take it back
              </button>
            ) : null}
          </span>
        )
      })}
    </span>
  )
}

// The studio's ideas from the outline in Flex (17 Nov). Mia makes every job, so an idea becomes one only through her
// card in the chat; the PM can also set one aside.
function Ideas({
  ideas,
  aside,
  busy,
  onDecide,
}: {
  ideas: StudioIdea[]
  aside: StudioIdea[]
  busy: string | null
  onDecide: (i: StudioIdea, status: 'new' | 'asked' | 'set_aside') => void
}) {
  const [showAside, setShowAside] = useState(false)
  return (
    <Card className="flex flex-col gap-3">
      <div id="studio-ideas" className="scroll-mt-24 flex flex-wrap items-baseline justify-between gap-2">
        <p className="subheading-sm text-primary">Ideas from the studio</p>
        {aside.length ? (
          <button type="button" className="paragraph-xs text-tertiary underline hover:text-primary" onClick={() => setShowAside((v) => !v)}>
            {showAside ? 'Hide the ones set aside' : `${aside.length} set aside`}
          </button>
        ) : null}
      </div>
      {!ideas.length && !showAside ? <p className="paragraph-sm text-secondary">Every idea is set aside.</p> : null}
      {ideas.map((i) => (
        <div key={i.id} className="flex flex-wrap items-start justify-between gap-3 border-t border-secondary pt-3 first:border-t-0 first:pt-0">
          <div className="min-w-0 max-w-[60ch]">
            <p className="paragraph-sm text-primary whitespace-pre-line">{i.body}</p>
            <p className="paragraph-xs text-tertiary">
              {i.by_name ?? i.by_email ?? 'The studio'}
              {i.about ? ` · on ${i.about}` : ''}
              {i.created_at ? ` · ${day(i.created_at.slice(0, 10))}` : ''}
              {i.status === 'asked' ? ' · asked Mia' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={i.status === 'new' ? 'primary' : 'secondary'}
              loading={busy === `idea-${i.id}`}
              onClick={() => {
                askMia({
                  label: 'An idea from the studio',
                  draft: `Make a job from the studio's idea${i.about ? ` (on ${i.about})` : ''}${i.by_name ? `, from ${i.by_name}` : ''}: "${i.body}" `,
                })
                if (i.status !== 'asked') onDecide(i, 'asked')
              }}
            >
              {i.status === 'asked' ? 'Ask Mia again' : 'Ask Mia to make it a job'}
            </Button>
            <Button size="sm" variant="secondary" loading={busy === `idea-${i.id}`} onClick={() => onDecide(i, 'set_aside')}>
              Set aside
            </Button>
          </div>
        </div>
      ))}
      {showAside
        ? aside.map((i) => (
            <div key={`a-${i.id}`} className="flex flex-wrap items-start justify-between gap-3 border-t border-secondary pt-3 opacity-70">
              <div className="min-w-0 max-w-[60ch]">
                <p className="paragraph-sm text-secondary whitespace-pre-line">{i.body}</p>
                <p className="paragraph-xs text-tertiary">
                  {i.by_name ?? i.by_email ?? 'The studio'}
                  {i.about ? ` · on ${i.about}` : ''} · set aside
                </p>
              </div>
              <Button size="sm" variant="secondary" loading={busy === `idea-${i.id}`} onClick={() => onDecide(i, 'new')}>
                Bring it back
              </Button>
            </div>
          ))
        : null}
    </Card>
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
          ? [how === 'scheduled' ? '✓ Scheduled' : how === 'manual' ? '✓ Launched' : how === 'clickup' ? '✓ Live (ClickUp)' : '✓ Pushed, paused', 'bg-success-primary text-success border-transparent']
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
