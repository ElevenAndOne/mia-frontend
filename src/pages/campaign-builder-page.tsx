import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/button'
import { TopBar } from '../components/top-bar'
import { useSession } from '../contexts/session-context'
import { readDeck, showOnHome, startBuild, type ClientType, type DeckRead } from '../features/campaign-builder/api'
import { clearTrackerCache } from '../features/campaign/services/campaign-tracker-service'
import { CampaignChat } from '../features/campaign-builder/campaign-chat'
import { BriefTab } from '../features/campaign-builder/components/brief-tab'
import { Card, day, money } from '../features/campaign-builder/components/parts'
import { PlanTab, type PlanPart } from '../features/campaign-builder/components/plan-tab'
import { StepRail } from '../features/campaign-builder/components/builder-steps'
import { stepsFor, currentStep, stepStates, wordsToFix, type StepKey } from '../features/campaign-builder/components/steps'
import { ASK_EVENT } from '../features/campaign-builder/components/your-turn'
import { UpNext } from '../features/campaign-builder/components/up-next'
import { StudioTab } from '../features/campaign-builder/components/studio-tab'
import { ResultsTab } from '../features/campaign-builder/components/results-tab'
import { useBuild } from '../features/campaign-builder/use-build'
import { sastToday } from '../features/campaigns/utils/campaign-dates'

// The new campaign page (rebuild slice 3, staff only while tested).
//   /campaign-builder/new                 describe the campaign → a draft exists from that moment
//   /campaign-builder/:campaignId/:tab    Brief · Plan (Studio, Launch, Results come next)
// Everything lives on the server, so a refresh or another tab shows the same state.

const TABS = [
  { key: 'brief', label: 'Brief' },
  { key: 'plan', label: 'Plan' },
  { key: 'studio', label: 'Studio & launch' }, // one page since 19 Oct: each job's launch opens under its row
  { key: 'results', label: 'Results' },
] as const

// The server's limit on the documents' text (StartRequest.deck_text); every step reads up to it whole (deck.py
// FULL_CHARS, 27 Oct).
const MAX_SOURCE_CHARS = 200_000
const MAX_PM_TEXT_CHARS = 20_000

// The documents as the one text the server reads. One file reads exactly as before; several are each opened by the
// line services/campaign_builder/deck.py FILE_MARK looks for.
function sourceText(files: DeckRead[], pasted: string): string {
  const paste = pasted.trim()
  if (files.length < 2) {
    return [files[0] ? `${files[0].filename}\n\n${files[0].text}` : '', paste].filter(Boolean).join('\n\n')
  }
  const docs = [...files.map((f) => ({ name: f.filename, text: f.text })), ...(paste ? [{ name: 'Pasted text', text: paste }] : [])]
  return docs.map((d, i) => `===== File ${i + 1} of ${docs.length}: ${d.name} =====\n\n${d.text}`).join('\n\n')
}

const CampaignBuilderPage = () => {
  const { campaignId } = useParams()
  return campaignId ? <BuildPage campaignId={campaignId} /> : <NewBuild />
}

function NewBuild() {
  const navigate = useNavigate()
  const { sessionId, activeWorkspace } = useSession()
  const [text, setText] = useState('')
  const [deck, setDeck] = useState('')
  const [showDeck, setShowDeck] = useState(false)
  const [files, setFiles] = useState<DeckRead[]>([])
  const [reading, setReading] = useState<string | null>(null) // the file being read now
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Campaign | BPO: always starts on Campaign; BPO is picked by hand (20 Nov, Josh)
  const [clientType, setClientType] = useState<ClientType>('campaign')
  const deckText = sourceText(files, deck)
  const deckTooLong = deckText.length > MAX_SOURCE_CHARS
  // The server takes at most 20,000 characters here (StartRequest.pm_text); a pasted full brief belongs in
  // the deck box, which takes far more (sweep 12 Nov: over the cap it failed with a bare "Request failed").
  const textTooLong = text.length > MAX_PM_TEXT_CHARS
  const tooLong = deckTooLong || textTooLong

  const addFiles = async (picked: File[]) => {
    if (!sessionId || !activeWorkspace) return
    setError(null)
    const failed: string[] = []
    // One at a time: a PDF of pictures is transcribed by Claude and takes a minute; one that fails keeps the others
    for (const f of picked) {
      setReading(f.name)
      try {
        const read = await readDeck(sessionId, activeWorkspace.tenant_id, f)
        setFiles((have) => (have.some((h) => h.filename === read.filename && h.chars === read.chars) ? have : [...have, read]))
      } catch (err) {
        failed.push(`${f.name}: ${err instanceof Error ? err.message : 'could not be read'}`)
      }
    }
    setReading(null)
    if (failed.length) setError(failed.join(' · '))
  }

  const start = async () => {
    if (!sessionId || !activeWorkspace) return
    setBusy(true)
    setError(null)
    try {
      const { campaign_id } = await startBuild(sessionId, activeWorkspace.tenant_id, {
        pm_text: text.trim() || 'Build the campaign from the attached deck.',
        deck_text: deckText || undefined,
        client_type: clientType,
      })
      navigate(`/campaign-builder/${campaign_id}/brief`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the campaign')
      setBusy(false)
    }
  }

  return (
    <div className="w-full h-dvh flex flex-col overflow-hidden bg-secondary">
      <TopBar
        title="New campaign"
        breadcrumbs={[{ label: 'Home', to: '/home' }, { label: 'Campaign builder', to: '/campaign-builder' }, { label: 'New campaign' }]}
        onBack={() => navigate('/campaign-builder')}
      />
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
        <form
          className="mx-auto flex max-w-2xl flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if ((text.trim() || files.length) && !tooLong) start()
          }}
        >
          <div>
            <h1 className="subheading-md text-primary">What's the campaign?</h1>
            <p className="paragraph-sm text-tertiary mt-1">
              Write it the way you'd tell the team: the goal, dates, budget, channels, anything that must or must not
              happen. A line is enough; Mia reads {activeWorkspace?.name ?? 'the client'}'s history, results and brand and
              drafts the brief for you to check.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <div role="radiogroup" aria-label="Client type" className="inline-flex self-start rounded-lg border border-secondary bg-primary p-0.5">
              {(
                [
                  ['campaign', 'Campaign'],
                  ['bpo', 'BPO'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={clientType === key}
                  onClick={() => setClientType(key)}
                  // the chosen one filled in brand colour with a tick, so it's plain which is on (test 24 Nov)
                  className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 label-sm transition-colors ${
                    clientType === key ? 'bg-brand-solid text-primary-onbrand shadow-sm' : 'text-tertiary hover:text-primary'
                  }`}
                >
                  {clientType === key ? <span aria-hidden="true">✓</span> : null}
                  {label}
                </button>
              ))}
            </div>
            <p className="paragraph-xs text-tertiary">
              {clientType === 'bpo'
                ? "BPO: the client's document is the brief. Mia only flags what blocks the work. No targets or ad budget."
                : 'Campaign: Mia plans it with you, with targets and the ad budget.'}
            </p>
          </div>
          <label htmlFor="pm-text" className="sr-only">
            The campaign
          </label>
          <textarea
            id="pm-text"
            rows={7}
            className="rounded-xl border border-secondary bg-primary px-4 py-3 paragraph-md text-primary"
            placeholder="e.g. Festive campaign for Nov to Jan, R108k, Meta ads, emailers and organic. No athletes this time."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {textTooLong ? (
            <p className="paragraph-xs text-error">
              This box takes up to {MAX_PM_TEXT_CHARS.toLocaleString()} characters (this is {text.length.toLocaleString()}).
              Keep the short version here and paste the full brief under "Or paste its text" below, or attach it as a file.
            </p>
          ) : null}
          <div className="flex flex-col gap-1">
            {files.map((f, i) => (
              <span
                key={`${f.filename}-${f.chars}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
              >
                📎 {f.filename}
                <span className="paragraph-xs text-tertiary">
                  {f.pages ? `${f.pages} pages · ` : ''}
                  {f.how === 'text' ? 'read' : f.how} · {f.chars.toLocaleString()} characters
                  {f.note ? ` · ${f.note}` : ''}
                </span>
                <button
                  type="button"
                  className="ml-auto paragraph-xs text-tertiary underline"
                  onClick={() => setFiles((have) => have.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </span>
            ))}
            <label className="self-start cursor-pointer paragraph-sm text-secondary underline">
              {reading
                ? `Reading ${reading}… (slides that are pictures take a minute)`
                : files.length
                  ? 'Add another document'
                  : 'Add brief or deck'}
              <input
                type="file"
                multiple
                className="sr-only"
                accept=".pdf,.pptx,.docx,.txt,.md,.xlsx,.xlsm,.csv,.html,.htm"
                disabled={!!reading}
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? [])
                  e.target.value = ''
                  if (picked.length) addFiles(picked)
                }}
              />
            </label>
            {deckTooLong ? (
              <p className="paragraph-xs text-error">
                Together these are {deckText.length.toLocaleString()} characters; the most Mia takes in at once is{' '}
                {MAX_SOURCE_CHARS.toLocaleString()}. Remove a document, or paste only the parts that matter.
              </p>
            ) : null}
          </div>
          {showDeck ? (
            <label className="flex flex-col gap-1">
              <span className="label-xs text-secondary">The deck or brief, pasted as text</span>
              <textarea
                id="deck-text"
                rows={8}
                className="rounded-xl border border-secondary bg-primary px-4 py-3 paragraph-sm text-primary"
                value={deck}
                onChange={(e) => setDeck(e.target.value)}
              />
            </label>
          ) : (
            <button type="button" className="self-start paragraph-sm text-secondary underline" onClick={() => setShowDeck(true)}>
              Or paste its text
            </button>
          )}
          {error ? <p className="paragraph-sm text-error">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={busy} disabled={(!text.trim() && !files.length) || !!reading || tooLong}>
              Start the brief
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BuildPage({ campaignId }: { campaignId: string }) {
  const navigate = useNavigate()
  const { tab = 'brief' } = useParams()
  const build = useBuild(campaignId)
  const { sessionId, activeWorkspace } = useSession()
  const s = build.state
  const go = (t: string) => navigate(`/campaign-builder/${campaignId}/${t}`)
  const [chatOpen, setChatOpen] = useState(false) // phones and narrow windows; always shown on wide screens
  // Ask Mia on a narrow screen opens the chat, so her reply and its cards are seen (review 22 Oct, 5.2)
  useEffect(() => {
    const open = () => setChatOpen(true)
    window.addEventListener(ASK_EVENT, open)
    return () => window.removeEventListener(ASK_EVENT, open)
  }, [])
  const [flash, setFlashNow] = useState<string | null>(null)
  // Two lines in one render (a step moving on and its background work finishing) are said together, the work first,
  // never one wiping the other (review 2 Nov: "Final words done. Next: Check" lost to "Done: final words for…")
  const lastSaid = useRef<{ at: number; text: string } | null>(null)
  const setFlash = (text: string | null) => {
    const prev = lastSaid.current
    const together = text && prev && Date.now() - prev.at < 300
    const joined = !together ? text
      : prev.text.startsWith('✓') ? `${text} ${prev.text.replace(/^✓ .*? done\. /, '')}` : `${prev.text} ${text}`
    lastSaid.current = joined ? { at: Date.now(), text: joined } : null
    setFlashNow(joined)
  }
  const seen = useRef<{ brief?: number; plan?: string }>({})
  const fromChat = useRef(false)
  const pageScroll = useRef<HTMLDivElement>(null)
  // While the campaign is a draft, the page is six steps; after Approve, the tabs (Studio & launch, Results).
  const states = s ? stepStates(s) : null
  const steps = stepsFor(s)
  const stepKeys = steps.map((st) => st.key) as string[]
  const step: StepKey | null =
    s && s.campaign.building && states
      ? stepKeys.includes(tab)
        ? (tab as StepKey)
        : tab === 'brief' || tab === 'start' // links from before Start folded into Key facts (L1)
          ? 'facts'
          : currentStep(states)
      : null
  const goStep = (k: StepKey) => {
    go(k)
    pageScroll.current?.scrollTo({ top: 0 })
  }

  // After a chat reply, say what Mia changed (the page has already re-read it).
  useEffect(() => {
    if (!s) return
    const brief = s.brief?.version
    const plan = s.plan ? JSON.stringify([s.plan.assets, s.plan.decisions]) : undefined
    if (fromChat.current) {
      const what = [brief !== seen.current.brief && 'the brief', plan !== seen.current.plan && 'the plan'].filter(Boolean)
      if (what.length) setFlash(`Mia updated ${what.join(' and ')}.`)
      fromChat.current = false
    }
    seen.current = { brief, plan }
  }, [s])
  // A step that finishes while the PM is on it moves them to the next, and says so (local test 27 Oct: after "Looks
  // right" the page stayed put, and the PM only knew a step was done when told). Only on the change to done: going
  // back to a finished step stays there.
  const shownStates = useRef<ReturnType<typeof stepStates> | null>(null)
  useEffect(() => {
    if (!states || !step) return
    const was = shownStates.current?.[step]
    shownStates.current = states
    if (!was || was === 'done' || states[step] !== 'done') return
    const at = steps.findIndex((st) => st.key === step)
    const nxt = steps[at + 1]
    if (!nxt || at < 0) return
    setFlash(`✓ ${steps[at].label} done. Next: ${nxt.label}.`)
    goStep(nxt.key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states, step])
  // Background work that finishes says so (local test 27 Oct: "i had no idea it was done til u said so"): the plan,
  // the final words, Mia's check. Only on the change from running, never on load.
  const wasRunning = useRef<{ plan?: boolean; words?: boolean; checking?: boolean; checked?: string }>({})
  useEffect(() => {
    if (!s) return
    const now = {
      plan: s.plan_run?.status === 'running',
      words: s.words_run?.status === 'running',
      checking: !!s.checking,
      checked: s.plan?.review?.checked_at, // a check that really ran (one that found nothing to do keeps the old stamp)
    }
    const was = wasRunning.current
    wasRunning.current = now
    const jobs = s.plan?.assets ?? []
    const asks = (s.plan?.decisions.ask_pm ?? []).filter((q) => typeof q === 'string' || q.about !== 'Targets').length
    if (was.plan && !now.plan && s.plan_run?.status === 'done')
      setFlash(
        asks
          ? `Done: the plan is made, ${jobs.length} jobs. Answer Mia's questions; she writes the final words as soon as they're done.`
          : `Done: the plan is made, ${jobs.length} jobs. Mia is writing their final words now; you can go on.`,
      )
    else if (was.words && !now.words && s.words_run?.status === 'done') {
      const flagged = jobs.filter(wordsToFix).length
      const written = jobs.filter((a) => a.final_words).length
      setFlash(`Done: final words for ${written} of ${jobs.length} jobs${flagged ? `, ${flagged} for you to look at` : ', all checked'}.`)
    } else if (was.words && !now.words && s.words_run?.status === 'failed')
      setFlash('The final words stopped. Try again is on the Final words step.')
    else if (was.checking && !now.checking && !now.words && now.checked && now.checked !== was.checked) {
      const p = s.plan
      const done = new Set(p?.decisions.notes_done ?? [])
      const n = (p?.review?.audit?.jobs?.length ?? 0) + (p?.review?.scorecard?.look_at ?? []).filter((x) => !done.has(x)).length
      setFlash(n ? `Done: Mia checked the plan and found ${n} thing${n === 1 ? '' : 's'} to look at.` : 'Done: Mia checked the plan. Nothing found.')
    }
  }, [s])
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlashNow(null), 8000)
    return () => clearTimeout(t)
  }, [flash])

  return (
    <div className="w-full h-dvh flex flex-col overflow-hidden bg-secondary">
      <TopBar
        title={s?.campaign.name ?? 'Campaign'}
        breadcrumbs={[
          { label: 'Home', to: '/home' },
          { label: 'Campaign builder', to: '/campaign-builder' },
          { label: s?.campaign.name ?? 'Campaign', to: `/campaign-builder/${campaignId}/brief` },
          // A draft is on one of the six steps; an approved campaign on one of its tabs.
          {
            label: step
              ? (steps.find((st) => st.key === step)?.label ?? 'Brief')
              : (TABS.find((t) => t.key === tab || (t.key === 'studio' && tab === 'launch'))?.label ?? 'Brief'),
          },
        ]}
        onBack={() => navigate('/campaign-builder')}
      />
      <div className="flex-1 min-h-0 flex">
      <div ref={pageScroll} className="@container flex-1 min-w-0 overflow-y-auto">
        {build.loading ? (
          <p className="p-6 paragraph-sm text-tertiary">Loading…</p>
        ) : !s ? (
          <p className="p-6 paragraph-sm text-error">{build.loadError ?? 'Campaign not found'}</p>
        ) : (
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
            {build.loadError ? (
              // A failed refresh keeps the page as last read and says so (review 26 Oct: one 502 replaced the whole
              // page with the error, and nothing tried again)
              <p className="rounded-lg border border-utility-warning-300 bg-utility-warning-100 px-3 py-2 paragraph-sm text-utility-warning-700">
                Couldn’t refresh just now ({build.loadError}). Showing the campaign as last read; Mia tries again in a moment.
              </p>
            ) : null}
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="paragraph-sm text-secondary">
                  {/* only what's set (24 Nov: a new draft read "DFSA · — – — · — · draft") */}
                  {[
                    s.campaign.client,
                    s.campaign.start_date || s.campaign.end_date
                      ? `${s.campaign.start_date ? day(s.campaign.start_date) : '…'} – ${s.campaign.end_date ? day(s.campaign.end_date) : '…'}`
                      : null,
                    s.campaign.budget_total != null ? money(s.campaign.budget_total, s.campaign.currency) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  {s.campaign.building
                    ? ' · draft'
                    : // paused and finished campaigns said "approved, not live yet" (browser pass 10 Nov)
                      s.campaign.status === 'paused'
                      ? ' · paused'
                      : s.campaign.status === 'completed'
                        ? ' · ended'
                        : s.campaign.status === 'archived'
                          ? ' · archived'
                          : s.campaign.status === 'live'
                      ? // launched before its start date: it isn't running yet (live test 18 Oct)
                        s.campaign.start_date && s.campaign.start_date > sastToday()
                        ? ` · launched, starts ${s.campaign.start_date}`
                        : ' · live'
                      : ' · approved, not live yet'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button className="lg:hidden" onClick={() => setChatOpen(true)}>
                  {s.pending?.length
                    ? `Mia's ${s.pending.length} change${s.pending.length === 1 ? '' : 's'} to apply`
                    : 'Chat with Mia'}
                </Button>
                {s.campaign.building ? (
                  <Button
                    variant="ghost"
                    loading={build.busy === 'discard'}
                    disabled={s.plan_run?.status === 'running'}
                    title={s.plan_run?.status === 'running' ? 'Wait for Mia to finish the plan' : undefined}
                    onClick={async () => {
                      if (!window.confirm('Discard this draft? The brief and plan are deleted.')) return
                      if (await build.discard()) navigate('/home')
                    }}
                  >
                    Discard draft
                  </Button>
                ) : null}
                {!s.campaign.building && !s.campaign.on_home && sessionId && activeWorkspace ? (
                  // approve never puts a campaign on home; going live does when nothing current is there (2 Nov)
                  <Button
                    variant="ghost"
                    title="Show this campaign's targets and numbers in the tracker on the home page"
                    onClick={async () => {
                      try {
                        await showOnHome(sessionId, activeWorkspace.tenant_id, s.campaign.campaign_id)
                        clearTrackerCache()
                        build.reload()
                        setFlash('This campaign now shows on the home page.')
                      } catch (e) {
                        setFlash((e as Error).message)
                      }
                    }}
                  >
                    Show on home
                  </Button>
                ) : null}
                {step && states ? null : ( // while a draft, the way on is in Up next, below (28 Oct)
                  <Button variant="primary" onClick={() => go(s.next_step.tab === 'launch' ? 'studio' : s.next_step.tab)}>
                    Next: {s.next_step.label}
                  </Button>
                )}
              </div>
            </header>
            {step && states ? <UpNext state={s} states={states} step={step} onGo={goStep} /> : null}
            {flash ? (
              <p role="status" className="rounded-lg border border-brand bg-primary px-3 py-2 paragraph-sm text-primary">
                {flash}
              </p>
            ) : null}
            {step && states ? (
              <StepRail states={states} step={step} onGo={goStep} steps={steps} />
            ) : (
            <nav className="flex flex-wrap gap-1 border-b border-secondary" aria-label="Campaign">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  disabled={'soon' in t}
                  aria-current={tab === t.key || (t.key === 'studio' && tab === 'launch') ? 'page' : undefined}
                  onClick={() => go(t.key)}
                  className={`px-3 py-2 paragraph-sm border-b-2 -mb-px ${
                    tab === t.key || (t.key === 'studio' && tab === 'launch') ? 'border-brand text-primary' : 'border-transparent text-tertiary hover:text-primary'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  title={'soon' in t ? 'Coming in the next build step' : undefined}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            )}
            {build.error && !/^(apply|drop|fix):/.test(build.errorAt ?? '') ? (
              // a card's Apply or Not now says why under that card, in the chat and on its finding (28 Oct)
              <Card warn className="flex items-center justify-between gap-3 paragraph-sm text-primary">
                {build.error}
                <button type="button" className="paragraph-xs text-tertiary" onClick={build.clearError}>
                  Dismiss
                </button>
              </Card>
            ) : null}
            {step && states ? (
              <StepView
                step={step}
                states={states}
                s={s}
                build={build}
                onGo={goStep}
                onApproved={() => go('studio')}
                scrollTop={() => pageScroll.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              />
            ) : tab === 'results' ? (
              <ResultsTab campaignId={campaignId} approved={!s.campaign.building} bpo={s.campaign.client_type === 'bpo'} />
            ) : tab === 'studio' || tab === 'launch' ? (
              <StudioTab campaignId={campaignId} approved={!s.campaign.building} onChanged={() => build.reload()} />
            ) : tab === 'plan' ? (
              <PlanTab state={s} kpiGroups={build.kpiGroups} kpiError={build.kpiError} busy={build.busy} onEdit={build.editPlan} onMakePlan={build.makePlan} onApprove={async (pastFindings?: boolean) => {
                  // Approved: the next step is sending the jobs, so go to the Studio tab (live test 18 Oct).
                  const out = await build.approve(pastFindings)
                  pageScroll.current?.scrollTo({ top: 0, behavior: 'smooth' })
                  if (out !== undefined) go('studio')
                  return out
                }} onWriteWords={build.writeWords} onSaveBrief={build.saveBrief} onReprice={build.reprice}
                onKeepPlan={build.keepPlan} />
            ) : (
              <BriefTab
                state={s}
                kpiGroups={build.kpiGroups}
                busy={build.busy}
                onSave={build.saveBrief}
                onRedraft={build.redraft}
                onMakePlan={async () => {
                  const out = await build.makePlan()
                  if (out) go('plan')
                }}
              />
            )}
          </div>
        )}
      </div>
      {s ? (
        <div
          className={`${chatOpen ? 'fixed inset-0 z-40 flex flex-col' : 'hidden'} lg:static lg:z-auto lg:flex lg:w-[380px] lg:shrink-0`}
        >
          {chatOpen ? (
            <button
              type="button"
              className="lg:hidden border-b border-secondary bg-primary px-4 py-2 text-left paragraph-sm text-secondary"
              onClick={() => setChatOpen(false)}
            >
              ← Back to the campaign
            </button>
          ) : null}
          <div className="flex-1 min-h-0">
            <CampaignChat
              campaignId={campaignId}
              conversationId={s.conversation_id}
              pending={s.pending ?? []}
              busy={build.busy}
              error={build.error}
              errorAt={build.errorAt}
              onApply={build.applyChange}
              onDrop={build.dropChange}
              answerUndo={s.answer_undo ?? null}
              onUndoAnswer={build.undoAnswer}
              answerNotes={s.answer_notes ?? []}
              readingAnswers={s.reading_answers ?? 0}
              onChanged={() => {
                fromChat.current = true
              }}
            />
          </div>
        </div>
      ) : null}
      </div>
    </div>
  )
}

// One step of the draft: its part of the brief or the plan, then the way on.
function StepView({
  step,
  states,
  s,
  build,
  onGo,
  onApproved,
  scrollTop,
}: {
  step: StepKey
  states: ReturnType<typeof stepStates>
  s: NonNullable<ReturnType<typeof useBuild>['state']>
  build: ReturnType<typeof useBuild>
  onGo: (k: StepKey) => void
  onApproved: () => void
  scrollTop: () => void
}) {
  const steps = stepsFor(s)
  const i = Math.max(0, steps.findIndex((st) => st.key === step))
  const meta = steps[i]
  const next = steps[i + 1]
  const nextOpen = next && states[step] === 'done'
  const left = steps.filter((st) => st.key !== 'check' && states[st.key] !== 'done')
  const [context, setContext] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      {/* No step header: the rail names the step (local test 27 Oct: "Step 2 of 6 / Mia's questions / …" repeated it,
          and lagged behind it). The page opens on the thing to do. */}
      <h2 className="sr-only">{meta.label}</h2>
      {step === 'check' && left.length ? (
        // One quiet line, not a second to-do list (screen walk 23 Nov: "Still to do" with four Go to buttons sat above
        // Your turn): Up next above names the first step to finish and goes there; the rail shows the rest.
        <p className="paragraph-sm text-secondary">
          Approve opens once {left.map((st) => st.label).join(', ').replace(/, ([^,]*)$/, ' and $1')}{' '}
          {left.length === 1 ? 'is' : 'are'} done.
        </p>
      ) : null}
      {step === 'facts' ? (
        <BriefTab
          key={step}
          part="facts"
          state={s}
          kpiGroups={build.kpiGroups}
          busy={build.busy}
          onSave={build.saveBrief}
          onRedraft={build.redraft}
          onSkipQuestion={build.skipQuestion}
          onKeepPlan={build.keepPlan}
          onConfirm={build.confirmBrief}
          onMakePlan={async () => {
            const out = await build.makePlan()
            if (out) onGo('questions')
            return out
          }}
        />
      ) : (
        <PlanTab
          key={step}
          part={step as PlanPart}
          state={s}
          kpiGroups={build.kpiGroups}
          kpiError={build.kpiError}
          busy={build.busy}
          onEdit={build.editPlan}
          onMakePlan={build.makePlan}
          onApprove={async (pastFindings?: boolean) => {
            const out = await build.approve(pastFindings)
            scrollTop()
            if (out !== undefined) onApproved()
            return out
          }}
          onWriteWords={build.writeWords}
          onSaveBrief={build.saveBrief}
          onReprice={build.reprice}
          onKeepPlan={build.keepPlan}
          onSkipQuestion={build.skipQuestion}
          onFinalCheck={build.finalCheck}
          onFillTargets={build.fillTargets}
          onApplyChange={build.applyChange}
          onDropChange={build.dropChange}
          onFixFinding={build.fixFinding}
          cardError={build.errorAt && /^(apply|drop|fix):/.test(build.errorAt) ? { at: build.errorAt, error: build.error } : null}
        />
      )}
      {step === 'check' ? (
        // What you gave Mia, what she read, your words and the client's rules: one line for the last look (L2, L4; 20
        // Nov plan E: four more folds sat here)
        context ? (
          <BriefTab
            part="context"
            state={s}
            kpiGroups={build.kpiGroups}
            busy={build.busy}
            onSave={build.saveBrief}
            onRedraft={build.redraft}
            onMakePlan={build.makePlan}
          />
        ) : (
          <button type="button" onClick={() => setContext(true)} className="self-start text-left paragraph-sm font-medium text-secondary hover:text-primary">
            What Mia worked from <span className="font-normal text-tertiary">· your message, what she read, {s.campaign.client}'s rules</span>{' '}
            <span aria-hidden="true">›</span>
          </button>
        )
      ) : null}
      {/* No "Next:" bar at the bottom (screen walk 23 Nov, theme 4: two next buttons competed): a finished step moves
          on by itself, and Up next at the top is the one way on when the next thing is on another step. */}
      {next && nextOpen ? <p className="paragraph-sm text-utility-success-700">✓ {meta.label} done</p> : null}
    </div>
  )
}

export default CampaignBuilderPage
