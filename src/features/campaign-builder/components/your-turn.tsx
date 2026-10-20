import { useState, type ReactNode } from 'react'
import { Button } from '../../../components/button'
import type { BuildState, Plan } from '../types'
import { Card, day, money, num } from './parts'

// The calmer page (19 Oct, docs2/CAMPAIGN_BUILDER_CALMER_UI_PLAN_2026-10-19.md): what the PM has to do comes
// first ("Your turn"), one line of facts under it, and the detail folds away with a one-line summary. Any item
// can be asked about: "Ask Mia" pins it to the campaign chat.

// ── Ask Mia about this ───────────────────────────────────────────────────────

export interface AskFocus {
  label: string // what the PM clicked, as the chip shows it ("Target · Reach · Click-through rate")
  detail?: string // the text of the item, so Mia knows exactly what is meant
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
  const split = plan.decisions.budget_split?.value ?? {}
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
  const nextKey = open[0]?.key
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(items.filter((i) => i.openByDefault && !i.done).map((i) => i.key)))
  const toggle = (k: string) => setExpanded((e) => { const n = new Set(e); if (n.has(k)) n.delete(k); else n.add(k); return n })
  if (!open.length) {
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
  return (
    <Card className="!p-0 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-secondary px-4 py-3">
        <div className="min-w-0">
          <h2 className="subheading-md text-primary">Your turn</h2>
          <p className="paragraph-xs text-tertiary">
            Work down the list. Each item leaves it once it's done, so the next one is always at the top.
          </p>
        </div>
        <span className="paragraph-xs text-tertiary tabular-nums">
          {open.length} to do{items.length > open.length ? ` · ${items.length - open.length} done` : ''}
        </span>
      </div>
      <ol className="flex flex-col">
        {/* Done items leave the list (19 Oct): a checklist that clears, not one that fills with crossed-out steps. */}
        {open.map((it, n) => {
          const next = it.key === nextKey
          return (
            <li
              key={it.key}
              className={`border-b border-secondary last:border-b-0 px-4 py-3 ${next ? 'bg-brand-primary' : ''}`}
            >
              <div className="grid grid-cols-[28px_1fr] @2xl:grid-cols-[28px_1fr_auto] items-center gap-x-3 gap-y-2">
                <span
                  aria-hidden="true"
                  className={`grid size-7 place-items-center rounded-full label-xs ${
                    it.done ? 'bg-success-primary text-success' : next ? 'bg-brand-solid text-primary-onbrand' : 'bg-tertiary text-secondary'
                  }`}
                >
                  {it.done ? '✓' : n + 1}
                </span>
                <div className="min-w-0">
                  <p className={`paragraph-sm font-medium ${it.done ? 'text-tertiary line-through' : 'text-primary'}`}>
                    <span className="sr-only">{it.done ? 'Done: ' : ''}</span>
                    {it.title}
                  </p>
                  {it.detail && !it.done ? <div className="paragraph-xs text-secondary">{it.detail}</div> : null}
                </div>
                {!it.done && (it.actions || it.more) ? (
                  <div className="col-start-2 @2xl:col-start-3 flex flex-wrap items-center gap-2 @2xl:justify-end">
                    {it.actions}
                    {it.more ? (
                      <button
                        type="button"
                        aria-expanded={expanded.has(it.key)}
                        onClick={() => toggle(it.key)}
                        className="paragraph-xs underline text-primary"
                      >
                        {expanded.has(it.key) ? 'Hide' : 'Show'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {it.more && expanded.has(it.key) && !it.done ? <div className="mt-3 @2xl:pl-10">{it.more}</div> : null}
            </li>
          )
        })}
      </ol>
      {footer ? <div className="border-t border-secondary px-4 py-3">{footer}</div> : null}
    </Card>
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
  onSet,
  onNoTarget,
}: {
  name: string
  phase: string
  reference?: string | null
  suggested?: number | null
  suggestedFrom?: string | null
  suggestedLabel?: string | null
  onSet: (v: number, estimateNote?: string) => void
  onNoTarget: () => void
}) {
  const [v, setV] = useState('')
  const commit = () => {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'))
    if (v.trim() && Number.isFinite(n)) onSet(n)
  }
  return (
    <li className="grid grid-cols-1 @2xl:grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-2">
      <div className="min-w-0">
        <p className="paragraph-sm text-primary">
          <span className="font-medium">{name}</span> <span className="text-tertiary">· {phase}</span>
        </p>
        {reference ? <p className="paragraph-xs text-tertiary [overflow-wrap:anywhere]">{reference}</p> : null}
        {suggested != null ? (
          <p className="paragraph-xs text-tertiary [overflow-wrap:anywhere]">
            Starting point: {suggestedLabel ?? num(suggested)}
            {suggestedFrom ? ` (${suggestedFrom})` : ''}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`set-${phase}-${name}`}>
          {name} target
        </label>
        <input
          id={`set-${phase}-${name}`}
          inputMode="decimal"
          placeholder="target"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="w-24 rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary text-right"
        />
        {suggested != null ? (
          // One target at a time: the PM looks at each starting point and takes it, or types their own.
          <Button size="sm" onClick={() => onSet(suggested, suggestedFrom ?? 'starting point from the account')}>
            Use {suggestedLabel ?? num(suggested)}
          </Button>
        ) : null}
        <button type="button" onClick={onNoTarget} className="paragraph-xs underline text-secondary hover:text-primary">
          No target
        </button>
        <AskMia label={`Target · ${phase} · ${name}`} detail={reference ?? undefined} />
      </div>
    </li>
  )
}
