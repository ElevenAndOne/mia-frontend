import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle } from '../../../components/icon/alert-triangle'
import type { BuildRun } from '../types'

// Small shared pieces of the campaign page. "Needs you" items always use the same amber
// pattern (plan §8.2): ⚠ + words + amber border, from the utility-warning tokens that have
// dark-mode pairs, so colour is never the only signal.

/** What goes before an amount, as the server's numbers.money_sign writes it: R for rand (or unknown), $, €, £, A$, else
 *  the code ("KES 1,200"). */
export const moneySign = (currency?: string | null) =>
  ({ ZAR: 'R', USD: '$', EUR: '€', GBP: '£', AUD: 'A$' } as Record<string, string>)[(currency || 'ZAR').toUpperCase()] ?? `${currency} `

export const money = (v: number | null | undefined, currency?: string | null) =>
  v == null ? '—' : `${moneySign(currency)}${Math.round(v).toLocaleString('en-US')}`

export const day = (d: string | null | undefined) => {
  if (!d) return '—'
  const x = new Date(`${d.slice(0, 10)}T00:00:00`)
  return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// A piece of the final words, as the PM reads it: "ad.primary_text" → "Ad text", "slides[2]" → "Slide 3"
// (review 26 Nov, E14: the keys reached the screen)
const WORDS_WHERE: Record<string, string> = {
  'ad.primary_text': 'Ad text', 'ad.headline': 'Headline', 'ad.description': 'Description', 'ad.cta': 'Button',
  'email.subject': 'Email subject', 'email.preheader': 'Email preview line', 'email.body': 'Email body',
}
export const wordsWhere = (where: string) => {
  if (WORDS_WHERE[where]) return WORDS_WHERE[where]
  const m = where.match(/^(slides|captions|cards|rsa\.headlines|rsa\.descriptions)\[(\d+)\](?:\.(\w+))?$/)
  if (m) {
    const name = { slides: 'Slide', captions: 'Caption', cards: 'Card', 'rsa.headlines': 'Search headline', 'rsa.descriptions': 'Search description' }[m[1]]
    return `${name} ${Number(m[2]) + 1}`
  }
  const plain = where.replace(/[._]/g, ' ').replace(/\[(\d+)\]/g, (_x, n) => ` ${Number(n) + 1}`).trim()
  return plain.charAt(0).toUpperCase() + plain.slice(1)
}

export const num = (v: number | null | undefined) =>
  v == null ? '—' : Number.isInteger(v) ? v.toLocaleString('en-US') : v.toLocaleString('en-US', { maximumFractionDigits: 2 })

export const CHANNEL_LABELS: Record<string, string> = {
  meta_ads: 'Meta ads',
  google_ads: 'Google ads',
  linkedin_ads: 'LinkedIn ads',
  tiktok_ads: 'TikTok ads',
  youtube_ads: 'YouTube ads',
  programmatic: 'Programmatic',
  organic_social: 'Organic social',
  linkedin_organic: 'LinkedIn organic',
  tiktok_organic: 'TikTok organic',
  influencer: 'Influencers',
  email: 'Email',
  website: 'Website',
}
// A BPO campaign's one list of work (plan_generator.BPO_PHASE, 24 Nov): never shown as a phase
export const BPO_PHASE = 'Deliverables'
/** "Reach · " before a job's channel, or nothing for a BPO campaign's one list */
export const phaseTag = (phase?: string | null) => (phase && phase !== BPO_PHASE ? `${phase} · ` : '')

export const channelLabel = (c: string) => {
  const t = CHANNEL_LABELS[c] ?? c.replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function NeedsYou({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-utility-warning-300 bg-utility-warning-100 px-2 py-0.5 label-xs text-utility-warning-700">
      <AlertTriangle size={12} />
      {children}
    </span>
  )
}

// Links and web addresses in Mia's or the PM's text open in a new tab (test 24 Nov: a landing page link was plain text).
const LINK = /(https?:\/\/[^\s<>()]+|\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:co\.za|com|org|net|io|ai|za|co|uk)(?:\/[^\s<>()]*)?)/gi

export function Linked({ text }: { text: string }) {
  const parts = text.split(LINK)
  if (parts.length === 1) return <>{text}</>
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return p
        const clean = p.replace(/[.,;:!?)]+$/, '')
        const rest = p.slice(clean.length)
        const href = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`
        return (
          <span key={i}>
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand"
               onClick={(e) => e.stopPropagation()}>
              {clean}
            </a>
            {rest}
          </span>
        )
      })}
    </>
  )
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'pm' | 'mia' | 'good' }) {
  const cls = {
    neutral: 'bg-tertiary text-secondary',
    pm: 'bg-brand-solid text-primary-onbrand',
    mia: 'bg-secondary text-secondary border border-secondary',
    good: 'bg-success-primary text-success',
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 label-xs ${cls}`}>{children}</span>
}

export function Card({ children, className = '', warn = false, id }: { children: ReactNode; className?: string; warn?: boolean; id?: string }) {
  return (
    <section
      id={id}
      // The settings look (19 Nov 2026): a raised panel with a thin border and a faint shadow.
      className={`rounded-xl bg-primary p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${warn ? 'border-2 border-utility-warning-300' : 'border border-secondary'} ${className}`}
    >
      {children}
    </section>
  )
}

// Progress you can trust (local test 27 Oct: a still spinner for 5 to 15 minutes looked frozen): a bar filled by the
// run's real stages ("3 of 7: Writing the jobs…"), and a clock that ticks, so it moves even with animations off.
// Each step's share of a run and its usual length in seconds (rough, from local runs, 24 Nov: writing the jobs is
// about half of a plan). The bar fills smoothly inside a step towards the next step's start and never passes it, so it
// moves all the time without running ahead of the real step (Josh, 24 Nov: "a smooth real-time bar").
const STEP_ORDER: Record<string, string[]> = {
  // questions, estimates and the facts check run together now, under "questions" (review 26 Nov, §7)
  plan: ['reading', 'options', 'choosing', 'jobs', 'questions', 'checks'],
  brief: ['reading', 'brief'],
}
const STEP_SHARE: Record<string, number> = { reading: 4, brief: 6, options: 18, choosing: 10, jobs: 42, questions: 18, estimates: 8, facts: 6, checks: 2 }
const STEP_SECONDS: Record<string, number> = { reading: 30, brief: 40, options: 150, choosing: 90, jobs: 360, questions: 60, estimates: 60, facts: 35, checks: 10 }

function smoothShare(kind: string, stage: string | null, secsInStage: number): number | null {
  const order = STEP_ORDER[kind]
  if (!order || !stage) return null
  const i = order.indexOf(stage)
  if (i < 0) return null
  const total = order.reduce((n, s) => n + (STEP_SHARE[s] ?? 1), 0)
  const before = order.slice(0, i).reduce((n, s) => n + (STEP_SHARE[s] ?? 1), 0)
  const share = STEP_SHARE[stage] ?? 1
  // eases towards 95% of this step: quick at first, slowing as the step runs long, never past the next step's start
  const inStep = 1 - Math.exp(-secsInStage / (STEP_SECONDS[stage] ?? 60))
  return Math.min(99, ((before + share * 0.95 * inStep) / total) * 100)
}

export function RunProgress({ run, what }: { run: BuildRun; what: string }) {
  const [now, setNow] = useState(() => Date.now())
  // when this page first saw the current step (the server keeps the step, not when it started)
  const [stepSeen, setStepSeen] = useState<{ stage: string | null; at: number }>(() => ({ stage: run.stage, at: Date.now() }))
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (stepSeen.stage !== run.stage) setStepSeen({ stage: run.stage, at: Date.now() })
  const started = run.started_at ? Date.parse(run.started_at) : NaN
  const secs = Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : null
  const at = run.stage_at ?? null
  const of = run.stage_of ?? null
  const kind = what === 'plan' ? 'plan' : what === 'brief' ? 'brief' : ''
  const smooth = smoothShare(kind, run.stage, Math.max(0, (now - stepSeen.at) / 1000))
  // other runs: a stage under way counts as half done, so the bar never sits at 0 or reaches the end before the run does
  const pct = smooth ?? (at && of ? Math.round(((at - 0.5) / of) * 100) : null)
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-3" role="status">
        <span
          aria-hidden="true"
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent text-secondary"
        />
        <div className="min-w-0 flex-1">
          <p className="subheading-sm text-primary">Mia is making the {what}</p>
          <p className="paragraph-sm text-tertiary">
            {at && of ? `${at} of ${of}: ` : ''}
            {run.stage_label ?? 'Starting'}…
          </p>
        </div>
        {secs != null ? (
          <span className="paragraph-sm tabular-nums text-tertiary">
            {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
          </span>
        ) : null}
      </div>
      {pct != null ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-tertiary" aria-hidden="true">
          <div className="h-full rounded-full bg-brand-solid transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      <p className="paragraph-xs text-tertiary">
        {/* real runs: 4 to 11 minutes on live (Nov 2026), 10 and 14+ minutes on the DFSA tests (24 Nov) */}
        {what === 'plan' ? 'Usually 10 to 20 minutes. You can leave the page; it keeps going.' : 'About a minute or two.'}
      </p>
    </Card>
  )
}

export function RunFailed({ run, what, onRetry, busy }: { run: BuildRun; what: string; onRetry: () => void; busy: boolean }) {
  return (
    <Card warn className="flex flex-wrap items-center justify-between gap-3">
      <p className="paragraph-sm text-primary">
        {run.stale ? `Making the ${what} was interrupted (the server restarted).` : `Mia couldn't make the ${what}.`}
        {run.error && !run.stale ? <span className="block text-tertiary paragraph-xs mt-1">{run.error}</span> : null}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={busy}
        className="rounded-lg border border-secondary bg-secondary px-3 py-1.5 paragraph-sm text-primary hover:bg-tertiary disabled:opacity-50"
      >
        Try again
      </button>
    </Card>
  )
}
