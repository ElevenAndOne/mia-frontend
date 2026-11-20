import { useState } from 'react'
import { Button } from '../../../components/button'
import { ArrowUpRight } from '../../../components/icon/arrow-up-right'
import { Stars01 } from '../../../components/icon/stars-01'
import type { NewsCard as Card, NewsDecision, NewsStep } from '../types'
import { day, safeLink } from './format'

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  google: 'Google Ads',
  youtube: 'YouTube',
  search: 'Google Search',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  other: 'Other',
}

/** Steps written before 20 Nov are one "PMs: ... Mia team: ..." line: split it so it still reads as steps. */
function legacySteps(action: string | null): NewsStep[] {
  if (!action) return []
  const parts = action.split(/\b(?=(?:PMs|Mia team):)/).map((p) => p.trim()).filter(Boolean)
  return parts.map((p) => {
    const team = p.startsWith('Mia team:')
    return { who: team ? 'mia_team' : 'pm', text: p.replace(/^(PMs|Mia team):\s*/, ''), mia: null, tool: null }
  })
}

function ToolLink({ label, url }: { label: string; url: string }) {
  const href = safeLink(url)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-tertiary bg-secondary px-3 py-1.5 paragraph-sm text-primary hover:bg-tertiary"
    >
      {label}
      <ArrowUpRight size={14} />
    </a>
  )
}

interface NewsCardProps {
  card: Card
  busy: boolean
  notesBusy: boolean
  onDecide: (decision: NewsDecision, ruleText?: string) => void
  onClientNotes: (takeBack: boolean, text?: string) => void
}

/** One "What's changing" card, read top down: what changed, why it matters, what to do. The fine print (the full
 *  story, who it could touch, the Mia team's code notes, the source) waits under Details. */
export function NewsCard({ card, busy, notesBusy, onDecide, onClientNotes }: NewsCardProps) {
  const [open, setOpen] = useState(false)
  const [ruling, setRuling] = useState(false)
  const [rule, setRule] = useState(card.rule_text ?? '')
  const [noting, setNoting] = useState(false)
  const [note, setNote] = useState(card.client_note ?? '')
  const link = safeLink(card.source_url)
  const when = day(card.published_at ?? card.found_at)
  const trend = card.kind === 'trend'
  const steps = card.steps?.length ? card.steps : legacySteps(card.action)
  const pmSteps = steps.filter((s) => s.who === 'pm')
  const teamSteps = steps.filter((s) => s.who === 'mia_team')
  const clients = card.clients ?? []
  const done = card.client_notes && !card.client_notes.taken_back ? card.client_notes : null
  const isRule = card.status === 'made_rule'
  const ruleStep = steps.some((s) => s.mia === 'rule')
  // With no "why" (an older card), the summary leads instead and Details only holds the rest.
  const lead = card.why ?? card.summary
  const story = card.why ? card.summary : null

  const miaAction = (s: NewsStep) => {
    if (s.mia === 'client_note' && card.client_note && clients.length > 0) {
      if (done) {
        return (
          <span className="flex shrink-0 items-center gap-2 paragraph-sm text-utility-success-700">
            Mia remembers this for {done.count} clients
            <button
              type="button"
              className="text-tertiary underline hover:text-secondary"
              disabled={notesBusy}
              onClick={() => onClientNotes(true)}
            >
              Undo
            </button>
          </span>
        )
      }
      return (
        <Button size="sm" variant="primary" leftIcon={<Stars01 size={14} />} onClick={() => setNoting(true)} disabled={noting}>
          Let Mia remember this
        </Button>
      )
    }
    if (s.mia === 'rule' && !isRule) {
      return (
        <Button size="sm" variant="primary" leftIcon={<Stars01 size={14} />} onClick={() => setRuling(true)} disabled={ruling}>
          Let Mia follow this
        </Button>
      )
    }
    return null
  }

  // Every step the same shape: the words on their own line, what Mia or a tool can do for it on the line below.
  const stepRow = (s: NewsStep, i: number) => {
    const action = miaAction(s)
    return (
      <li key={i} className="flex gap-3 border-t border-secondary py-3 first:border-t-0">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary label-xs text-secondary">
          {i + 1}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="paragraph-md text-primary break-words">{s.text}</span>
          {(action || s.tool) && (
            <div className="flex flex-wrap items-center gap-2">
              {action}
              {s.tool && <ToolLink label={s.tool.label} url={s.tool.url} />}
            </div>
          )}
        </div>
      </li>
    )
  }

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-secondary bg-primary px-5 py-5">
      {/* What changed */}
      <div className="flex flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2 paragraph-xs text-tertiary">
          {card.importance === 'high' && <span className="text-utility-warning-700">● Important</span>}
          <span>{trend ? 'Our clients' : (PLATFORM_LABEL[card.platform ?? 'other'] ?? card.platform)}</span>
          {when && <span>· {when}</span>}
        </span>
        <h3 className="m-0 title-h6 text-primary break-words">{card.headline ?? card.title}</h3>
        {lead && <p className="m-0 paragraph-md text-secondary">{lead}</p>}
      </div>

      {/* What to do */}
      {pmSteps.length > 0 && (
        <div className="flex flex-col">
          <span className="mb-1 label-xs uppercase tracking-wider text-tertiary">What to do</span>
          <ol className="m-0 flex list-none flex-col p-0">{pmSteps.map(stepRow)}</ol>
        </div>
      )}

      {noting && !done && (
        <form
          className="flex flex-col gap-2 rounded-lg bg-secondary p-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (note.trim()) {
              onClientNotes(false, note.trim())
              setNoting(false)
            }
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="paragraph-sm text-secondary">
              Mia will keep this in mind for {clients.length} clients ({clients.slice(0, 3).join(', ')}
              {clients.length > 3 ? '…' : ''}) when she talks about their results. It shows in their Notes, so keep it
              plain.
            </span>
            <textarea
              autoFocus
              rows={3}
              value={note}
              maxLength={600}
              onChange={(e) => setNote(e.target.value)}
              className="w-full resize-y rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="primary" loading={notesBusy} disabled={!note.trim()}>
              Add for {clients.length} clients
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setNoting(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {ruling && !isRule && (
        <form
          className="flex flex-col gap-2 rounded-lg bg-secondary p-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (rule.trim()) onDecide('make_rule', rule.trim())
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="paragraph-sm text-secondary">
              The rule, as one instruction Mia follows from now on. It goes live straight away.
            </span>
            <textarea
              autoFocus
              rows={2}
              value={rule}
              maxLength={2000}
              onChange={(e) => setRule(e.target.value)}
              placeholder="For example: Demand Gen campaigns set Display at ad group level, not campaign level."
              className="w-full resize-y rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="primary" disabled={busy || !rule.trim()}>
              Make it a rule
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setRuling(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* The fine print */}
      {open && (
        <div className="flex flex-col gap-3 rounded-lg bg-secondary px-4 py-3">
          {story && (
            <div className="flex flex-col gap-0.5">
              <span className="label-xs uppercase tracking-wider text-tertiary">What happened</span>
              <p className="m-0 paragraph-sm text-secondary">{story}</p>
            </div>
          )}
          {clients.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="label-xs uppercase tracking-wider text-tertiary">
                Could affect {clients.length} {clients.length === 1 ? 'client' : 'clients'}
                {card.clients_basis ? ` (${card.clients_basis})` : ''}
              </span>
              <p className="m-0 paragraph-sm text-secondary">{clients.join(', ')}</p>
            </div>
          )}
          {teamSteps.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <span className="label-xs uppercase tracking-wider text-tertiary">For the Mia team (developers)</span>
              <ul className="m-0 flex list-none flex-col p-0">{teamSteps.map(stepRow)}</ul>
            </div>
          )}
          {link && !trend && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 paragraph-sm text-secondary hover:text-primary"
            >
              Read it on {card.source_name ?? 'the source'}
              <ArrowUpRight size={13} />
            </a>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-2 border-t border-secondary pt-4">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="mr-auto paragraph-sm text-tertiary hover:text-secondary"
        >
          {open ? '▾ Hide details' : `▸ Details${clients.length ? ` · ${clients.length} clients` : ''}${teamSteps.length ? ' · Mia team' : ''}`}
        </button>
        {isRule ? (
          <span className="paragraph-sm text-utility-success-700">Mia follows this now</span>
        ) : (
          <>
            {card.status !== 'kept' && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => onDecide('keep')}>
                {card.status === 'ignored' ? 'Keep after all' : 'Done, keep it'}
              </Button>
            )}
            {card.status !== 'ignored' && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => onDecide('ignore')}>
                Not relevant
              </Button>
            )}
            {!trend && !ruleStep && !ruling && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setRuling(true)}>
                Make it a rule
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  )
}
