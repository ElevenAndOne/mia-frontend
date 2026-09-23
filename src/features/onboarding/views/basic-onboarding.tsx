import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import {
  completeBasicOnboarding,
  fetchReadiness,
  linkFoundPage,
  startReading,
  type Readiness,
} from '../services/basic-onboarding-service'
import {
  confirmWhatsAppVerification,
  fetchWhatsAppNumber,
  startWhatsAppVerification,
} from '../../workspace/services/whatsapp-number-service'
import { StorageKey } from '../../../constants/storage-keys'

/**
 * Onboarding for a Basic workspace (docs2/BASIC_ONBOARDING.md).
 *
 * A separate view from the scripted chat, on purpose. That flow connects ad accounts and
 * explains a spend insight — the wrong conversation entirely with the owner of a golf club
 * who has a Page and no budget. This is five steps with one decision each, which is a
 * different shape from a conversation and would only fight the chat machinery.
 *
 * **Phone-first.** Eight files in the whole frontend mention a breakpoint and onboarding had
 * none, so this is where the habit gets set: one column, full-width controls, nothing that
 * needs two hands. The desktop version is the same thing with more margin.
 *
 * What it is actually for: filling the grounding the WhatsApp photo flow depends on — their
 * posts, how they sound, what's on this week. Skip that and the first photo comes back
 * generic, which is the one promise the tier makes.
 */

type StepId = 'pages' | 'details' | 'reading' | 'done'

const CARD = 'rounded-xl border border-primary bg-secondary p-4 flex flex-col gap-3'
const FIELD =
  'w-full rounded-lg border border-primary bg-primary px-3 py-2.5 paragraph-sm text-primary placeholder:text-quaternary'
const PRIMARY =
  'w-full rounded-lg bg-brand-solid px-4 py-3 paragraph-sm font-semibold text-white disabled:opacity-50'
const QUIET = 'w-full rounded-lg px-4 py-2.5 paragraph-sm text-tertiary'

// The read is three Meta calls and a model call, so about a minute is honest. These are the
// two points after it where waiting stops being useful: say something at the first, stop
// waiting at the second. Nobody should ever be able to sit on this screen indefinitely —
// that is exactly what happened when completion depended on an optional step.
const SAY_ITS_SLOW_MS = 45_000
const STOP_WAITING_MS = 120_000

// Reading the verification code means leaving for WhatsApp, and a phone will discard the
// browser tab while you are gone. Everything here lived in component state, so coming back
// meant starting at "That's them" and typing the number again — which is the point in the
// flow people are least willing to repeat.
//
// Only the step and the typed website are kept here. Whether the Page is linked and whether
// the number is verified are asked of the server on mount, because those are facts about the
// workspace, not about this tab — and a resumed tab must not claim a number is confirmed
// because it once was in some earlier session.
const RESUME_WINDOW_MS = 6 * 60 * 60 * 1000

type Resume = { tenantId: string | null; step: StepId; website: string; ts: number }

const readResume = (tenantId: string | null | undefined): Resume | null => {
  try {
    const raw = localStorage.getItem(StorageKey.BASIC_ONBOARDING_PROGRESS)
    if (!raw) return null
    const saved = JSON.parse(raw) as Resume
    if (!saved?.step || Date.now() - (saved.ts || 0) > RESUME_WINDOW_MS) return null
    // Only this workspace's place. The store is per browser, not per workspace, so an
    // abandoned run earlier in the day would otherwise start the NEXT sign-up on the same
    // machine at step three — skipping "We found your pages" for a different business.
    if (saved.tenantId && tenantId && saved.tenantId !== tenantId) return null
    return saved
  } catch {
    return null
  }
}

const writeResume = (value: Omit<Resume, 'ts'>) => {
  try {
    localStorage.setItem(
      StorageKey.BASIC_ONBOARDING_PROGRESS,
      JSON.stringify({ ...value, ts: Date.now() })
    )
  } catch {
    // Private windows and blocked site data. Losing the place is the old behaviour, not a
    // reason to break onboarding.
  }
}

const clearResume = () => {
  try {
    localStorage.removeItem(StorageKey.BASIC_ONBOARDING_PROGRESS)
  } catch {
    /* see above */
  }
}

interface Props {
  onComplete: () => void
  onConnectPlatform: (platformId: string) => void
}

export const BasicOnboarding = ({ onComplete, onConnectPlatform }: Props) => {
  const { sessionId, activeWorkspace } = useSession()
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const resumed = useRef(readResume(activeWorkspace?.tenant_id))
  const [step, setStep] = useState<StepId>(() => resumed.current?.step ?? 'pages')
  const [website, setWebsite] = useState(() => resumed.current?.website ?? '')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [readingSince, setReadingSince] = useState<number | null>(null)
  const [waited, setWaited] = useState(0)
  // The number is a claim until a code comes back. Until this slice it was typed, held in
  // state and then dropped on Continue — the screen promised a code that was never sent.
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [waError, setWaError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [checking, setChecking] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    const r = await fetchReadiness(sessionId)
    setReadiness(r)
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Remember where they are, so a tab the phone discarded while they read the code in
  // WhatsApp comes back to the same screen.
  useEffect(() => {
    if (step === 'done') return
    writeResume({ tenantId: activeWorkspace?.tenant_id ?? null, step, website })
  }, [step, website, activeWorkspace?.tenant_id])

  // What is actually true about the number — asked of the server, not remembered from a
  // previous tab. A resumed session must never *claim* a number is confirmed; if it is,
  // the workspace says so.
  useEffect(() => {
    if (!sessionId) return
    let live = true
    fetchWhatsAppNumber(sessionId)
      .then((state) => {
        if (!live || !state || state.unavailable) return
        if (state.whatsapp_number) setWhatsapp((w) => w || state.whatsapp_number || '')
        if (state.verified) {
          setCodeSent(true)
          setConfirmed(true)
        } else if (state.awaiting_code) {
          setCodeSent(true)
        }
      })
      .catch(() => {
        // Nothing to restore. The screen still works from scratch.
      })
    return () => {
      live = false
    }
  }, [sessionId])

  // Leave the questions behind and start the read. Called from every exit out of this step —
  // confirmed, skipped, or the code could not be sent — so there is one place that decides
  // what "moving on" means.
  const proceed = useCallback(async () => {
    if (!sessionId) return
    setStarting(true)
    // Move on regardless of what the call returns. The read is the product being made, but
    // a client who cannot start it should still reach their home page rather than being
    // held on a button that will not budge.
    await startReading(sessionId, website)
    setStarting(false)
    setStep('reading')
  }, [sessionId, website])

  // The reading step polls, because it is doing real work — the organic read, the brand
  // guide and the website. A spinner that finishes on a timer would be a lie about whether
  // the posts Mia is about to write have anything behind them.
  useEffect(() => {
    if (step !== 'reading') {
      setReadingSince(null)
      setWaited(0)
      return
    }
    const started = Date.now()
    setReadingSince(started)
    const t = setInterval(() => {
      setWaited(Date.now() - started)
      void refresh()
    }, 5000)
    return () => clearInterval(t)
  }, [step, refresh])

  // What "finished" means. The voice is the last thing the read does, so it is the signal —
  // and the website only counts if they actually gave one, because a skipped question has
  // nothing to wait for. Completion used to require every step, which made this screen
  // unreachable for anyone who left the website blank.
  // Never show "Connect your Page" to somebody whose Page is already attached — a resumed
  // tab would otherwise walk them back through a step the workspace has finished.
  useEffect(() => {
    if (step === 'pages' && readiness?.page?.linked && resumed.current) setStep('details')
  }, [step, readiness])

  const stepDone = (key: string) => !!readiness?.steps?.find((s) => s.key === key)?.done
  const askedForWebsite = website.trim().length > 0
  const readFinished = stepDone('brand') && (!askedForWebsite || stepDone('website'))
  const slow = readingSince !== null && waited > SAY_ITS_SLOW_MS

  useEffect(() => {
    if (step !== 'reading') return
    if (readFinished || waited > STOP_WAITING_MS) setStep('done')
  }, [step, readFinished, waited])

  const page = readiness?.page
  const instagram = readiness?.instagram

  return (
    <div className="min-h-full bg-primary px-4 py-8 flex justify-center">
      <div className="w-full max-w-[26rem] flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <p className="paragraph-xs text-quaternary uppercase tracking-widest">
            Setting up {page?.name ?? 'your workspace'}
          </p>
          <h1 className="heading-sm text-primary">
            {/* Only say we found them when we did. The heading used to claim a find over a
                screen asking them to connect, which reads as the app being broken. */}
            {step === 'pages' && (page ? 'We found your pages' : 'Connect your Page')}
            {step === 'details' && 'Two quick things'}
            {step === 'reading' && 'Reading your pages…'}
            {step === 'done' && "That's everything"}
          </h1>
        </header>

        {loading && <p className="paragraph-sm text-tertiary">One moment…</p>}

        {/* ---- pages: pre-selected, one tap confirms -------------------- */}
        {!loading && step === 'pages' && (
          <div className={CARD}>
            {page ? (
              <>
                <Row label={`${page.name} · Facebook`} ok />
                {instagram?.publishable ? (
                  <Row label={`${instagram.username} · Instagram`} ok />
                ) : (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-primary p-3">
                    <p className="paragraph-sm text-primary">No Instagram connected</p>
                    {/* Said here rather than at publish time. No permission can post to a
                        personal account, and finding that out at the moment someone approves
                        a post is the worst possible time. */}
                    <p className="paragraph-xs text-tertiary">
                      Mia can post to Facebook either way. To add Instagram, it needs to be a
                      Business or Creator account linked to this Page — it's free and takes two
                      minutes in the Instagram app.
                    </p>
                  </div>
                )}
                {/* Confirming is what attaches it. A Page found at sign-up is held against
                    the person, not the workspace, until they say yes to it here. */}
                <button
                  type="button"
                  className={PRIMARY}
                  disabled={confirming}
                  onClick={async () => {
                    if (page.linked) {
                      setStep('details')
                      return
                    }
                    setConfirming(true)
                    const ok = await linkFoundPage(sessionId || '', page, instagram)
                    setConfirming(false)
                    if (ok) await refresh()
                    setStep('details')
                  }}
                >
                  {confirming ? 'Connecting…' : "That's them"}
                </button>
              </>
            ) : (
              <>
                <p className="paragraph-sm text-tertiary">
                  Connect the Facebook Page you post from. Mia reads what you've already posted
                  so your first drafts sound like you, not like anyone.
                </p>
                {/* Instagram comes through the Page, and this is the only screen that says
                    so. Someone who signed up to post to Instagram needs to see it named
                    here, not discover at the end that we only ever asked about Facebook. */}
                <p className="paragraph-xs text-tertiary">
                  Instagram comes with it, if yours is a Business or Creator account linked to
                  the Page.
                </p>
                {/* Signing in asked for their name and nothing else, which is why Facebook
                    asks a second time here. Said plainly, because an unexplained second
                    consent screen looks like the first one failed. */}
                <p className="paragraph-xs text-quaternary">
                  Facebook asks separately for permission to read a Page — signing in only
                  told us who you are.
                </p>
                <button
                  type="button"
                  className={PRIMARY}
                  onClick={() => onConnectPlatform('meta')}
                >
                  Continue with Facebook
                </button>
              </>
            )}
          </div>
        )}

        {/* ---- the two questions --------------------------------------- */}
        {!loading && step === 'details' && (
          <div className="flex flex-col gap-4">
            <div className={CARD}>
              <label htmlFor="ob-website" className="paragraph-sm font-semibold text-primary">
                Your website
              </label>
              <input
                id="ob-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="humewood.co.za"
                inputMode="url"
                className={FIELD}
              />
              <p className="paragraph-xs text-tertiary">
                Optional — but it's where your colours, your fonts and what's on this week come
                from. It's the difference between a post that sounds like you and one that
                sounds like anyone.
              </p>
            </div>

            <div className={CARD}>
              <label htmlFor="ob-whatsapp" className="paragraph-sm font-semibold text-primary">
                Your WhatsApp number
              </label>
              <input
                id="ob-whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="071 164 4526"
                inputMode="tel"
                className={FIELD}
              />
              {/* Required, because for a Basic workspace this IS the product. Finishing
                  without it leaves someone holding an app they were never meant to live in. */}
              <p className="paragraph-xs text-tertiary">
                This is how Mia works: send a photo, get two finished posts back. We'll text you
                a code to check it's your phone.
              </p>
              {codeSent ? (
                <>
                  <p className="paragraph-xs text-tertiary">
                    We sent a six-digit code to {whatsapp.trim()} on WhatsApp.
                  </p>
                  <input
                    id="ob-wa-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className={FIELD}
                  />
                  {confirmed && (
                    <p className="paragraph-xs text-tertiary">Confirmed — Mia can reach you.</p>
                  )}
                </>
              ) : null}
              {waError && <p className="paragraph-xs text-quaternary">{waError}</p>}
            </div>

            {/* One button, and it always does the thing the screen is waiting for.
                Splitting it — a purple Continue beside a muted "Confirm this number" —
                meant the prominent action skipped verification, so the code went out, was
                never confirmed, and Mia stayed silent. The obvious press must be the right
                one; skipping is a deliberate choice underneath. */}
            <button
              type="button"
              className={PRIMARY}
              disabled={!whatsapp.trim() || starting || checking}
              onClick={async () => {
                if (!sessionId) return

                // Nothing sent yet: send the code and stay on this screen.
                if (!codeSent) {
                  setStarting(true)
                  try {
                    await startWhatsAppVerification(sessionId, whatsapp.trim())
                    setCodeSent(true)
                  } catch (e) {
                    // Not a reason to hold up onboarding — WhatsApp is served to pilot
                    // workspaces only, and everything else here works without it.
                    setWaError(e instanceof Error ? e.message : 'Could not send the code')
                    await proceed()
                  }
                  setStarting(false)
                  return
                }

                // A code is typed and not yet confirmed: confirm it, then carry on.
                if (!confirmed && code.trim().length >= 4) {
                  setWaError(null)
                  setChecking(true)
                  try {
                    await confirmWhatsAppVerification(sessionId, code.trim())
                    setConfirmed(true)
                    setChecking(false)
                    await proceed()
                  } catch (e) {
                    setWaError(e instanceof Error ? e.message : 'That code did not work')
                    setChecking(false)
                  }
                  return
                }

                await proceed()
              }}
            >
              {checking
                ? 'Checking…'
                : starting
                  ? 'Sending…'
                  : !codeSent
                    ? 'Send me the code'
                    : !confirmed && code.trim().length >= 4
                      ? 'Confirm and carry on'
                      : 'Continue'}
            </button>
            {!whatsapp.trim() && (
              <p className="paragraph-xs text-quaternary text-center">
                A number is needed to finish — it's where Mia does the work.
              </p>
            )}
            {codeSent && !confirmed && (
              <button
                type="button"
                className={QUIET}
                onClick={() => void proceed()}
              >
                Skip for now — I'll confirm in Settings
              </button>
            )}
          </div>
        )}

        {/* ---- reading: real progress, never a spinner ----------------- */}
        {!loading && step === 'reading' && (
          <div className={CARD}>
            {(readiness?.steps ?? []).map((s) => (
              <Row key={s.key} label={s.label} detail={s.detail} ok={s.done} pending={!s.done} />
            ))}
            <p className="paragraph-xs text-tertiary">
              About a minute. You can close this — Mia will message you on WhatsApp when it's
              done.
            </p>
            {/* Never a dead end. If the read is slow or has failed, the workspace still
                works — the drafting reads their post history directly either way — so
                holding them here helps nobody. */}
            {slow && (
              <>
                <p className="paragraph-xs text-quaternary">
                  This is taking longer than usual. Everything below that's already ticked is
                  saved, and the rest will finish on its own.
                </p>
                <button type="button" className={QUIET} onClick={() => setStep('done')}>
                  Carry on without waiting
                </button>
              </>
            )}
          </div>
        )}

        {/* ---- done ---------------------------------------------------- */}
        {!loading && step === 'done' && (
          <div className="flex flex-col gap-4">
            <div className={CARD}>
              {/* An optional step that did not happen is not a failure, and an unticked row
                  with no explanation reads as one. Say which it was: a question they
                  skipped, or something that can still be added later. */}
              {(readiness?.steps ?? []).map((s) => (
                <Row
                  key={s.key}
                  label={s.label}
                  detail={
                    s.done
                      ? s.detail
                      : s.key === 'website' && !askedForWebsite
                        ? 'You skipped this — you can add it any time in Settings.'
                        : s.detail
                  }
                  ok={s.done}
                />
              ))}
            </div>
            {!readiness?.fully_grounded && (
              <p className="paragraph-xs text-quaternary text-center">
                Nothing unticked stops Mia working — it only makes the first posts better.
              </p>
            )}
            {/* Settle the experience before the shell renders. Which sidebar someone sees
                is decided by the workspace, so it has to be written down first — this used
                to navigate and save nothing, and a solo client arrived to the full agency
                navigation. */}
            <button
              type="button"
              className={PRIMARY}
              disabled={finishing}
              onClick={async () => {
                setFinishing(true)
                if (sessionId) await completeBasicOnboarding(sessionId)
                clearResume()
                onComplete()
              }}
            >
              {finishing ? 'One moment…' : 'Take me in'}
            </button>
          </div>
        )}

        {step === 'details' && (
          <button type="button" className={QUIET} onClick={() => setStep('pages')}>
            Back
          </button>
        )}
      </div>
    </div>
  )
}

const Row = ({
  label,
  detail,
  ok,
  pending,
}: {
  label: string
  detail?: string
  ok?: boolean
  pending?: boolean
}) => (
  <div className="flex items-start gap-3 rounded-lg border border-primary p-3">
    <span
      aria-hidden
      className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border ${
        ok ? 'border-transparent bg-brand-solid' : 'border-primary'
      } ${pending && !ok ? 'animate-pulse' : ''}`}
    />
    <span className="flex flex-col gap-0.5 min-w-0">
      <span className="paragraph-sm text-primary">{label}</span>
      {detail && <span className="paragraph-xs text-tertiary">{detail}</span>}
    </span>
  </div>
)

export default BasicOnboarding
