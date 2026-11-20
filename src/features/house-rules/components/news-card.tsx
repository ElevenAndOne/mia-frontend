import { useState } from 'react'
import { Button } from '../../../components/button'
import { ArrowUpRight } from '../../../components/icon/arrow-up-right'
import { Stars01 } from '../../../components/icon/stars-01'
import type { NewsCard as Card, NewsDecision, NewsStep } from '../types'
import { clientsWord, day, safeLink } from './format'

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

const NOTE_MAX = 240 // mia-backend platform_watch.CLIENT_NOTE_MAX: Mia reads a note this long whole

/** "24 Nov" from "2026-11-24". */
function shortDay(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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

const SectionLabel = ({ children }: { children: string }) => (
  <span className="label-xs uppercase tracking-wider text-tertiary">{children}</span>
)

interface NewsCardProps {
  card: Card
  busy: boolean
  notesBusy: boolean
  onDecide: (decision: NewsDecision, ruleText?: string) => void
  onClientNotes: (takeBack: boolean, text?: string) => void
}

/** One "What's changing" card, read top down: what changed, why it matters, what to do. The fine print (the full
 *  story, who it could touch, the source, making it a rule) waits under Details. */
export function NewsCard({ card, busy, notesBusy, onDecide, onClientNotes }: NewsCardProps) {
  const [open, setOpen] = useState(false)
  const [ruling, setRuling] = useState(false)
  const [rule, setRule] = useState('')
  const [noting, setNoting] = useState(false)
  const [note, setNote] = useState('')
  const link = safeLink(card.source_url)
  const when = day(card.published_at ?? card.found_at)
  const trend = card.kind === 'trend'
  const steps = card.steps?.length ? card.steps : legacySteps(card.action)
  // A step Mia can do (follow a rule) is the agency's to press, whoever the step is for.
  const pmSteps = steps.filter((s) => s.who === 'pm' || s.mia === 'rule')
  const teamSteps = steps.filter((s) => s.who === 'mia_team' && s.mia !== 'rule')
  const forTeamOnly = pmSteps.length === 0 && teamSteps.length > 0
  const clients = card.clients ?? []
  const notes = card.client_notes
  const done = notes && !notes.taken_back ? notes : null
  const isRule = card.status === 'made_rule'
  const lead = card.why ?? card.summary
  const story = card.why ? card.summary : null

  // The box takes the card's words when it opens, not when the card first showed (steps can arrive later).
  const openNote = () => {
    setNote(card.client_note ?? '')
    setNoting(true)
  }
  const openRule = () => {
    setRule(card.rule_text ?? '')
    setRuling(true)
  }

  const today = new Date().toISOString().slice(0, 10)
  const miaAction = (s: NewsStep) => {
    if (s.mia === 'client_note' && card.client_note && clients.length > 0) {
      if (done) {
        const until = shortDay(done.until)
        const undo = (
          <button
            type="button"
            className="text-tertiary underline hover:text-secondary"
            disabled={notesBusy}
            onClick={() => {
              setNoting(false)
              onClientNotes(true)
            }}
          >
            Undo
          </button>
        )
        // An add that stopped before any client: say so, and Undo clears it so it can be tried again.
        // Still adding (the minute refresh can land mid-way): not a failure yet.
        const recent = done.at ? Date.now() - new Date(done.at).getTime() < 2 * 60_000 : false
        if (done.count === 0 && (notesBusy || recent)) {
          return <span className="paragraph-sm text-tertiary">Adding…</span>
        }
        if (done.count === 0) {
          return <span className="flex flex-wrap items-center gap-x-2 paragraph-sm text-utility-error-700">The note didn’t save for any client {undo}</span>
        }
        return (
          <span className="flex flex-wrap items-center gap-x-2 paragraph-sm text-utility-success-700">
            Mia remembers this for {clientsWord(done.count)}
            {until ? ` until ${until}` : ''}
            {undo}
          </span>
        )
      }
      if (notes?.expired) {
        return <span className="paragraph-sm text-tertiary">Mia’s note ended {shortDay(notes.until) ?? ''}</span>
      }
      if (card.note_until && card.note_until < today) {
        return <span className="paragraph-sm text-tertiary">This ended {shortDay(card.note_until)}: nothing to remember now</span>
      }
      return (
        <Button size="sm" variant="primary" leftIcon={<Stars01 size={14} />} onClick={openNote} disabled={noting}>
          Let Mia remember this for {clientsWord(clients.length)}
        </Button>
      )
    }
    if (s.mia === 'rule' && !isRule) {
      return (
        <Button size="sm" variant="primary" leftIcon={<Stars01 size={14} />} onClick={openRule} disabled={ruling}>
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

  const mainSteps = forTeamOnly ? teamSteps : pmSteps

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-secondary bg-primary px-5 py-5">
      {/* What changed */}
      <div className="flex flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2 paragraph-xs text-tertiary">
          {forTeamOnly ? (
            <span className="text-utility-brand-700">For the Mia team</span>
          ) : (
            card.importance === 'high' && <span className="text-utility-warning-700">● Important</span>
          )}
          <span>{trend ? 'Our clients' : (PLATFORM_LABEL[card.platform ?? 'other'] ?? card.platform)}</span>
          {when && <span>· {when}</span>}
        </span>
        <h3 className="m-0 title-h6 text-primary break-words">{card.headline ?? card.title}</h3>
        {lead && <p className="m-0 paragraph-md text-secondary">{lead}</p>}
      </div>

      {/* What to do */}
      {mainSteps.length > 0 && (
        <div className="flex flex-col gap-1">
          <SectionLabel>{forTeamOnly ? 'What the Mia team does' : 'What to do'}</SectionLabel>
          <ol className="m-0 flex list-none flex-col p-0">{mainSteps.map(stepRow)}</ol>
        </div>
      )}

      {noting && !done && (
        <form
          className="flex flex-col gap-2 rounded-lg bg-secondary p-3"
          onSubmit={(e) => {
            e.preventDefault()
            // The box stays open until the save lands (it hides itself once the card says done), so a failed save
            // keeps what was typed.
            if (note.trim() && note.trim().length <= NOTE_MAX) onClientNotes(false, note.trim())
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="paragraph-sm text-secondary">
              Mia keeps this in mind for {clientsWord(clients.length)} ({clients.slice(0, 3).join(', ')}
              {clients.length > 3 ? '…' : ''}) when she talks about their results
              {card.note_until ? `, until ${shortDay(card.note_until)}` : ', for 90 days'}. It shows in their Notes,
              so keep it plain.
            </span>
            <textarea
              autoFocus
              rows={3}
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              className="w-full resize-y rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm text-primary"
            />
            <span className="self-end paragraph-xs text-tertiary tabular-nums">
              {note.length}/{NOTE_MAX}
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="primary" loading={notesBusy} disabled={!note.trim()}>
              Add for {clientsWord(clients.length)}
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
              <SectionLabel>What happened</SectionLabel>
              <p className="m-0 paragraph-sm text-secondary">{story}</p>
            </div>
          )}
          {clients.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <SectionLabel>{`Could affect ${clientsWord(clients.length)}${card.clients_basis ? ` ${card.clients_basis}` : ''}`}</SectionLabel>
              <p className="m-0 paragraph-sm text-secondary">{clients.join(', ')}</p>
            </div>
          )}
          {!forTeamOnly && teamSteps.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <SectionLabel>For the Mia team (developers)</SectionLabel>
              <ol className="m-0 flex list-none flex-col p-0">{teamSteps.map(stepRow)}</ol>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {link && !trend && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 paragraph-sm text-secondary hover:text-primary"
              >
                Read it on {card.source_name ?? 'the source'}
                <ArrowUpRight size={13} />
              </a>
            )}
            {!trend && !isRule && !ruling && !pmSteps.some((s) => s.mia === 'rule') && (
              <button type="button" className="paragraph-sm text-secondary underline hover:text-primary" onClick={openRule}>
                Make it a rule Mia follows
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-3 border-t border-secondary pt-4">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="mr-auto paragraph-sm text-tertiary hover:text-secondary"
        >
          {open ? '▾ Hide details' : `▸ Details${clients.length ? ` · ${clientsWord(clients.length)}` : ''}`}
        </button>
        {isRule ? (
          <span className="paragraph-sm text-utility-success-700">Mia follows this now</span>
        ) : (
          <>
            {card.status !== 'ignored' && (
              <button
                type="button"
                className="paragraph-sm text-tertiary hover:text-secondary disabled:opacity-50"
                disabled={busy}
                onClick={() => onDecide('ignore')}
              >
                Not relevant
              </button>
            )}
            {card.status !== 'kept' && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => onDecide('keep')}>
                {card.status === 'ignored' ? 'Keep after all' : 'Done'}
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  )
}
