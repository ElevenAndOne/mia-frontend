import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../../components/button'
import { useSession } from '../../../contexts/session-context'
import {
  fetchGooglePushPreview,
  fetchMetaPushPreview,
  pushChannelActionToGoogle,
  pushChannelActionToMeta,
} from '../../campaigns/services/campaign-api'
import type { PushCheck } from '../../campaigns/types'
import * as api from '../api'
import type { LaunchJob } from '../types'
import { Card, NeedsYou, channelLabel, day } from './parts'

// The Launch tab (plan §8.2): a job is ready when Flex says so and its final artwork is linked. The PM takes it in
// (artwork + the link people land on), then launches it the way its channel allows: Meta and Google ads go up
// PAUSED through Mia's existing push (checked first), Facebook/Instagram posts are scheduled, and anything Mia
// can't publish yet is set up where it runs and marked launched here. The first launch makes the campaign live.

const SECTIONS: { state: LaunchJob['state']; title: string; hint: string }[] = [
  { state: 'taken_in', title: 'Ready to launch', hint: 'Artwork and link are in. Launch each one.' },
  { state: 'ready', title: 'Back from the studio', hint: 'Check the artwork and add the link people land on.' },
  { state: 'in_studio', title: 'Still in the studio', hint: 'These appear above when Flex marks them ready to launch.' },
  { state: 'launched', title: 'Launched', hint: '' },
]

export function LaunchTab({ campaignId, approved, onChanged }: { campaignId: string; approved: boolean; onChanged?: () => void }) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const qc = useQueryClient()
  const key = ['campaign-launch', tenantId, campaignId]
  const q = useQuery({
    queryKey: key,
    queryFn: () => api.fetchLaunch(sessionId!, tenantId!, campaignId),
    enabled: !!sessionId && !!tenantId && approved,
    refetchInterval: 15 * 60 * 1000, // Flex is read every 15 minutes while the tab is open
  })
  const reload = async () => {
    await qc.invalidateQueries({ queryKey: key })
    onChanged?.()
  }
  if (!approved) return <Card className="paragraph-sm text-secondary">Approve the plan and send the jobs to the studio first.</Card>
  if (q.isPending) return <p className="paragraph-sm text-tertiary">Reading Flex…</p>
  if (!q.data) return <p className="paragraph-sm text-error">{(q.error as Error)?.message ?? 'Could not load the launch.'}</p>
  const s = q.data
  if (!s.jobs.length) return <Card className="paragraph-sm text-secondary">No jobs have gone to the studio yet. Send them from the Studio tab.</Card>
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="paragraph-sm text-primary">
          {s.live ? 'The campaign is live.' : 'Not live yet: the first job you launch makes it live.'}{' '}
          <span className="text-secondary">
            {s.counts.taken_in ?? 0} ready to launch · {s.counts.ready ?? 0} back from the studio · {s.counts.in_studio ?? 0} in the
            studio · {s.counts.launched ?? 0} launched
          </span>
        </p>
        <Button size="sm" onClick={() => void reload()} loading={q.isFetching}>
          Check Flex now
        </Button>
      </Card>
      {SECTIONS.map((sec) => {
        const jobs = s.jobs.filter((j) => j.state === sec.state)
        if (!jobs.length) return null
        return (
          <section key={sec.state} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="subheading-md text-primary">
                {sec.title} ({jobs.length})
              </h2>
              {sec.hint ? <p className="paragraph-xs text-tertiary">{sec.hint}</p> : null}
            </div>
            <ul className="flex flex-col gap-2">
              {jobs.map((j) => (
                <JobCard key={j.asset_id} j={j} campaignId={campaignId} onDone={reload} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function JobCard({ j, campaignId, onDone }: { j: LaunchJob; campaignId: string; onDone: () => Promise<void> }) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id ?? ''
  const [open, setOpen] = useState(j.state === 'ready' || j.state === 'taken_in')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [link, setLink] = useState(j.final_url ?? '')
  const [creative, setCreative] = useState('')
  const [when, setWhen] = useState(() => (j.launch_date ? `${j.launch_date}T09:00` : ''))
  const [manualLink, setManualLink] = useState('')
  const [checks, setChecks] = useState<PushCheck[] | null>(null)

  const run = async (label: string, fn: () => Promise<unknown>, after?: (out: unknown) => void) => {
    setBusy(label)
    setError(null)
    try {
      const out = await fn()
      after?.(out)
      await onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }
  const takeIn = () =>
    run('take', () => api.launchAction(sessionId!, tenantId, campaignId, 'take-in', { asset_id: j.asset_id, final_url: link, creative: creative || null }))
  const check = () =>
    run('check', async () => {
      const p = j.route === 'meta'
        ? await fetchMetaPushPreview(sessionId!, tenantId, campaignId, j.action_id)
        : await fetchGooglePushPreview(sessionId!, tenantId, campaignId, j.action_id)
      setChecks(p.errors)
    })
  const push = () => {
    const where = j.route === 'meta' ? 'Meta' : 'Google Ads'
    if (!window.confirm(`Push every ready ad on this ${channelLabel(j.channel)} channel to ${where} as PAUSED? Nothing runs until someone switches it on in ${where}.`)) return
    void run('push', async () => {
      const r = j.route === 'meta'
        ? await pushChannelActionToMeta(sessionId!, tenantId, campaignId, j.action_id)
        : await pushChannelActionToGoogle(sessionId!, tenantId, campaignId, j.action_id)
      setNote(r ? `Pushed to ${where}, paused. Switch it on there when you're ready.` : null)
    })
  }
  const schedule = () =>
    run('schedule', () =>
      api.launchAction(sessionId!, tenantId, campaignId, 'schedule', { asset_id: j.asset_id, when: new Date(when).toISOString() }),
    )
  const mark = () => run('mark', () => api.launchAction(sessionId!, tenantId, campaignId, 'mark', { asset_id: j.asset_id, link: manualLink || null }))
  const blocking = (checks ?? []).filter((c) => c.severity === 'block')

  return (
    <li className="rounded-xl border border-secondary bg-primary">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left hover:bg-secondary">
        <span className="min-w-0 flex-1 paragraph-sm text-primary">{j.name}</span>
        <span className="paragraph-xs text-tertiary">
          {j.phase} · {channelLabel(j.channel)}
        </span>
        <span className="paragraph-xs text-tertiary whitespace-nowrap">goes live {day(j.launch_date)}</span>
        {j.state === 'in_studio' ? <span className="paragraph-xs text-secondary">In Flex: {j.stage_label ?? 'Open'}</span> : null}
        {j.state === 'launched' ? (
          <span className="label-xs text-utility-success-700 whitespace-nowrap">
            ✓ {j.launch.how === 'scheduled' ? 'scheduled' : j.launch.how === 'manual' ? 'launched' : 'pushed, paused'}
          </span>
        ) : null}
        <span className="paragraph-xs text-tertiary">{open ? '▴' : '▾'}</span>
      </button>
      {open ? (
        <div className="flex flex-col gap-3 border-t border-secondary px-3 py-3">
          {j.artwork.length ? (
            <div className="flex flex-col gap-1">
              <p className="label-xs text-secondary">Artwork from the studio</p>
              <ul className="flex flex-wrap gap-2">
                {j.artwork.map((a) => (
                  <li key={a.url}>
                    <a href={a.url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center rounded-md border border-brand px-2 py-0.5 paragraph-xs text-brand-secondary hover:bg-brand-primary">
                      {a.title || a.kind} ({a.kind}) ↗
                    </a>
                  </li>
                ))}
              </ul>
              {j.figma_only ? (
                <NeedsYou>Only a Figma link: ad platforms need the exported file. Add a Drive link in Flex, or paste an image link below.</NeedsYou>
              ) : null}
            </div>
          ) : j.state !== 'in_studio' ? (
            <NeedsYou>No artwork linked in Flex yet.</NeedsYou>
          ) : null}
          {j.flex_url ? (
            <a href={j.flex_url} target="_blank" rel="noreferrer" className="self-start paragraph-xs text-tertiary underline">
              Open the job in Flex ↗
            </a>
          ) : null}

          {j.state === 'ready' ? (
            <div className="flex flex-col gap-2">
              {j.figma_only || !j.usable_artwork.length ? (
                <label className="flex flex-col gap-1 paragraph-xs text-tertiary">
                  Image or video link (direct, or a Drive file)
                  <input className="rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary" value={creative}
                    onChange={(e) => setCreative(e.target.value)} placeholder="https://drive.google.com/file/d/…" />
                </label>
              ) : null}
              {j.route === 'schedule' ? null : (
                <label className="flex flex-col gap-1 paragraph-xs text-tertiary">
                  The link people land on
                  <input className="rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary" value={link}
                    onChange={(e) => setLink(e.target.value)} placeholder="https://… (with its UTM tags)" />
                </label>
              )}
              <Button size="sm" variant="primary" className="self-start" loading={busy === 'take'} onClick={() => void takeIn()}>
                Use this artwork
              </Button>
            </div>
          ) : null}

          {j.state === 'taken_in' && (j.route === 'meta' || j.route === 'google') ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" loading={busy === 'check'} onClick={() => void check()}>
                  Check before pushing
                </Button>
                <Button size="sm" variant="primary" loading={busy === 'push'} disabled={!!blocking.length} onClick={push}>
                  Push to {j.route === 'meta' ? 'Meta' : 'Google'}, paused
                </Button>
              </div>
              {checks ? (
                blocking.length ? (
                  <ul className="paragraph-xs text-utility-warning-700 flex flex-col gap-0.5">
                    {blocking.map((c) => (
                      <li key={c.code}>⚠ {c.message}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="paragraph-xs text-utility-success-700">All checks pass. It goes up paused.</p>
                )
              ) : null}
            </div>
          ) : null}

          {j.state === 'taken_in' && j.route === 'schedule' ? (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 paragraph-xs text-tertiary">
                Post on
                <input type="datetime-local" className="rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary"
                  value={when} onChange={(e) => setWhen(e.target.value)} />
              </label>
              <Button size="sm" variant="primary" loading={busy === 'schedule'} disabled={!when} onClick={() => void schedule()}>
                Schedule on Facebook / Instagram
              </Button>
            </div>
          ) : null}

          {j.state === 'taken_in' && j.route === 'manual' ? (
            <div className="flex flex-col gap-2">
              <p className="paragraph-xs text-secondary">
                Mia can't publish to {j.manual_where} yet. Set it up there with this artwork and words, then mark it launched so
                the results can be tracked.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-0 flex-1 flex-col gap-1 paragraph-xs text-tertiary">
                  Its link there (optional)
                  <input className="rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary" value={manualLink}
                    onChange={(e) => setManualLink(e.target.value)} placeholder="https://…" />
                </label>
                <Button size="sm" variant="primary" loading={busy === 'mark'} onClick={() => void mark()}>
                  Mark as launched
                </Button>
              </div>
            </div>
          ) : null}

          {j.state === 'launched' && j.launch.link ? (
            <a href={j.launch.link} target="_blank" rel="noreferrer" className="self-start paragraph-xs underline text-primary">
              Where it runs ↗
            </a>
          ) : null}
          {note ? <p className="paragraph-xs text-utility-success-700">{note}</p> : null}
          {error ? <p className="paragraph-xs text-utility-warning-700">{error}</p> : null}
        </div>
      ) : null}
    </li>
  )
}
