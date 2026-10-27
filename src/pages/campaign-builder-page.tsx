import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/button'
import { TopBar } from '../components/top-bar'
import { useSession } from '../contexts/session-context'
import { readDeck, startBuild, type DeckRead } from '../features/campaign-builder/api'
import { CampaignChat } from '../features/campaign-builder/campaign-chat'
import { BriefTab } from '../features/campaign-builder/components/brief-tab'
import { Card, day, money } from '../features/campaign-builder/components/parts'
import { PlanTab, type PlanPart } from '../features/campaign-builder/components/plan-tab'
import { StepRail } from '../features/campaign-builder/components/builder-steps'
import { STEPS, currentStep, stepStates, type StepKey } from '../features/campaign-builder/components/steps'
import { ASK_EVENT } from '../features/campaign-builder/components/your-turn'
import { DoNext } from '../features/campaign-builder/components/do-next'
import { StudioTab } from '../features/campaign-builder/components/studio-tab'
import { ResultsTab } from '../features/campaign-builder/components/results-tab'
import { useBuild } from '../features/campaign-builder/use-build'

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

// The server's limit on the documents' text (StartRequest.deck_text), and what the brief reads of it (brief.py).
const MAX_SOURCE_CHARS = 200_000
const BRIEF_READS_CHARS = 60_000

// The documents as the one text the server reads. One file reads exactly as before; several are each opened by the
// line services/campaign_builder/deck.py FILE_MARK looks for, so every later step keeps a share of each one.
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
  const deckText = sourceText(files, deck)
  const tooLong = deckText.length > MAX_SOURCE_CHARS

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
        breadcrumbs={[{ label: 'Home', to: '/home' }, { label: 'New campaign' }]}
        onBack={() => navigate('/home')}
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
                  : "Add the client's deck or brief (PDF, PowerPoint, Word or Markdown); you can add several"}
              <input
                type="file"
                multiple
                className="sr-only"
                accept=".pdf,.pptx,.docx,.txt,.md,.html,.htm"
                disabled={!!reading}
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? [])
                  e.target.value = ''
                  if (picked.length) addFiles(picked)
                }}
              />
            </label>
            {files.length > 1 && !tooLong && deckText.length > BRIEF_READS_CHARS ? (
              <p className="paragraph-xs text-tertiary">
                Together these are long, so Mia reads each one in part (every document gets its share; none is left out).
              </p>
            ) : null}
            {tooLong ? (
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
  const s = build.state
  const go = (t: string) => navigate(`/campaign-builder/${campaignId}/${t}`)
  const [chatOpen, setChatOpen] = useState(false) // phones and narrow windows; always shown on wide screens
  // Ask Mia on a narrow screen opens the chat, so her reply and its cards are seen (review 22 Oct, 5.2)
  useEffect(() => {
    const open = () => setChatOpen(true)
    window.addEventListener(ASK_EVENT, open)
    return () => window.removeEventListener(ASK_EVENT, open)
  }, [])
  const [flash, setFlash] = useState<string | null>(null)
  const seen = useRef<{ brief?: number; plan?: string }>({})
  const fromChat = useRef(false)
  const pageScroll = useRef<HTMLDivElement>(null)
  // While the campaign is a draft, the page is six steps; after Approve, the tabs (Studio & launch, Results).
  const states = s ? stepStates(s) : null
  const stepKeys = STEPS.map((st) => st.key) as string[]
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
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 8000)
    return () => clearTimeout(t)
  }, [flash])

  return (
    <div className="w-full h-dvh flex flex-col overflow-hidden bg-secondary">
      <TopBar
        title={s?.campaign.name ?? 'Campaign'}
        breadcrumbs={[{ label: 'Home', to: '/home' }, { label: 'Campaigns', to: '/campaign-builder' }, { label: s?.campaign.name ?? 'Campaign' }]}
        onBack={() => navigate('/home')}
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
                  {s.campaign.client} · {day(s.campaign.start_date)} – {day(s.campaign.end_date)} ·{' '}
                  {money(s.campaign.budget_total, s.campaign.currency)}
                  {s.campaign.building
                    ? ' · draft'
                    : s.campaign.status === 'live'
                      ? // launched before its start date: it isn't running yet (live test 18 Oct)
                        s.campaign.start_date && s.campaign.start_date > new Date().toISOString().slice(0, 10)
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
                {step && states ? (
                  // Only when you're looking at another step: on the step you're on, it would repeat it (L5).
                  step !== currentStep(states) ? (
                    <Button variant="primary" onClick={() => goStep(currentStep(states))}>
                      Back to {STEPS.find((st) => st.key === currentStep(states))?.label}
                    </Button>
                  ) : null
                ) : (
                  <Button variant="primary" onClick={() => go(s.next_step.tab === 'launch' ? 'studio' : s.next_step.tab)}>
                    Next: {s.next_step.label}
                  </Button>
                )}
              </div>
            </header>
            {flash ? (
              <p role="status" className="rounded-lg border border-brand bg-primary px-3 py-2 paragraph-sm text-primary">
                {flash}
              </p>
            ) : null}
            {step && states ? (
              <DoNext step={step} state={s} busy={build.busy} onMakePlan={build.makePlan} onKeepPlan={build.keepPlan}
                onRewrite={(ids) => build.writeWords(ids, true)} onGo={goStep} />
            ) : null}
            {step && states ? (
              <StepRail states={states} step={step} onGo={goStep} />
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
            {build.error ? (
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
              <ResultsTab campaignId={campaignId} approved={!s.campaign.building} />
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
              onApply={build.applyChange}
              onDrop={build.dropChange}
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
  const i = STEPS.findIndex((st) => st.key === step)
  const meta = STEPS[i]
  const next = STEPS[i + 1]
  const nextOpen = next && states[step] === 'done'
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="paragraph-xs text-tertiary">
          Step {i + 1} of {STEPS.length}{states[step] === 'recheck' ? ' · something earlier changed, check this again' : ''}
        </p>
        <h2 className="subheading-lg text-primary">{meta.label}</h2>
        <p className="paragraph-sm text-secondary">{meta.help}</p>
      </div>
      {step === 'check' ? (
        // What's left, by step, each with a way there; then Mia's final check and Approve below (live test 20 Oct).
        <Card className="flex flex-col gap-2">
          <h3 className="subheading-sm text-primary">Still to do</h3>
          {STEPS.filter((st) => st.key !== 'check' && states[st.key] !== 'done').length ? (
            <ul className="flex flex-col gap-1">
              {STEPS.filter((st) => st.key !== 'check' && states[st.key] !== 'done').map((st) => (
                <li key={st.key} className="flex flex-wrap items-center justify-between gap-2 paragraph-sm text-primary">
                  <span>
                    {st.label}
                    {states[st.key] === 'recheck' ? ' · recheck: something earlier changed' : states[st.key] === 'busy' ? ' · Mia is working on it' : ''}
                  </span>
                  <Button size="sm" onClick={() => onGo(st.key)}>
                    Go to {st.label}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="paragraph-sm text-secondary">Every step is done. Run Mia's final check, then approve.</p>
          )}
        </Card>
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
        />
      )}
      {step === 'check' ? (
        // What you gave Mia, what she read, your words and the client's rules: folded context for the last look (L2, L4).
        <BriefTab
          part="context"
          state={s}
          kpiGroups={build.kpiGroups}
          busy={build.busy}
          onSave={build.saveBrief}
          onRedraft={build.redraft}
          onMakePlan={build.makePlan}
        />
      ) : null}
      {next ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary pt-3">
          <p className="paragraph-xs text-tertiary">
            {nextOpen ? 'Done here. Go back to change anything; later steps follow.' : 'Finish this step to go on.'}
          </p>
          <Button variant="primary" disabled={!nextOpen} onClick={() => onGo(next.key)}>
            Next: {next.label}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default CampaignBuilderPage
