import { Fragment, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/button'
import { useSession } from '../../../contexts/session-context'
import * as api from '../api'
import type { StudioJob, StudioState } from '../types'
import { Card, NeedsYou, NeedsYouBanner, channelLabel, day, num } from './parts'

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
  // Read Flex every 45 seconds while the tab is in view (and on coming back to it), so stage changes made in Flex
  // show here without pressing Refresh (live test 18 Oct).
  const anySent = !!s?.jobs.some((j) => j.flex.task_id)
  useEffect(() => {
    if (!approved || !anySent || !sessionId || !tenantId) return
    const tick = () => {
      if (document.visibilityState !== 'visible') return
      api
        .refreshFromFlex(sessionId, tenantId, campaignId)
        .then((out) => {
          if (out.updated) {
            qc.invalidateQueries({ queryKey: key })
            onChanged?.()
          }
        })
        .catch(() => undefined) // the Refresh button still shows errors
    }
    const t = window.setInterval(tick, 45 * 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approved, anySent, sessionId, tenantId, campaignId])

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
  return (
    <div className="flex flex-col gap-4">
      {error ? <Card warn className="paragraph-sm text-primary">{error}</Card> : null}
      {done ? <Card className="paragraph-sm text-primary">{done}</Card> : null}
      <NeedsYouBanner title="Before you send" items={s.blockers} />

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
                  {g.jobs.map((j) => (
                    <Row key={j.asset_id} j={j} disabled={busy === 'send'} onChange={(change) => setJobs([j], change)} />
                  ))}
                </Fragment>
              ) : null,
            )}
          </tbody>
        </table>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 paragraph-sm text-secondary">
          {s.sent ? `${s.sent} job(s) are in Flex. ` : ''}
          {toSend.length
            ? `${toSend.length} job(s) ready to go. Each becomes an Open task under the campaign in Flex, with its credits taken from the client's sprint and the full brief for the designer.`
            : 'Nothing new to send.'}
          {toSend.some((j) => !j.credits_confirmed) ? (
            <button
              type="button"
              className="ml-2 underline text-primary"
              disabled={!!busy}
              onClick={() => act('confirm', () => api.editStudio(...ids, [], true))}
            >
              Confirm all credits
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {s.sent ? (
            <Button size="sm" loading={busy === 'refresh'} onClick={() => act('refresh', () => api.refreshFromFlex(...ids))}>
              Refresh from Flex
            </Button>
          ) : null}
          {toSend.length ? (
            <>
              {s.you ? (
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
              )}
              <Button
                variant="primary"
                loading={busy === 'send'}
                disabled={!!s.blockers.length || !sender}
                onClick={() =>
                  act(
                    'send',
                    () => api.sendToFlex(...ids, sender),
                    (out) => setDone(`Sent: ${(out as { sent: number }).sent} new task(s) in Flex.`),
                  )
                }
              >
                Send {toSend.length} job{toSend.length === 1 ? '' : 's'} to Flex
              </Button>
            </>
          ) : null}
        </div>
      </Card>
    </div>
  )
}

function Row({ j, disabled, onChange }: { j: StudioJob; disabled: boolean; onChange: (c: { credits?: number | null; include?: boolean }) => void }) {
  const [c, setC] = useState(j.credits == null ? '' : String(j.credits))
  useEffect(() => setC(j.credits == null ? '' : String(j.credits)), [j.credits])
  const inFlex = !!j.flex.task_id
  const missing = j.include && !inFlex && j.credits == null
  return (
    <tr className="border-t border-secondary align-top">
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
            <StageChip label={j.flex.stage_label ?? j.flex.status ?? 'Open'} />
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
      </td>
    </tr>
  )
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
