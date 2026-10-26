import { useState } from 'react'
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
import { CopyButton } from './copy-button'
import type { LaunchJob } from '../types'
import { NeedsYou, channelLabel, day } from './parts'

// Launching a job (plan §8.2), shown under its row on the Studio page (Studio and Launch are one page since 19 Oct;
// the old Launch tab was removed as dead code, review 26 Oct). A job is ready when Flex says so and its final artwork
// is linked. The PM takes it in (artwork + the link people land on), then launches it the way its channel allows:
// Meta and Google ads go up PAUSED through Mia's existing push (checked first), Facebook/Instagram posts are
// scheduled, and anything Mia can't publish yet is set up where it runs and marked launched here.

// One job's launch work (artwork, landing page, push / schedule / mark). `bare`: just the body, for the drop-down
// under the job's row on the Studio page (Studio and Launch are one page since 19 Oct).
export function JobCard({ j, campaignId, onDone, bare = false }: { j: LaunchJob; campaignId: string; onDone: () => Promise<void>; bare?: boolean }) {
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
  const notOnPage = () => run('unsure', () => api.launchAction(sessionId!, tenantId, campaignId, 'not-on-page', { asset_id: j.asset_id }))
  const unsure = j.launch?.unsure ?? []
  const blocking = (checks ?? []).filter((c) => c.severity === 'block')

  const body = (
    <div className={`flex flex-col gap-3 ${bare ? '' : 'border-t border-secondary px-3 py-3'}`}>

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
          ) : j.state !== 'in_studio' && j.creative ? (
            // The PM added the artwork here instead of in Flex: that is fine, say where it is (live test 18 Oct).
            <p className="paragraph-xs text-secondary [overflow-wrap:anywhere]">
              Artwork added in Mia:{' '}
              {/^https?:\/\//i.test(j.creative) ? (
                <a className="underline" href={j.creative} target="_blank" rel="noreferrer">
                  {j.creative}
                </a>
              ) : (
                <span>{j.creative}</span> // never a link that isn't a web address (review 26 Oct)
              )}
            </p>
          ) : j.state !== 'in_studio' ? (
            <NeedsYou>No artwork linked in Flex yet.</NeedsYou>
          ) : null}
          {j.state === 'in_studio' ? (
            <p className="paragraph-sm text-secondary">
              In Flex: <span className="text-primary">{j.stage_label ?? 'Open'}</span>. It moves up to "Back from the studio" once
              the job is set to Ready to launch in Flex with its final artwork linked (a Drive file or image link).
            </p>
          ) : null}
          {j.final_url && j.state !== 'ready' ? (
            // the link with Mia's tracking, ready to paste into the ad (26 Oct)
            <div className="flex flex-col gap-0.5">
              <p className="paragraph-xs text-secondary flex flex-wrap items-center gap-2 [overflow-wrap:anywhere]">
                Tracked link: <span className="text-primary">{j.final_url}</span>
                <CopyButton value={j.final_url} label="Copy link" />
              </p>
              {j.launch?.link_note ? <p className="paragraph-xs text-tertiary">{j.launch.link_note}</p> : null}
            </div>
          ) : null}
          {j.flex_url ? (
            <a href={j.flex_url} target="_blank" rel="noreferrer"
              className="inline-flex w-fit items-center whitespace-nowrap rounded-md border border-brand px-2 py-0.5 paragraph-xs text-brand-secondary hover:bg-brand-primary">
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
                    onChange={(e) => setLink(e.target.value)} placeholder="https://… the page people land on (Mia adds the UTM tags)" />
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
                {/* The PM built the ad in Ads Manager themselves: it still counts as launched (live test 18 Oct). */}
                <Button size="sm" loading={busy === 'mark'} onClick={mark}>
                  I set it up myself
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

          {unsure.length ? (
            // Facebook may already have this post: never booked blind (review 26 Oct); the PM checks the Page
            <div className="flex flex-col gap-2">
              <NeedsYou>
                Mia couldn’t tell whether Facebook or Instagram took {unsure.length === 1 ? 'a post' : `${unsure.length} posts`} for
                this job. Check the Page’s scheduled posts first.
              </NeedsYou>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" loading={busy === 'unsure'} onClick={() => void notOnPage()}>
                  It’s not on the Page: book it again
                </Button>
                <Button size="sm" variant="ghost" loading={busy === 'mark'} onClick={() => void mark()}>
                  It’s there: mark it launched
                </Button>
              </div>
            </div>
          ) : null}

          {j.state === 'taken_in' && j.route === 'schedule' && !unsure.length ? (
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
  )
  if (bare) return body
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
      {open ? body : null}
    </li>
  )
}
