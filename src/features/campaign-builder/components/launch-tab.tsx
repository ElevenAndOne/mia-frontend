import { JobId, JobNames } from './job-names'
import { useEffect, useState } from 'react'
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
import { NeedsYou, channelLabel, day, phaseTag } from './parts'

// Launching a job (plan §8.2), shown under its row on the Studio page (Studio and Launch are one page since 19 Oct;
// the old Launch tab was removed as dead code, review 26 Oct). A job is ready when Flex says so and its final artwork
// is linked. The PM takes it in (artwork + the link people land on), then launches it the way its channel allows:
// Meta and Google ads go up PAUSED through Mia's existing push (checked first), Facebook/Instagram posts are
// scheduled, and anything Mia can't publish yet is set up where it runs and marked launched here.

// One job's launch work (artwork, landing page, push / schedule / mark). `bare`: just the body, for the drop-down
// under the job's row on the Studio page (Studio and Launch are one page since 19 Oct).
// One push check per channel, shared by every job card on it: the check is per channel, and "Launch them" on N jobs
// fired N of the same check (review 26 Nov, E10). Kept 30 s; Check again, a take-in or a push reads afresh.
type Preview = Awaited<ReturnType<typeof fetchMetaPushPreview>> | Awaited<ReturnType<typeof fetchGooglePushPreview>>
const PREVIEWS = new Map<string, { at: number; p: Promise<Preview> }>()
const PREVIEW_FOR_MS = 30_000

export function JobCard({ j, campaignId, onDone, bare = false }: { j: LaunchJob; campaignId: string; onDone: () => Promise<void>; bare?: boolean }) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id ?? ''
  const isAdmin = ['owner', 'admin'].includes(activeWorkspace?.role ?? '') // the push route needs admin (C8)
  const [open, setOpen] = useState(j.state === 'ready' || j.state === 'taken_in')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [link, setLink] = useState(j.final_url ?? '')
  const [creative, setCreative] = useState('')
  const [when, setWhen] = useState(() => (j.launch_date ? `${j.launch_date}T09:00` : ''))
  const [manualLink, setManualLink] = useState('')
  // the day a job worked outside Flex went out: its launch date if that has passed, else today (18 Nov)
  const [markDay, setMarkDay] = useState(() => {
    const today = new Date().toISOString().slice(0, 10)
    return j.launch_date && j.launch_date <= today ? j.launch_date : today
  })
  const [checks, setChecks] = useState<PushCheck[] | null>(null)
  const [pushCcy, setPushCcy] = useState<string | null>(null)
  const [advice, setAdvice] = useState<string[]>([]) // the check's warnings: not blocking, but worth a look
  const [typedBudget, setTypedBudget] = useState('') // in the ad account's currency, only when the plan's isn't it

  const run = async (label: string, fn: () => Promise<unknown>, after?: (out: unknown) => void) => {
    setBusy(label)
    setError(null)
    try {
      const out = await fn()
      PREVIEWS.delete(`${campaignId}:${j.action_id}`) // a take-in or push changes what the check says
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
  // The push check, by itself when a job ready to push opens (E34). Its own error line, so a failed check says so where
  // the Push button is, with Check again.
  const [checkError, setCheckError] = useState<string | null>(null)
  const [cta, setCta] = useState<string | null>(null) // the button the push gives the ad, read from the check
  const [autoChecked, setAutoChecked] = useState(false)
  const check = async (fresh = false) => {
    setBusy('check')
    setCheckError(null)
    const k = `${campaignId}:${j.action_id}`
    const hit = PREVIEWS.get(k)
    try {
      let req: Promise<Preview>
      if (!fresh && hit && Date.now() - hit.at < PREVIEW_FOR_MS) req = hit.p
      else {
        req = j.route === 'meta'
          ? fetchMetaPushPreview(sessionId!, tenantId, campaignId, j.action_id)
          : fetchGooglePushPreview(sessionId!, tenantId, campaignId, j.action_id)
        PREVIEWS.set(k, { at: Date.now(), p: req })
        req.catch(() => PREVIEWS.delete(k)) // a failed read is never shared
      }
      const p = await req
      setChecks(p.errors)
      setAdvice(p.warnings ?? [])
      setPushCcy(p.currency ?? null)
      if ('default_cta' in p && typeof p.default_cta === 'string') setCta(p.default_cta)
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : 'something went wrong')
    } finally {
      setBusy(null)
    }
  }
  const canPush = j.state === 'taken_in' && (j.route === 'meta' || j.route === 'google')
  useEffect(() => {
    if (!canPush || autoChecked || !sessionId) return
    setAutoChecked(true)
    void check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPush, autoChecked, sessionId])
  const push = () => {
    const where = j.route === 'meta' ? 'Meta' : 'Google Ads'
    if (!window.confirm(`Push every ready ad on this ${channelLabel(j.channel)} channel to ${where} as PAUSED? Nothing runs until someone switches it on in ${where}.`)) return
    void run('push', async () => {
      // The workflow finishing is not the push working: Meta/Google can refuse a step and the result
      // comes back with success false, which used to read as "Pushed" (sweep 12 Nov).
      setNote(null)
      const typed = currencyClash && Number(typedBudget) > 0 ? Number(typedBudget) : undefined
      if (j.route === 'meta') {
        const opts = typed ? { lifetime_budget: typed } : {}
        let r
        try {
          r = await pushChannelActionToMeta(sessionId!, tenantId, campaignId, j.action_id, opts)
        } catch (e) {
          // the last push timed out, so Meta may have made it already (C7): the PM looks in Ads Manager, then says so
          const msg = e instanceof Error ? e.message : ''
          if (!/say you've checked/.test(msg)) throw e
          if (!window.confirm(`${msg}

Have you looked in Ads Manager and deleted any copy? OK pushes again.`)) return
          r = await pushChannelActionToMeta(sessionId!, tenantId, campaignId, j.action_id, { ...opts, checked_ads_manager: true })
        }
        if (!r?.success) {
          const why = r?.stage === 'campaign' ? r.campaign : r?.stage === 'adset' ? r.adset : undefined
          // a step that never reported back isn't a refusal: its own message says to check Ads Manager (review 16 Nov)
          if (why?.error === 'timed_out' || why?.error === 'cut_off') throw new Error(why.message ?? 'Check Ads Manager before pushing again.')
          const reason = why?.message || why?.error
          throw new Error(`Meta refused the push at the ${r?.stage ?? 'first'} step${reason ? `: ${reason}` : ''}. Nothing is spending; anything it made is paused.`)
        }
        const made = r.ads_created ?? 0
        const tried = r.ads?.length ?? made
        setNote(made < tried
          ? `Pushed to Meta, paused, but only ${made} of ${tried} ads were made. Check the others in Meta Ads Manager.`
          : `Pushed to Meta, paused. Switch it on there when you're ready.`)
      } else {
        const r = await pushChannelActionToGoogle(sessionId!, tenantId, campaignId, j.action_id,
          typed ? { daily_budget: typed } : {})
        if (!r?.success) {
          if (r?.error === 'timed_out' || r?.error === 'cut_off') throw new Error(r.message ?? 'Check Google Ads before pushing again.')
          const reason = r?.message || r?.error
          throw new Error(`Google Ads refused the push${reason ? `: ${reason}` : ''}. Nothing is spending; anything it made is paused.`)
        }
        setNote(`Pushed to ${where}, paused. Switch it on there when you're ready.`)
      }
    })
  }
  const schedule = () =>
    run('schedule', () =>
      api.launchAction(sessionId!, tenantId, campaignId, 'schedule', { asset_id: j.asset_id, when: new Date(when).toISOString() }),
    )
  const mark = () => run('mark', () => api.launchAction(sessionId!, tenantId, campaignId, 'mark', { asset_id: j.asset_id, link: manualLink || null }))
  const markLive = () =>
    run('mark', () => api.launchAction(sessionId!, tenantId, campaignId, 'mark', { asset_id: j.asset_id, link: manualLink || null, when: markDay }))
  const notOnPage = () => run('unsure', () => api.launchAction(sessionId!, tenantId, campaignId, 'not-on-page', { asset_id: j.asset_id }))
  const unsure = j.launch?.unsure ?? []
  // The plan's budget is in another currency than the ad account's: the PM types it in the account's (review 16 Nov:
  // the block said "type it on this push" and there was nowhere to type it)
  const currencyClash = (checks ?? []).some((c) => c.code === 'budget_currency_mismatch')
  const blocking = (checks ?? []).filter(
    (c) => c.severity === 'block' && !(c.code === 'budget_currency_mismatch' && Number(typedBudget) > 0),
  )

  // A job worked outside Flex (in ClickUp, or made before the campaign moved): it goes out where the team runs it
  // (Brevo, LinkedIn...), so the PM marks it live here, with its link and the day, and Results track it (18 Nov). A job
  // set to live/running in ClickUp is marked live by Mia herself.
  const elsewhereBody = (
    <div className={`flex flex-col gap-2 ${bare ? '' : 'border-t border-secondary px-3 py-3'}`}>
      {j.state === 'launched' ? (
        <p className="paragraph-sm text-secondary">
          {j.launch.how === 'clickup' ? 'Live: set to live/running in ClickUp' : 'Marked live'}
          {j.launch.launched_at ? ` on ${day(j.launch.launched_at.slice(0, 10))}` : ''}
          {j.launch.launched_by && j.launch.how !== 'clickup' ? ` by ${j.launch.launched_by}` : ''}.
        </p>
      ) : (
        <>
          <p className="paragraph-xs text-secondary">
            {j.clickup_url ? 'Worked in ClickUp, not Flex' : 'Made outside Flex'}
            {j.stage_label ? ` (${j.stage_label})` : ''}. When it's out in {j.manual_where}, mark it live here so Mia
            tracks its results. Add its link there if it has one (a Brevo campaign, a post).
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 paragraph-xs text-tertiary">
              Its link there (optional)
              <input className="rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary" value={manualLink}
                onChange={(e) => setManualLink(e.target.value)} placeholder="https://…" />
            </label>
            <label className="flex flex-col gap-1 paragraph-xs text-tertiary">
              Went out on
              <input type="date" className="rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary"
                value={markDay} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setMarkDay(e.target.value)} />
            </label>
            <Button size="sm" variant="primary" loading={busy === 'mark'} disabled={!markDay} onClick={() => void markLive()}>
              Mark as live
            </Button>
          </div>
        </>
      )}
      {j.launch?.link ? (
        <a href={j.launch.link} target="_blank" rel="noreferrer" className="self-start paragraph-xs underline text-primary">
          Where it runs ↗
        </a>
      ) : null}
      {j.clickup_url ? (
        <a href={j.clickup_url} target="_blank" rel="noreferrer" className="self-start paragraph-xs underline text-primary">
          Open in ClickUp ↗
        </a>
      ) : null}
      {error ? <p className="paragraph-xs text-utility-warning-700">{error}</p> : null}
    </div>
  )

  // What the ad looks like, for a job ready to push: its picture, headline and text (E34: a raw S3 link, the full UTM
  // link and cut-off words were shown instead)
  const images = [
    ...j.artwork.filter((a) => /image|png|jpe?g|webp|gif/i.test(a.kind) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(a.url)).map((a) => a.url),
    ...(j.creative ?? '').split('\n').map((x) => x.trim()).filter((x) => /^https?:\/\//i.test(x)),
  ].filter((u, i, all) => all.indexOf(u) === i)
  const pushable = canPush
  const flexBody = (
    <div className={`flex flex-col gap-3 ${bare ? '' : 'border-t border-secondary px-3 py-3'}`}>
          {pushable && j.route === 'meta' ? (
            <AdPreview images={images} headline={j.words?.headline ?? null} text={j.words?.text ?? null} cta={cta} />
          ) : null}

          {!(pushable && j.route === 'meta') && j.artwork.length ? (
            <div className="flex flex-col gap-1">
              <p className="label-xs text-secondary">Artwork from the studio</p>
              <ul className="flex flex-wrap gap-2">
                {j.artwork.map((a) => (
                  <li key={a.url}>
                    <a href={a.url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center rounded-md border border-brand px-2 py-0.5 paragraph-xs text-brand-secondary hover:bg-brand-primary">
                      {a.title || a.kind} ({a.kind}) ↗
                    </a>
                    {a.measured ? (
                      <p className="paragraph-xs text-tertiary mt-0.5">
                        {a.width}×{a.height}
                        {a.ratio ? ` (${a.ratio})` : ''}: {a.fits}
                      </p>
                    ) : a.measured === false && a.why ? (
                      <p className="paragraph-xs text-tertiary mt-0.5">Size not read: {a.why}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {j.figma_only ? (
                <NeedsYou>Only a Figma link: ad platforms need the exported file. Add a Drive link in Flex, or paste an image link below.</NeedsYou>
              ) : null}
            </div>
          ) : pushable && j.route === 'meta' ? null : j.state !== 'in_studio' && j.creative ? (
            // The artwork came in through Mia (pasted, or from the job's Drive folder): its pictures, never the raw
            // storage links (E34)
            images.length ? (
              <ul className="flex flex-wrap gap-2">
                {images.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noreferrer" title="Open the full size">
                      <img src={u} alt="" loading="lazy" className="h-24 w-auto rounded-md border border-secondary object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="paragraph-xs text-secondary [overflow-wrap:anywhere]">Artwork added in Mia: {j.creative}</p>
            )
          ) : j.search && j.state === 'ready' ? (
            <p className="paragraph-sm text-secondary">A search ad is its headlines and descriptions, so there's no file: add the page people land on.</p>
          ) : j.no_file && j.state === 'ready' ? (
            <NeedsYou>Done in Flex, but no file came back with it. Put it in the job's _Delivery folder on Drive, or paste its link below.</NeedsYou>
          ) : j.state !== 'in_studio' ? (
            <NeedsYou>No artwork linked in Flex yet.</NeedsYou>
          ) : null}
          {j.state === 'in_studio' ? (
            <p className="paragraph-sm text-secondary">
              At the studio: <span className="text-primary">{j.stage_label ?? 'Open'}</span>. It comes back here by itself once
              the studio has finished it and its files are in.
            </p>
          ) : null}

          {j.state === 'ready' ? (
            <div className="flex flex-col gap-2">
              {!j.search && (j.figma_only || !j.usable_artwork.length) ? (
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
                {j.search ? 'Take it in' : 'Use this artwork'}
              </Button>
            </div>
          ) : null}

          {j.route === 'meta' && (j.state === 'ready' || j.state === 'taken_in') ? (
            <AdWords
              key={`${j.asset_id}:${j.words?.headline ?? ''}:${j.words?.text ?? ''}`}
              words={j.words ?? null}
              saving={busy === 'words'}
              onSave={(w) => run('words', () => api.saveAdWords(sessionId!, tenantId, campaignId, j.asset_id, w), () => {
                setChecks(null) // new words: Mia checks again by herself
                setAutoChecked(false)
              })}
            />
          ) : null}

          {pushable ? (
            // Mia checks by herself when this opens, and Push lights only once nothing blocks it (E34: "Push" led
            // before any check had run)
            <div className="flex flex-col gap-2">
              {busy === 'check' || (!checks && !checkError) ? (
                <p className="paragraph-sm text-tertiary">Mia is checking the ad before it goes up…</p>
              ) : checkError ? (
                <p className="flex flex-wrap items-center gap-2 paragraph-sm text-utility-warning-700">
                  Mia couldn't check it: {checkError}
                  <Button size="sm" onClick={() => void check(true)}>Check again</Button>
                </p>
              ) : blocking.length ? (
                <p className="paragraph-sm text-primary">Before it can go up:</p>
              ) : (
                <p className="paragraph-sm text-utility-success-700">Ready to push. It goes up paused; nothing runs until someone switches it on.</p>
              )}
              {currencyClash ? (
                <label className="flex flex-wrap items-center gap-2 paragraph-xs text-secondary">
                  {j.route === 'meta' ? 'Lifetime' : 'Daily'} budget in {pushCcy ?? "the account's currency"}
                  <input
                    type="number"
                    min={0}
                    value={typedBudget}
                    onChange={(e) => setTypedBudget(e.target.value)}
                    className="w-32 rounded-lg border border-secondary bg-primary px-2 py-1 paragraph-xs text-primary"
                  />
                </label>
              ) : null}
              {checks ? (
                blocking.length ? (
                  <ul className="paragraph-xs text-utility-warning-700 flex flex-col gap-0.5">
                    {blocking.map((c) =>
                      c.code === 'ad_countries_unset' ? (
                        <li key={c.code}>
                          <CountriesQuestion
                            message={c.message}
                            suggest={c.suggest ?? []}
                            onSave={(list) => void run('countries', () => api.saveAdCountries(sessionId!, tenantId, list)).then(() => check())}
                            saving={busy === 'countries'}
                          />
                        </li>
                      ) : (
                        <li key={c.code}>⚠ {c.message}</li>
                      ),
                    )}
                  </ul>
                ) : advice.length ? (
                  // warnings used to be dropped, and this said "All checks pass" over them (sweep D6)
                  <ul className="flex flex-col gap-0.5 paragraph-xs text-secondary">
                    {advice.map((w) => (
                      <li key={w}>• {w}</li>
                    ))}
                  </ul>
                ) : null
              ) : null}
              {!isAdmin ? (
                // the push and the countries need an admin or owner: said here, not at the last press (review 26 Nov, C8)
                <p className="paragraph-xs text-utility-warning-700">
                  Only a workspace admin or owner can push ads. Ask one to press Push, or set it up yourself in Ads Manager.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button size="md" variant="primary" loading={busy === 'push'} disabled={!isAdmin || !checks || !!blocking.length || busy === 'check'} onClick={push}>
                  Push to {j.route === 'meta' ? 'Meta' : 'Google'}, paused
                </Button>
                {/* The PM built the ad in Ads Manager themselves: it still counts as launched (live test 18 Oct). */}
                <Button size="md" loading={busy === 'mark'} onClick={mark}>
                  I set it up myself
                </Button>
              </div>
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
          {/* the link with Mia's tracking and the job's names, on tap (E34: spelt out on the card before) */}
          {(j.final_url && j.state !== 'ready') || j.names ? (
            <details className="paragraph-xs text-tertiary">
              <summary className="cursor-pointer select-none hover:text-secondary">Link and names</summary>
              <div className="mt-1 flex flex-col gap-1">
                {j.final_url && j.state !== 'ready' ? (
                  <p className="flex flex-wrap items-center gap-2 [overflow-wrap:anywhere]">
                    Tracked link: <span className="text-secondary">{j.final_url}</span>
                    <CopyButton value={j.final_url} label="Copy link" />
                  </p>
                ) : null}
                {j.launch?.link_note ? <p>{j.launch.link_note}</p> : null}
                <JobNames names={j.names} />
              </div>
            </details>
          ) : null}
    </div>
  )
  const body = j.route === 'elsewhere' ? elsewhereBody : flexBody
  if (bare) return body
  return (
    <li className="rounded-xl border border-secondary bg-primary">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left hover:bg-secondary">
        <span className="min-w-0 flex-1 paragraph-sm text-primary">
          {j.name}
          {j.job_no ? <span className="ml-1.5 paragraph-xs text-tertiary tabular-nums">{j.job_no}</span> : null}
          <JobId id={j.job_id} />
        </span>
        <span className="paragraph-xs text-tertiary">
          {phaseTag(j.phase)}{channelLabel(j.channel)}
        </span>
        <span className="paragraph-xs text-tertiary whitespace-nowrap">goes live {day(j.launch_date)}</span>
        {j.state === 'in_studio' ? <span className="paragraph-xs text-secondary">In Flex: {j.stage_label ?? 'Open'}</span> : null}
        {j.state === 'elsewhere' ? <span className="paragraph-xs text-secondary">{j.stage_label ?? 'Not in Flex'}</span> : null}
        {j.state === 'ready' && j.no_file ? <span className="paragraph-xs text-utility-warning-700">Done in Flex, no file yet</span> : null}
        {j.state === 'launched' ? (
          <span className="label-xs text-utility-success-700 whitespace-nowrap">
            ✓ {j.launch.how === 'scheduled' ? 'scheduled' : j.launch.how === 'manual' ? 'launched' : j.launch.how === 'clickup' ? 'live (ClickUp)' : 'pushed, paused'}
          </span>
        ) : null}
        <span className="paragraph-xs text-tertiary">{open ? '▴' : '▾'}</span>
      </button>
      {open ? body : null}
    </li>
  )
}


// What the Meta ad will look like (E34): the picture (each size, when there are several), the text above it and the
// headline under it, as in the feed. Missing words show as a gap to fill, never as blank.
function AdPreview({ images, headline, text, cta }: { images: string[]; headline: string | null; text: string | null; cta: string | null }) {
  const button = cta ? cta.toLowerCase().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : null
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl border border-secondary bg-primary">
      <p className="px-3 pt-3 paragraph-sm text-primary whitespace-pre-line [overflow-wrap:anywhere]">
        {text || <span className="text-utility-warning-700">No ad text yet</span>}
      </p>
      {images.length ? (
        <div className="mt-2 flex gap-1 overflow-x-auto bg-secondary">
          {images.map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className="shrink-0" title="Open the full size">
              <img src={u} alt="" loading="lazy" className={`${images.length > 1 ? 'h-48' : 'max-h-80 w-full'} object-contain`} />
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-2 bg-secondary px-3 py-6 text-center paragraph-xs text-tertiary">The picture shows here once it's in</p>
      )}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="min-w-0 label-sm text-primary [overflow-wrap:anywhere]">
          {headline || <span className="text-utility-warning-700">No headline yet</span>}
        </p>
        {button ? <span className="shrink-0 rounded-md bg-secondary px-2 py-1 label-xs text-secondary">{button}</span> : null}
      </div>
    </div>
  )
}

// Where the client's ads run: asked once, the first time a push is checked, pre-filled from the ad account, saved for
// the workspace (flow review L3, 23 Nov: every push targeted South Africa). Two-letter codes: ZA, GB, US.
function CountriesQuestion({ message, suggest, onSave, saving }: {
  message: string
  suggest: string[]
  onSave: (countries: string[]) => void
  saving: boolean
}) {
  const [typed, setTyped] = useState(suggest.join(', '))
  const list = typed.split(/[\s,;]+/).map((x) => x.trim().toUpperCase()).filter(Boolean)
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-secondary bg-primary p-2 text-primary">
      <span>{message}</span>
      <span className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Countries the ads run in"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="ZA"
          className="w-40 rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm uppercase"
        />
        <Button size="sm" variant="primary" loading={saving} disabled={!list.length} onClick={() => onSave(list)}>
          Save for this client
        </Button>
      </span>
    </div>
  )
}


// The ad's words as the push uses them (23 Nov): one quiet line when they're there, the two boxes open when one is
// missing (a job added by hand or from ClickUp has none, and the push blocks on that).
function AdWords({ words, saving, onSave }: {
  words: { headline: string | null; text: string | null } | null
  saving: boolean
  onSave: (w: { headline: string; text: string }) => void
}) {
  const missing = !words?.headline || !words?.text
  const [open, setOpen] = useState(missing)
  const [headline, setHeadline] = useState(words?.headline ?? '')
  const [text, setText] = useState(words?.text ?? '')
  if (!open) {
    return (
      <p className="paragraph-xs text-tertiary [overflow-wrap:anywhere]">
        Ad words: <span className="text-primary">{words?.headline}</span> · {words?.text?.slice(0, 80)}
        {(words?.text?.length ?? 0) > 80 ? '…' : ''}{' '}
        <button type="button" className="underline hover:text-primary" onClick={() => setOpen(true)}>
          Edit
        </button>
      </p>
    )
  }
  return (
    <div className={`flex flex-col gap-2 rounded-lg border p-2 ${missing ? 'border-utility-warning-300' : 'border-secondary'}`}>
      <p className="label-xs text-secondary">Ad words{missing ? ': the push needs both' : ''}</p>
      <label className="flex flex-col gap-1 paragraph-xs text-secondary">
        Headline
        <input value={headline} maxLength={200} onChange={(e) => setHeadline(e.target.value)}
          className="rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary" />
      </label>
      <label className="flex flex-col gap-1 paragraph-xs text-secondary">
        Ad text
        <textarea value={text} rows={3} onChange={(e) => setText(e.target.value)}
          className="rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary" />
      </label>
      <span className="flex gap-2">
        <Button size="sm" variant="primary" loading={saving} disabled={!headline.trim() || !text.trim()}
          onClick={() => onSave({ headline, text })}>
          Save words
        </Button>
        {!missing ? (
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        ) : null}
      </span>
    </div>
  )
}

