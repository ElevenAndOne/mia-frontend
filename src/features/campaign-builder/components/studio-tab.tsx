import { JobId, JobNames } from './job-names'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/button'
import { useSession } from '../../../contexts/session-context'
import { CopyButton } from './copy-button'
import * as api from '../api'
import type { LaunchJob, StudioChangeRequest, StudioDelivery, StudioDrive, StudioIdea, StudioJob, StudioState, StudioTeam } from '../types'
import { JobCard } from './launch-tab'
import { Card, NeedsYou, channelLabel, day, num, phaseTag } from './parts'
import { AskMia, PrimaryAction, YourTurn, askMia, type TurnItem } from './your-turn'

// The Studio tab (plan §8.2): the approved jobs, priced from the Credit Ledger and placed in the
// client's sprints, sent to Flex in one go. After that, Flex is where the work is managed; this tab
// shows each job's stage and review round and links to it.
// Clean-up (Josh, retest 24 Nov, E31/E33/E34: "the UI must be as clean as possible every step of the way"): Your turn
// says the one thing to do (or that Mia is working and the PM can't go on yet), each job is one line with one real
// button when there is something to do, and the reference (Drive, job numbers, the tag, adding a job, the team) is
// folded under More. Designers never see this page: they work in Flex and the Drive folders.

const DRIVE_MAKING = /^Mia is making the Drive folders/

export function StudioTab({ campaignId, approved, onChanged }: { campaignId: string; approved: boolean; onChanged?: () => void }) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const qc = useQueryClient()
  const key = ['campaign-studio', tenantId, campaignId]
  const q = useQuery({
    queryKey: key,
    queryFn: () => api.fetchStudio(sessionId!, tenantId!, campaignId),
    enabled: !!sessionId && !!tenantId && approved,
    // the Drive folders are made in the background: look again every few seconds until they are (naming step 4)
    // (or while the server says it's waiting on them: the flag is per server process, the blocker isn't; review 25 Nov)
    refetchInterval: (query) =>
      query.state.data?.drive?.making || (query.state.data?.blockers ?? []).some((b) => DRIVE_MAKING.test(b)) ? 4000 : false,
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sender, setSender] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const s = q.data
  useEffect(() => {
    if (s && !sender) setSender(s.you ?? '')
  }, [s, sender])
  // Studio and Launch are one page (19 Oct). The launch read refreshes from Flex (at most every 15 minutes) and reads
  // the job folders on Drive (once a minute while a job waits for its files), so a file a designer saves shows by
  // itself: no Check now (Josh, 24 Nov: "could we have this live checking?").
  const anySent = !!s?.jobs.some((j) => j.flex.task_id)
  const lkey = ['campaign-launch', tenantId, campaignId]
  const lq = useQuery({
    queryKey: lkey,
    queryFn: () => api.fetchLaunch(sessionId!, tenantId!, campaignId),
    enabled: !!sessionId && !!tenantId && approved && anySent,
    refetchInterval: (query) =>
      (query.state.data?.jobs ?? []).some((j) => j.state === 'in_studio' || (j.state === 'ready' && j.no_file)) && s?.drive?.root_url
        ? 60 * 1000
        : 2 * 60 * 1000,
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
  const toggleRow = (id: string) =>
    setOpenRows((o) => {
      const n = new Set(o)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

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
  // 25 Nov: Cherry Time had 100+ jobs closed in ClickUp, each marked live by hand. Each goes out on its launch date
  // when that has passed, else today (the row's own default); one already live is skipped.
  const markAllLive = (assetIds: string[]) => {
    if (!window.confirm(`Mark ${assetIds.length} jobs live? Each counts from its launch date (today if that date hasn't come yet), and Mia starts tracking their results. Only do this if they are all out.`)) return
    void act('mark-all', () => api.markAllLive(sessionId!, tenantId!, campaignId, assetIds), (out) => {
      const r = out as { marked: number; skipped?: number; message?: string }
      const rest = r.skipped ? ` ${r.skipped} were already live or not waiting, so left as they were.` : ''
      setDone((r.message ?? `Marked ${r.marked} job${r.marked === 1 ? '' : 's'} live.`) + rest)
      void reloadLaunch()
    })
  }

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
  const placed = s.jobs.filter((j) => j.flex.task_id || outside(j))
  const unconfirmed = toSend.filter((j) => !j.credits_confirmed).length
  // the credits are confirmed by the send itself (one press, E31); Mia making the folders is said as her working
  const making = s.blockers.some((b) => DRIVE_MAKING.test(b)) || !!s.drive?.making
  const otherBlockers = s.blockers.filter((b) => !/^Confirm the credits/.test(b) && !DRIVE_MAKING.test(b))
  const inFlex = s.jobs.filter((j) => j.flex.task_id)
  const byState = (st: string) => (lq.data?.jobs ?? []).filter((j) => j.state === st)
  const back = byState('ready')
  const toLaunch = byState('taken_in')
  const studioCount = byState('in_studio').length
  const backCount = inFlex.length - studioCount
  const senderPick = s.you ? null : (
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
  const credits = toSend.reduce((n, j) => n + (j.credits ?? 0), 0)
  const fit = s.credit_fit
    .map((f) => `${f.sprint}: ${num(f.planned)}${f.free == null ? '' : ` of ${num(f.free)} free`}`)
    .join(' · ')
  const over = s.credit_fit.some((f) => f.over) || (s.team?.fit.over?.length ?? 0) > 0
  const send = () =>
    act(
      'send',
      async () => {
        if (unconfirmed) await api.editStudio(...ids, [], true) // the credits on screen are what the PM sends
        return api.sendToFlex(...ids, sender)
      },
      (out) => setDone(sentMessage(out as { sent: number; brief_cut?: Record<string, string[]> })),
    )

  const items: TurnItem[] = []
  otherBlockers.forEach((b, k) =>
    items.push({
      key: `b${k}`,
      title: b,
      // no Shared Drive: Settings opens in a new tab, so the campaign stays where it is; the item clears once it's set
      // (Josh, 24 Nov, E17)
      actions: /Shared Drive first/.test(b) ? (
        <a href="/settings/workspace" target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center rounded-lg bg-brand-solid px-3 py-1.5 paragraph-sm text-primary-onbrand">
          Add it in Settings
        </a>
      ) : /Drive folders \(/.test(b) && s.drive?.error ? (
        <PrimaryAction loading={busy === 'drive-retry'} onClick={() => act('drive-retry', () => api.retryDriveFolders(...ids))}>
          Try again
        </PrimaryAction>
      ) : (
        <AskMia label="Before sending" detail={b} />
      ),
    }),
  )
  if (toSend.length && making) {
    // Mia is working: the PM can't send yet, and is told so plainly (Josh, 24 Nov: "block users or let them know
    // explicitly they can't go on yet")
    items.push({
      key: 'making',
      working: true,
      title: 'Mia is making the Drive folders',
      detail: "Under a minute. You can send the jobs to Flex once they're made.",
      actions: <Working label="Making…" />,
    })
  } else if (toSend.length) {
    items.push({
      key: 'send',
      title: `Send ${toSend.length} job${toSend.length === 1 ? '' : 's'} to Flex`,
      // Flex not answering is said on the item, not only inside the account picker (review 2 Nov)
      detail: s.flex_down
        ? 'Flex isn’t answering right now, so nothing can be sent. Try again in a few minutes.'
        : `${num(credits)} credits${fit ? ` (${fit})` : ''}. Change a job's credits below first if one is wrong.`,
      actions: (
        <>
          {senderPick}
          <PrimaryAction loading={busy === 'send'} disabled={!!otherBlockers.length || !sender || !!s.flex_down} onClick={() => void send()}>
            Send to Flex
          </PrimaryAction>
        </>
      ),
      more: over ? (
        <p className="paragraph-xs text-utility-warning-700">
          This is more than the client's credits or the pod's free time in a sprint. The studio lead can carry credits
          over or add some; the numbers are under More.
        </p>
      ) : undefined,
      openByDefault: over,
    })
  } else if (!s.sent && unsent.length) {
    items.push({
      key: 'pick',
      title: 'Tick the jobs to send',
      detail: 'In the list below.',
      actions: (
        <Button size="md" onClick={() => setAll(unsent, true)}>
          Tick them all
        </Button>
      ),
    })
  }
  if (s.sent && unsent.length && !toSend.length) {
    items.push({
      key: 'rest',
      title: `${unsent.length} job${unsent.length === 1 ? '' : 's'} not sent yet`,
      detail: 'Tick the ones to send in the list below when they are ready for the studio.',
      actions: (
        <Button size="md" onClick={() => setAll(unsent, true)}>
          Tick them all
        </Button>
      ),
    })
  }
  if (back.length) {
    const noFile = back.filter((j) => j.no_file)
    const withFile = back.filter((j) => !j.no_file)
    items.push({
      key: 'check-back',
      title: withFile.length
        ? `Check ${withFile.length} job${withFile.length === 1 ? '' : 's'} back from the studio`
        : `${noFile.length} job${noFile.length === 1 ? '' : 's'} done in Flex, waiting for files`,
      // on a Shared Drive the files go in the job's _Delivery folder and Mia picks them up by herself (E33)
      detail: withFile.length
        ? 'Look at the artwork and the page people land on, then use it.'
        : s.drive?.root_url
          ? "The designer saves them in the job's _Delivery folder on Drive. Mia picks them up by herself."
          : "Paste each one's file link in its row below.",
      actions: withFile.length ? (
        <PrimaryAction onClick={() => openAndGo(withFile.map((j) => j.asset_id))}>Check {withFile.length === 1 ? 'it' : 'them'}</PrimaryAction>
      ) : s.drive?.root_url ? undefined : (
        <PrimaryAction onClick={() => openAndGo(noFile.map((j) => j.asset_id))}>Add the links</PrimaryAction>
      ),
    })
  }
  if (toLaunch.length) {
    items.push({
      key: 'launch',
      title: `Launch ${toLaunch.length} job${toLaunch.length === 1 ? '' : 's'}`,
      detail: 'Mia checks each ad first; push it up paused, schedule the post, or mark it launched if you set it up yourself.',
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
      detail: 'Once each is out (sent from Brevo, posted, running), mark it live so Mia tracks its results. Mark all live does them at once, each on its launch date.',
      actions: (
        <>
          {closedInClickUp.length > 1 ? (
            <PrimaryAction loading={busy === 'mark-all'} onClick={() => void markAllLive(closedInClickUp.map((j) => j.asset_id))}>
              Mark all {closedInClickUp.length} live
            </PrimaryAction>
          ) : null}
          <Button size="md" onClick={() => openAndGo(closedInClickUp.map((j) => j.asset_id))}>
            {closedInClickUp.length === 1 ? 'Mark it live' : 'One by one'}
          </Button>
        </>
      ),
    })
  }
  const loose = s.drive?.unplaced_total ?? s.drive?.unplaced.length ?? 0
  if (loose && s.drive) {
    items.push({
      key: 'unplaced',
      title: `${loose} file${loose === 1 ? '' : 's'} on Drive Mia can't match to a job`,
      detail: "Put the job's ID in the file's name, or move it into its job's folder. Mia picks it up by herself.",
      more: (
        <ul className="list-disc pl-4 paragraph-xs text-secondary">
          {s.drive.unplaced.map((f) => (
            <li key={f.id} className="[overflow-wrap:anywhere]">{f.name}</li>
          ))}
          {loose > s.drive.unplaced.length ? <li>and {loose - s.drive.unplaced.length} more</li> : null}
        </ul>
      ),
      actions: s.drive.root_url ? (
        <a href={s.drive.root_url} target="_blank" rel="noreferrer"
           className="inline-flex items-center rounded-lg border border-secondary px-3 py-1.5 paragraph-sm text-primary">
          Open Drive ↗
        </a>
      ) : undefined,
    })
  }
  const newIdeas = (s.ideas?.items ?? []).filter((i) => i.status === 'new')
  if (newIdeas.length) {
    items.push({
      key: 'ideas',
      title: `${newIdeas.length} idea${newIdeas.length === 1 ? '' : 's'} from the studio`,
      detail: 'Ask Mia to make one a job, or set it aside. Nothing changes until you apply her card.',
      actions: (
        <Button size="md" onClick={() => document.getElementById('studio-ideas')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
          See {newIdeas.length === 1 ? 'it' : 'them'}
        </Button>
      ),
    })
  }
  if (s.sent) {
    // one status line; Mia follows Flex and Drive by herself (E33: "14 jobs with the studio · 0 back")
    items.push({
      key: 'follow',
      title: `${inFlex.length} job${inFlex.length === 1 ? '' : 's'} with the studio · ${backCount} back`,
      detail: studioCount ? 'Mia follows them in Flex and Drive by herself. Nothing needs you until one comes back.' : undefined,
      done: !studioCount,
    })
  }
  return (
    <div className="flex flex-col gap-4">
      {error ? <Card warn className="paragraph-sm text-primary">{error}</Card> : null}
      {done ? <Card className="paragraph-sm text-primary">{done}</Card> : null}
      <YourTurn items={items} />

      {unsent.length ? (
        <Card className="overflow-x-auto !p-0">
          <div className="flex flex-wrap items-center gap-3 px-4 pt-3">
            <p className="subheading-sm text-primary">Not sent yet ({unsent.length})</p>
            <button type="button" className="paragraph-xs text-tertiary hover:text-primary" onClick={() => setAll(unsent, true)}>
              Tick all
            </button>
            <button type="button" className="paragraph-xs text-tertiary hover:text-primary" onClick={() => setAll(unsent, false)}>
              Untick all
            </button>
          </div>
          <table className="w-full min-w-[680px] table-fixed paragraph-sm">
            <colgroup>
              <col className="w-12" />
              <col />
              <col className="w-44" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr className="text-left label-xs text-tertiary">
                <th className="py-2 pl-4 pr-2">Send</th>
                <th className="py-2 pr-2">Job</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2 text-right">Credits</th>
                <th className="py-2 pr-2">Due</th>
                <th className="py-2 pr-4">Mia suggests</th>
              </tr>
            </thead>
            <tbody>
              {unsent.map((j) => (
                <UnsentRow key={j.asset_id} j={j} disabled={busy === 'send'} onChange={(change) => setJobs([j], change)} />
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}

      {placed.length ? (
        <Card className="overflow-x-auto !p-0">
          <p className="subheading-sm text-primary px-4 pt-3">With the studio ({placed.length})</p>
          <table className="w-full min-w-[600px] table-fixed paragraph-sm">
            <colgroup>
              <col />
              <col className="w-28" />
              <col className="w-48" />
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr className="text-left label-xs text-tertiary">
                <th className="py-2 pl-4 pr-2">Job</th>
                <th className="py-2 pr-2">Due</th>
                <th className="py-2 pr-2">Where it is</th>
                <th className="py-2 pr-4" aria-label="Action" />
              </tr>
            </thead>
            <tbody>
              {placed.map((j) => {
                const lj = launchJobs.get(j.asset_id)
                const open = openRows.has(j.asset_id)
                return (
                  <Fragment key={j.asset_id}>
                    <PlacedRow j={j} launch={lj} open={open} onToggle={() => toggleRow(j.asset_id)} />
                    {open ? (
                      <tr className="bg-secondary">
                        <td colSpan={4} className="px-4 py-3">
                          <JobDetail
                            j={j}
                            launch={lj}
                            campaignId={campaignId}
                            onDone={reloadLaunch}
                            busy={busy}
                            onWithdraw={(r) => act(`withdraw-${r.mia_request_id}`, () => api.withdrawChangeRequest(...ids, r.mia_request_id))}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </Card>
      ) : null}

      {s.ideas?.items.length || s.ideas?.set_aside ? (
        <Ideas
          ideas={s.ideas.items}
          aside={s.ideas.set_aside_items ?? []}
          busy={busy}
          onDecide={(i, status) => act(`idea-${i.id}`, () => api.decideIdea(...ids, i.id, status))}
        />
      ) : null}

      {/* Everything else, folded (E33): the Drive folders, Flex's copy of the plan, job numbers, the campaign tag, adding
          a job, the credits per sprint, the team, and reading Flex now */}
      <details className="group rounded-xl border border-secondary bg-primary px-4 py-3">
        <summary className="cursor-pointer list-none select-none paragraph-sm text-secondary hover:text-primary [&::-webkit-details-marker]:hidden">
          <span className="inline-block transition-transform group-open:rotate-90" aria-hidden="true">›</span> More
          <span className="paragraph-xs text-tertiary"> · Drive, job numbers, the campaign tag, adding a job, the team</span>
        </summary>
        <div className="mt-3 flex flex-col gap-2.5 paragraph-sm text-secondary">
          {s.drive ? <DriveLine d={s.drive} /> : null}
          {s.outline?.version ? (
            <p>{s.outline.current ? 'Flex has the whole plan, at the top of the campaign there.' : s.outline.error ?? 'The plan’s latest changes go to Flex shortly.'}</p>
          ) : null}
          {s?.job_code?.code ? (
            // Mia's job numbers (step 7, 16 Nov): code + number on every job, sent to Flex
            <p className="flex flex-wrap items-center gap-x-2">
              <span>
                Job numbers <span className="text-primary tabular-nums">{s.job_code.code}-01, {s.job_code.code}-02…</span>
                {s.job_code.locked ? ' (fixed)' : ''}
              </span>
              {!s.job_code.locked ? (
                <Button size="sm" disabled={busy === 'code'} onClick={() => {
                  const next = window.prompt('The campaign\'s job code: 2 to 6 letters or digits, starting with a letter', s.job_code?.code ?? '')
                  if (!next || !sessionId || !tenantId) return
                  setBusy('code')
                  setError(null)
                  api.setJobCode(sessionId, tenantId, campaignId, next)
                    .then(() => qc.invalidateQueries({ queryKey: key }))
                    .catch((e) => setError(e instanceof Error ? e.message : 'Could not change the code'))
                    .finally(() => setBusy(null))
                }}>
                  Change
                </Button>
              ) : null}
            </p>
          ) : null}
          {lq.data?.tag ? (
            // The one manual step a PM can get wrong: an ad set up by hand must carry the tag for its results to come back
            <div className="flex flex-col gap-1">
              <p className="flex flex-wrap items-center gap-2">
                Campaign tag <code className="rounded bg-secondary px-1 text-primary">{lq.data.tag}</code>
                <CopyButton value={lq.data.tag} />
              </p>
              <p className="paragraph-xs text-tertiary max-w-[60ch]">
                Mia adds it to every link herself. For ads you set up by hand, like LinkedIn, start the ad campaign’s
                name with it, so its results come back here.
              </p>
            </div>
          ) : null}
          {/* Jobs are added on this page through Mia (live 5 Nov: "I am not sure how to add new tasks") */}
          <p className="flex flex-wrap items-center gap-2">
            Need more jobs?
            <Button size="sm" onClick={() => askMia({ label: 'Add a job', draft: 'Add a job: ' })}>
              Add a job
            </Button>
            <Button size="sm" onClick={() => askMia({ label: 'Add jobs from a file', draft: 'Add the jobs in this file to the campaign. ', pickFile: true })}>
              From a file or ClickUp links
            </Button>
          </p>
          {s.credit_fit.length ? (
            <p>
              Credits:{' '}
              {s.credit_fit.map((f, k) => (
                <span key={f.sprint}>
                  {k ? ' · ' : ''}
                  {f.sprint} {num(f.planned)}
                  {f.free == null ? '' : ` of ${num(f.free)} free`}
                  {f.over ? <span className="text-utility-warning-700"> (over)</span> : null}
                </span>
              ))}
            </p>
          ) : null}
          {/* its own line: shown even when no client-credit row is (audit 24 Nov: weekend due dates hid it) */}
          {s.team?.fit.sprints.length || s.team?.fit.outside_jobs ? <TeamRoom team={s.team} /> : null}
          {s.sent ? (
            <p className="flex flex-wrap items-center gap-2">
              Mia reads Flex every 15 minutes and the Drive folders every few minutes.
              <Button size="sm" loading={busy === 'refresh' || lq.isFetching} onClick={() => act('refresh', () => api.refreshFromFlex(...ids), () => void reloadLaunch())}>
                Read Flex now
              </Button>
            </p>
          ) : null}
        </div>
      </details>
    </div>
  )
}

// "Making…" in words, so it reads as working even with animations off (local test 27 Oct)
function Working({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-1.5 paragraph-sm text-tertiary">
      <span aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      {label}
    </span>
  )
}

// A job not sent yet: one line, nothing wraps (E34). Its kind of work and credits are what the PM checks before sending.
function UnsentRow({ j, disabled, onChange }: {
  j: StudioJob
  disabled: boolean
  onChange: (c: { credits?: number | null; include?: boolean }) => void
}) {
  const [c, setC] = useState(j.credits == null ? '' : String(j.credits))
  const typing = useRef(false) // a refresh never overwrites the box while the PM is typing (review 26 Oct)
  useEffect(() => {
    if (!typing.current) setC(j.credits == null ? '' : String(j.credits))
  }, [j.credits])
  const missing = j.include && j.credits == null
  const type = `${j.ledger_type ?? '—'}${j.ledger_tier ? ` · ${j.ledger_tier}` : ''}`
  return (
    <tr id={`row-${j.asset_id}`} className="border-t border-secondary scroll-mt-24">
      <td className="py-2 pl-4 pr-2">
        <input
          type="checkbox"
          className="size-4 accent-[var(--color-background-brand-solid)] cursor-pointer disabled:cursor-default"
          aria-label={`Send ${j.name}`}
          checked={j.include}
          disabled={disabled}
          onChange={(e) => onChange({ include: e.target.checked })}
        />
      </td>
      <td className="py-2 pr-2">
        <span className="block truncate text-primary" title={`${j.name} · ${phaseTag(j.phase)}${channelLabel(j.channel)}${j.setup_work ? ' · setup work' : ''}`}>
          {j.name}
        </span>
      </td>
      <td className="py-2 pr-2 text-secondary">
        <span className="block truncate" title={type}>{type}</span>
      </td>
      <td className="py-2 pr-2 text-right">
        <input
          aria-label={`${j.name} credits`}
          className={`w-16 rounded-md bg-primary px-2 py-1 text-right paragraph-sm text-primary ${missing ? 'border-2 border-utility-warning-300' : 'border border-secondary'}`}
          inputMode="decimal"
          placeholder="?"
          title={missing ? 'No rate in the rate card: set the credits' : undefined}
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
      </td>
      <td className="py-2 pr-2 whitespace-nowrap text-secondary" title={j.sprint ? `Sprint: ${j.sprint}` : undefined}>
        {day(j.due_date)}
      </td>
      <td className="py-2 pr-4 text-secondary">
        {j.maker ? (
          <span
            className="block truncate"
            title={`Mia's suggestion from Flex's team plan: ${j.maker.has_skill ? `has ${j.maker.skill.replace('_', ' ')}` : `no one in the pod has ${j.maker.skill.replace('_', ' ')}`}, ${num(j.maker.free_after)} credits free after this job${j.maker.over ? ': the person with the most room for this kind of work, and they would be over' : ''}. The studio assigns in Flex.`}
          >
            {j.maker.name.split(' ')[0]}
            {j.maker.over ? <span className="text-utility-warning-700"> (full)</span> : null}
          </span>
        ) : (
          <span className="text-tertiary">—</span>
        )}
      </td>
    </tr>
  )
}

// Where a sent (or outside) job is, in plain words, and the one thing to do with it, if any.
function placedStatus(j: StudioJob, launch?: LaunchJob): { label: string; tone: string; action?: string } {
  const inFlex = !!j.flex.task_id
  if (launch?.state === 'launched') {
    const how = launch.launch?.how
    return { label: how === 'scheduled' ? 'Scheduled' : how === 'manual' ? 'Launched' : how === 'clickup' ? 'Live (ClickUp)' : 'Pushed, paused', tone: 'text-utility-success-700' }
  }
  if (launch?.state === 'cancelled') return { label: 'Cancelled', tone: 'text-tertiary' }
  if (launch?.state === 'taken_in') return { label: 'Ready to launch', tone: 'text-utility-blue-700', action: 'Launch it' }
  if (launch?.state === 'ready') {
    return launch.no_file
      ? { label: 'Done, waiting for files', tone: 'text-utility-warning-700' }
      : { label: 'Back: check it', tone: 'text-utility-warning-700', action: 'Check it' }
  }
  if (launch?.state === 'elsewhere') return { label: j.clickup?.clickup_status ? `In ClickUp: ${j.clickup.clickup_status}` : 'Made outside Flex', tone: 'text-secondary', action: 'Mark live' }
  if (inFlex) return { label: `At the studio · ${j.flex.stage_label ?? j.flex.status ?? 'Open'}`, tone: 'text-secondary' }
  if (j.clickup) return { label: j.clickup.clickup_status ? `In ClickUp: ${j.clickup.clickup_status}` : 'In ClickUp', tone: 'text-secondary' }
  return { label: 'Made outside Flex', tone: 'text-secondary' }
}

// A sent job: one line (name, due, where it is, one real button when there's something to do). Everything else opens
// under it (E34: rows wrapped over four or five lines of codes, tags, sizes and tiny links).
function PlacedRow({ j, launch, open, onToggle }: { j: StudioJob; launch?: LaunchJob; open: boolean; onToggle: () => void }) {
  const st = placedStatus(j, launch)
  const warn = j.clickup?.state === 'archived' || j.clickup?.state === 'deleted' || !!j.clickup_not_linked
    || (j.change_requests ?? []).some((r) => r.status === 'declined' || r.status === 'refused')
  return (
    <tr id={`row-${j.asset_id}`} className="border-t border-secondary scroll-mt-24">
      <td className="py-2 pl-4 pr-2">
        <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full min-w-0 items-center gap-1.5 text-left">
          <span aria-hidden="true" className={`text-tertiary transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
          <span className="truncate text-primary" title={j.name}>{j.name}</span>
          {warn ? <span className="text-utility-warning-700" title="Something on this job needs a look: open it">●</span> : null}
        </button>
      </td>
      <td className="py-2 pr-2 whitespace-nowrap text-secondary">{day(j.due_date)}</td>
      <td className={`py-2 pr-2 ${st.tone}`}>
        <span className="block truncate" title={st.label}>{st.label}</span>
      </td>
      <td className="py-2 pr-4 text-right">
        {st.action ? (
          <Button size="sm" variant={open ? 'secondary' : 'primary'} onClick={onToggle}>
            {open ? 'Close' : st.action}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={onToggle}>
            {open ? 'Close' : 'Details'}
          </Button>
        )}
      </td>
    </tr>
  )
}

// What opens under a sent job: its launch work first when it has some, then the reference (codes, names and link tags,
// its Drive folder, changes asked of the studio, its task in Flex or ClickUp).
function JobDetail({ j, launch, campaignId, onDone, busy, onWithdraw }: {
  j: StudioJob
  launch?: LaunchJob
  campaignId: string
  onDone: () => Promise<void>
  busy: string | null
  onWithdraw: (r: StudioChangeRequest) => void
}) {
  const inFlex = !!j.flex.task_id
  return (
    <div className="flex flex-col gap-3">
      {launch && launch.state !== 'in_studio' ? <JobCard j={launch} campaignId={campaignId} onDone={onDone} bare /> : null}
      <div className="flex flex-col gap-1 paragraph-xs text-tertiary">
        <p>
          {phaseTag(j.phase)}{channelLabel(j.channel)}
          {j.job_no ? <span className="tabular-nums"> · {j.job_no}</span> : null}
          <JobId id={j.job_id} />
          {j.setup_work ? ' · setup work (its credits are still to be agreed)' : ''}
        </p>
        {inFlex && j.flex.review_rounds && (j.flex.review_rounds.internal || j.flex.review_rounds.client) ? (
          <p>Review rounds: internal {j.flex.review_rounds.internal}, client {j.flex.review_rounds.client}</p>
        ) : null}
        <DeliveryLine dv={j.delivery} />
        {inFlex ? <Requests rs={j.change_requests ?? []} onWithdraw={onWithdraw} busy={busy} /> : null}
        {inFlex && j.clickup_not_linked ? (
          <p className="text-utility-warning-700" title={j.clickup_not_linked}>Not linked to its ClickUp task yet: Mia tries again on the next Flex read.</p>
        ) : null}
        {j.clickup?.done_at && launch?.state === 'elsewhere' ? <p className="text-utility-warning-700">Closed in ClickUp: mark it live once it's out.</p> : null}
        {j.clickup?.state === 'archived' || j.clickup?.state === 'deleted' ? (
          <p className="text-utility-warning-700">{j.clickup.state === 'archived' ? 'Its task was archived in ClickUp.' : 'Its task was deleted in ClickUp.'}</p>
        ) : null}
        {!inFlex && j.kept_out && !j.clickup ? <p>{j.kept_out}</p> : null}
        <JobNames names={j.names} />
        <p className="flex flex-wrap gap-2 pt-1">
          {j.flex.url ? (
            <a className="inline-flex items-center rounded-md border border-secondary px-2 py-1 text-secondary hover:bg-primary" href={j.flex.url} target="_blank" rel="noreferrer">
              Open in Flex ↗
            </a>
          ) : null}
          {j.clickup?.url && j.clickup.state !== 'deleted' ? (
            <a className="inline-flex items-center rounded-md border border-secondary px-2 py-1 text-secondary hover:bg-primary" href={j.clickup.url} target="_blank" rel="noreferrer">
              Open in ClickUp ↗
            </a>
          ) : null}
          {j.delivery?.folder_url ? (
            <a className="inline-flex items-center rounded-md border border-secondary px-2 py-1 text-secondary hover:bg-primary" href={j.delivery.folder_url} target="_blank" rel="noreferrer">
              Its Drive folder ↗
            </a>
          ) : null}
        </p>
      </div>
    </div>
  )
}

// The campaign's Drive folders on the client's Shared Drive (naming step 4, 20 Nov), under More: a link, nothing to press.
// Mia reads each job's _Delivery by herself (the page once a minute, the server every few minutes, and at once when
// Google says a file landed).
function DriveLine({ d }: { d: StudioDrive }) {
  if (!d.shared_drive) {
    return (
      <p>
        Drive folders: add the client’s Shared Drive in{' '}
        <a href="/settings/workspace" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
          Settings
        </a>{' '}
        and Mia makes a folder for each job.
      </p>
    )
  }
  if (d.error || !d.root_url) return null // the error is in Your turn with Try again; making is said there too
  return (
    <p className="flex flex-wrap items-center gap-2">
      Drive folders{d.test_folder ? ` (test, in ${d.test_folder})` : ''}
      <a href={d.root_url} target="_blank" rel="noreferrer"
         className="inline-flex items-center rounded-md border border-secondary px-2 py-1 paragraph-xs text-secondary hover:bg-secondary">
        Open ↗
      </a>
    </p>
  )
}

// A job's files on Drive in plain words: "Files: 4:5 2 of 3, 1:1 0 of 1", or what it's waiting for.
function DeliveryLine({ dv }: { dv?: StudioDelivery | null }) {
  if (!dv) return null
  const sizes = Object.entries(dv.need)
  const ratio = (r: string) => r.replace('x', ':')
  if (dv.taken_at) return <p className="text-utility-success-700">Files in from Drive, taken in.</p>
  if (dv.waiting_for) return <p className="text-utility-warning-700">Files: {dv.waiting_for}</p>
  if (sizes.length)
    return <p>Files: {sizes.map(([r, need]) => `${ratio(r)} ${Math.min(dv.have[r] ?? 0, need)} of ${need}`).join(', ')}</p>
  return <p>{dv.files ? `Files: ${dv.files} in` : 'Files: none yet'}</p>
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

// What the send says: how many went, and any brief Mia had to shorten to fit Flex's limits (rare; never silent).
function sentMessage(out: { sent: number; brief_cut?: Record<string, string[]> }): string {
  const cut = Object.entries(out.brief_cut ?? {})
  const head = `Sent: ${out.sent} new task(s) in Flex.`
  if (!cut.length) return head
  return `${head} Too long for Flex, so shortened: ${cut.map(([job, what]) => `${job} (${what.join('; ')})`).join(' · ')}.`
}

// Who is free in the client's pod for this send (Flex's team plan, 24 Nov): one line per sprint, the people on hover.
// Beside the credits above: those are what the client bought, this is who has time to make it.
function TeamRoom({ team }: { team: StudioTeam }) {
  const over = new Set(team.fit.over ?? [])
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <p className="subheading-sm text-primary">Studio team{team.pod ? ` (${team.pod})` : ''}</p>
      {team.fit.sprints.map((f) => {
        const sp = team.sprints.find((x) => x.label === f.sprint)
        const who = sp?.people.map((p) => `${p.name.split(' ')[0]} ${num(p.free)}`).join(', ')
        return (
          <span key={f.sprint} className="paragraph-sm text-secondary" title={who ? `Free credits: ${who}` : undefined}>
            {f.sprint}: {num(f.planned)} planned, {num(f.pod_free)} free in the pod
            {over.has(f.sprint) ? (
              <>
                {' '}
                <NeedsYou>more than the pod has free</NeedsYou>
              </>
            ) : null}
          </span>
        )
      })}
      {team.fit.outside_jobs ? (
        <span className="paragraph-xs text-tertiary">
          {num(team.fit.outside_credits ?? 0)} credits ({team.fit.outside_jobs} job{team.fit.outside_jobs === 1 ? '' : 's'}) due
          outside the sprints Flex described, so not counted here
        </span>
      ) : null}
    </div>
  )
}
