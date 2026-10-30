import { useState, type ReactNode } from 'react'
import { Button } from '../../../components/button'
import type { BuildState, Plan } from '../types'
import { Field } from './field'
import { Card, day, money, num } from './parts'

// The calmer page (19 Oct, docs2/CAMPAIGN_BUILDER_CALMER_UI_PLAN_2026-10-19.md): what the PM has to do comes
// first ("Your turn"), one line of facts under it, and the detail folds away with a one-line summary. Any item
// can be asked about: "Ask Mia" pins it to the campaign chat.

// ── Ask Mia about this ───────────────────────────────────────────────────────

export interface AskFocus {
  label: string // what the PM clicked, as the chip shows it ("Target · Reach · Click-through rate")
  detail?: string // the text of the item, so Mia knows exactly what is meant
  text?: string // what to send instead of the default question (an answer: "My answer: …")
}
export const ASK_EVENT = 'campaign-ask'
export const askMia = (focus: AskFocus) => window.dispatchEvent(new CustomEvent<AskFocus>(ASK_EVENT, { detail: focus }))

// The item being asked about is highlighted on the page until the next ask or the chip is cleared.
let focused: HTMLElement | null = null
export const clearFocus = () => {
  if (focused) {
    focused.style.outline = ''
    focused.style.outlineOffset = ''
    focused.style.borderRadius = ''
  }
  focused = null
}

export function AskMia({ label, detail, className = '' }: AskFocus & { className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        clearFocus()
        focused = e.currentTarget.closest<HTMLElement>('li, [data-ask-target]')
        if (focused) {
          focused.style.outline = '2px solid var(--color-border-brand)'
          focused.style.outlineOffset = '2px'
          focused.style.borderRadius = '10px'
        }
        askMia({ label, detail })
      }}
      className={`inline-flex items-center gap-1 rounded-full border border-brand px-2.5 py-1 label-xs text-brand-secondary hover:bg-brand-primary whitespace-nowrap ${className}`}
    >
      Ask Mia
    </button>
  )
}

// ── Folded section ───────────────────────────────────────────────────────────

export function Fold({
  id,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string
  title: string
  summary?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section id={id} className="rounded-xl border border-secondary bg-primary">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-secondary rounded-xl"
      >
        <span className="min-w-0">
          <span className="subheading-md text-primary">{title}</span>
          {summary ? <span className="paragraph-xs text-tertiary"> · {summary}</span> : null}
        </span>
        <span aria-hidden="true" className="text-tertiary text-lg leading-none">
          {open ? '–' : '+'}
        </span>
      </button>
      {open ? <div className="px-4 pb-4 flex flex-col gap-3">{children}</div> : null}
    </section>
  )
}

// ── One line of facts ────────────────────────────────────────────────────────

export function FactStrip({ state, plan }: { state: BuildState; plan: Plan }) {
  const c = state.campaign
  // In the campaign's own phase order (the database returns the keys in any order; live test 20 Oct).
  const raw = plan.decisions.budget_split?.value ?? {}
  const split = Object.fromEntries(
    [...plan.phases.map((p) => p.phase).filter((p) => p in raw), ...Object.keys(raw).filter((k) => !plan.phases.some((p) => p.phase === k))].map((k) => [k, raw[k]]),
  )
  const total = Object.values(split).reduce<number>((acc, v) => acc + (v ?? 0), 0) || c.budget_total || 0
  const shares = Object.entries(split)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k} ${total ? Math.round(((v as number) / total) * 100) : 0}%`)
    .join(' · ')
  const credits = plan.credits
  const words = plan.assets.filter((a) => a.final_words).length
  const flagged = plan.assets.filter((a) => a.final_words?.status === 'flagged').length
  const fit =
    credits?.status === 'fits' ? 'fits the sprints' : credits?.status === 'over' ? 'over in a sprint' : 'room unknown'
  const cells: [string, string, string][] = [
    ['Dates', c.start_date ? `${day(c.start_date)} – ${day(c.end_date)}` : 'not set', plan.assets.length ? `studio from ${day(firstDue(plan))}` : ''],
    ['Budget', c.budget_total != null ? money(c.budget_total, c.currency) : money(total || null, c.currency), shares],
    ['Studio', `${plan.assets.length} jobs · ${num(credits?.total_planned ?? 0)} cr`, `${fit}${credits?.estimated?.length ? ' (estimate)' : ''}`],
    [
      'Final words',
      words ? `${words} of ${plan.assets.length}` : 'not written',
      state.words_run?.status === 'running' ? 'writing now' : flagged ? `${flagged} to fix` : words ? 'all checked' : 'drafts for now',
    ],
  ]
  return (
    <dl className="grid grid-cols-2 @3xl:grid-cols-4 gap-px overflow-hidden rounded-xl border border-secondary bg-secondary">
      {cells.map(([k, v, s]) => (
        <div key={k} className="bg-primary px-4 py-3 min-w-0">
          <dt className="paragraph-xs text-tertiary">{k}</dt>
          <dd className="subheading-md text-primary tabular-nums [overflow-wrap:anywhere]">{v}</dd>
          {s ? <dd className="paragraph-xs text-tertiary [overflow-wrap:anywhere]">{s}</dd> : null}
        </div>
      ))}
    </dl>
  )
}

const firstDue = (plan: Plan) =>
  plan.assets.map((a) => a.due_date).filter((d): d is string => !!d).sort()[0] ?? null

// ── Your turn ────────────────────────────────────────────────────────────────

export interface TurnItem {
  key: string
  title: string
  detail?: ReactNode
  done?: boolean
  actions?: ReactNode
  more?: ReactNode // opens under the item (the list of jobs to fix, the questions)
  openByDefault?: boolean
}

export function YourTurn({ items, footer }: { items: TurnItem[]; footer?: ReactNode }) {
  const open = items.filter((i) => !i.done)
  // One thing at a time (local test 4, 30 Oct, Josh: "it mustnt just be a wall of text… like 1 at a time they can
  // address"): the item to do now is shown whole; every other one waits as a one-line row the PM can open instead.
  const [chosen, setChosen] = useState<string | null>(null)
  const current = open.find((i) => i.key === chosen) ?? open[0]
  // The item being done shows its list (the fixes, the questions) unless the PM hides it
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const isOpen = (k: string) => !hidden.has(k)
  const toggle = (k: string) => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n })
  if (!current) {
    // Nothing left: one quiet line instead of a list of crossed-out steps.
    return (
      <Card className="flex flex-wrap items-center justify-between gap-2 !py-3">
        <p className="paragraph-sm text-primary">
          <span aria-hidden="true" className="mr-2 inline-grid size-6 place-items-center rounded-full bg-success-primary text-success label-xs">✓</span>
          Nothing needs you here.
        </p>
        {footer ?? null}
      </Card>
    )
  }
  const rest = open.filter((i) => i.key !== current.key)
  const n = open.indexOf(current) + 1
  return (
    <Card className="!p-0 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-secondary px-4 py-3">
        {/* what to do, not how the list works (local test 27 Oct) */}
        <h2 className="min-w-0 subheading-md text-primary">Your turn</h2>
        <span className="paragraph-xs text-tertiary tabular-nums">
          {open.length === 1 ? '1 to do' : `${n} of ${open.length} to do`}
        </span>
      </div>
      <div className="bg-brand-primary px-4 py-3">
        <div className="grid grid-cols-[28px_1fr] @2xl:grid-cols-[28px_1fr_auto] items-center gap-x-3 gap-y-2">
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-full label-xs bg-brand-solid text-primary-onbrand">
            {n}
          </span>
          <div className="min-w-0">
            <p className="paragraph-sm font-medium text-primary">{current.title}</p>
            {current.detail ? <div className="paragraph-xs text-secondary">{current.detail}</div> : null}
          </div>
          {current.actions || current.more ? (
            <div className="col-start-2 @2xl:col-start-3 flex flex-wrap items-center gap-2 @2xl:justify-end">
              {current.actions}
              {current.more ? (
                <button type="button" aria-expanded={isOpen(current.key)} onClick={() => toggle(current.key)} className="paragraph-xs underline text-primary">
                  {isOpen(current.key) ? 'Hide' : 'Show'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {current.more && isOpen(current.key) ? <div className="mt-3 @2xl:pl-10">{current.more}</div> : null}
      </div>
      {rest.length ? (
        <div className="border-t border-secondary px-4 py-2">
          <p className="paragraph-xs text-tertiary">Then:</p>
          <ul className="flex flex-col">
            {rest.map((it) => (
              <li key={it.key}>
                {/* one line each; opening one makes it the item above (the list stays one at a time) */}
                <button
                  type="button"
                  onClick={() => setChosen(it.key)}
                  className="flex w-full items-center gap-2 py-1 text-left paragraph-xs text-secondary hover:text-primary"
                >
                  <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-tertiary label-xs text-secondary">
                    {open.indexOf(it) + 1}
                  </span>
                  <span className="min-w-0 truncate">{it.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {footer ? <div className="border-t border-secondary px-4 py-3">{footer}</div> : null}
    </Card>
  )
}

// A list worked through one at a time, "1 of 3" with Back and Next (local test 4, 30 Oct: three findings and three notes
// at once read as a wall). Each entry is whole on its own; the counter says how many are left.
export function OneAtATime({ entries, noun = 'item' }: { entries: { key: string; node: ReactNode }[]; noun?: string }) {
  const [at, setAt] = useState(0)
  if (!entries.length) return null
  const i = Math.min(at, entries.length - 1)
  return (
    <div className="flex flex-col gap-2">
      {entries.length > 1 ? (
        <div className="flex items-center justify-between gap-2 paragraph-xs text-tertiary">
          <span className="tabular-nums">
            {noun} {i + 1} of {entries.length}
          </span>
          <span className="flex items-center gap-3">
            <button type="button" disabled={i === 0} onClick={() => setAt(i - 1)} className="underline disabled:opacity-40 disabled:no-underline">
              Back
            </button>
            <button type="button" disabled={i === entries.length - 1} onClick={() => setAt(i + 1)} className="underline disabled:opacity-40 disabled:no-underline">
              Next
            </button>
          </span>
        </div>
      ) : null}
      <div key={entries[i].key}>{entries[i].node}</div>
    </div>
  )
}

export function PrimaryAction({ children, ...rest }: Parameters<typeof Button>[0]) {
  return (
    <Button size="sm" variant="primary" {...rest}>
      {children}
    </Button>
  )
}

// A target to set, inline in Your turn: the KPI, the account's own figure to start from, a box and "no target".
export function TargetToSet({
  name,
  phase,
  reference,
  suggested,
  suggestedFrom,
  suggestedLabel,
  byMia,
  kind,
  source,
  grouped = false,
  onSet,
  onNoTarget,
  saving = false,
}: {
  saving?: boolean // this row's number is being saved
  grouped?: boolean // under its phase's heading: the row doesn't repeat the phase
  name: string
  phase: string
  reference?: string | null
  suggested?: number | null
  suggestedFrom?: string | null
  suggestedLabel?: string | null
  byMia?: boolean
  kind?: string | null
  source?: string | null // where a starting number comes from: "account" (last 90 days) or "history" (a past campaign)
  onSet: (v: number | string, estimateNote?: string) => void
  onNoTarget: () => void
}) {
  // Once a number is typed the row's button is Set, where the eye goes (local test 27 Oct: the PM typed 300000 and
  // pressed Ask Mia, the button in that spot; nothing said Enter or leaving the box saves). Keep and Ask Mia step aside.
  const [typed, setTyped] = useState('')
  const id = `set-${phase}-${name}`
  return (
    <li className="grid grid-cols-1 @2xl:grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-2">
      <div className="min-w-0">
        <p className="paragraph-sm text-primary">
          <span className="font-medium">{name}</span>
          {grouped ? null : <span className="text-tertiary"> · {phase}</span>}
        </p>
        {suggested != null ? (
          <p className="paragraph-xs text-tertiary [overflow-wrap:anywhere]">
            {byMia
              ? kind === 'rule_of_thumb'
                ? 'Rule of thumb (no account data)'
                : "Mia's estimate"
              : source === 'history'
                ? 'From a past campaign'
                : 'From your account'}
            : {suggestedLabel ?? num(suggested)}
          </p>
        ) : null}
        {/* the working on tap: a name, a number and Keep is all the row needs (local test 27 Oct) */}
        {reference || suggestedFrom ? (
          <details className="paragraph-xs text-tertiary">
            <summary className="cursor-pointer select-none hover:text-secondary">How this was worked out</summary>
            {suggestedFrom ? <p className="[overflow-wrap:anywhere]">{suggestedFrom}</p> : null}
            {reference ? <p className="[overflow-wrap:anywhere]">{reference}</p> : null}
          </details>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={id}>
          {name} target
        </label>
        <Field
          id={id}
          placeholder="target"
          value=""
          onTyping={setTyped}
          onCommit={(v) => v && onSet(v)}
          className="w-24 rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary text-right"
        />
        {typed.trim() ? (
          // saves through the box's own blur, once (Field), so a click here and leaving the box are one save
          // a typed number saves when the PM leaves the box too (29 Oct: it saved on a click away, unannounced)
          <Button size="sm" variant="primary" loading={saving} onMouseDown={(e) => e.preventDefault()} onClick={() => document.getElementById(id)?.blur()}>
            Save
          </Button>
        ) : (
          <>
            {suggested != null ? (
              // One target at a time: the PM looks at each starting point and takes it, or types their own.
              <Button size="sm" onClick={() => onSet(suggested, suggestedFrom ?? 'starting point from the account')}>
                Keep {suggestedLabel ?? num(suggested)}
              </Button>
            ) : null}
            <button type="button" onClick={onNoTarget} className="paragraph-xs underline text-secondary hover:text-primary">
              No target
            </button>
            <AskMia label={`Target · ${phase} · ${name}`} detail={reference ?? undefined} />
          </>
        )}
      </div>
    </li>
  )
}
