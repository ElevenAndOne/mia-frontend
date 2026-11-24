import { useState } from 'react'
import { Button } from '../../../components/button'
import type { BuildState } from '../types'
import { askMia, clearFocus } from './your-turn'

// Fix a finding where it is (P6, local test 27 Oct: each self-check finding went back and forth through the chat, and
// an answer landed in the wrong box). One tap asks Mia to fix it as decided, or the PM says how in a line; Mia's card
// for it shows right here with Apply (and in the chat), since the card remembers the item it was asked from.
export type CardError = { at: string; error: string | null } | null

export function FindingFix({
  label,
  detail,
  quick,
  state,
  busy,
  onApply,
  onDrop,
  onFix,
  cardError = null,
}: {
  label: string // the Ask Mia label: also how the card finds its way back here (pending.about)
  detail: string
  quick: string // the one-tap fix, said as the PM would ("Fix it to follow what I decided")
  state: BuildState
  busy: string | null
  onApply?: (id: string) => Promise<unknown>
  onDrop?: (id: string) => Promise<unknown>
  // A final-check finding: Mia's server writes one card that fixes the whole job (brief now, words after Apply),
  // instead of a chat card that changed one field at a time (screen walk 23 Nov). `how`: the PM's own line, if typed.
  onFix?: (how?: string) => Promise<unknown>
  cardError?: CardError
}) {
  const [typed, setTyped] = useState('')
  const [sent, setSent] = useState(false)
  const cards = (state.pending ?? []).filter((p) => p.about === label)
  // the press, then Mia writing it in the background (state.fixing, kept across a reload) until the card shows
  const fixing = busy === `fix:${label}` || !!state.fixing?.includes(label)
  // the press refused (the finding closed meanwhile), or the background fix couldn't be made
  const fixFailed = fixing ? null : (cardError?.at === `fix:${label}` ? cardError.error : null) ?? state.fix_errors?.[label] ?? null
  // Its Apply or Not now failed: why shows here, also once a refused card has left the list (28 Oct: it showed at the
  // page top and in the chat, not where it was pressed)
  const [shown, setShown] = useState<string[]>([])
  if (cards.some((p) => !shown.includes(p.id))) setShown([...new Set([...shown, ...cards.map((p) => p.id)])])
  const failed = cardError?.error && shown.some((id) => cardError.at.endsWith(`:${id}`)) ? cardError.error : null
  const why = failed ? <p className="paragraph-xs text-error [overflow-wrap:anywhere]">{failed}</p> : null
  const gone = failed && !cards.some((p) => cardError?.at.endsWith(`:${p.id}`)) // its card was refused and has left
  // her card has come: "Sent" has done its job, so after Apply or Not now the box is fresh again
  if (cards.length && sent) setSent(false)
  const send = (text: string) => {
    if (!text.trim()) return
    if (onFix) {
      if (busy || fixing) return // Enter while a fix (or any press) is running would start a second one (review 24 Nov)
      // Mia writes it in the background; the line below says so until the card shows here (no "Sent" line needed).
      // A refused press keeps what the PM typed (the reason shows under it).
      void onFix(text.trim() === quick ? undefined : text.trim()).then((out) => {
        if (out) setTyped('')
      })
      return
    }
    clearFocus()
    askMia({ label, detail, text: text.trim() })
    setTyped('')
    setSent(true)
  }
  if (cards.length)
    return (
      <div className="flex flex-col gap-2">
        {cards.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-lg border border-brand bg-brand-primary px-3 py-2">
            <p className="label-xs text-brand-secondary">Mia's fix</p>
            <ul className="flex flex-col gap-1 paragraph-sm text-primary">
              {p.summary.map((line, k) => (
                <li key={k} className="[overflow-wrap:anywhere]">{line}</li>
              ))}
            </ul>
            {cardError?.at.endsWith(`:${p.id}`) ? why : null}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" loading={busy === `apply:${p.id}`} disabled={!!busy} onClick={() => void onApply?.(p.id)}>
                Apply
              </Button>
              <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void onDrop?.(p.id)}>
                Not now
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" loading={fixing} disabled={!!busy && !fixing} onClick={() => send(quick)}>
          {quick}
        </Button>
        <label className="sr-only" htmlFor={`fix-${label}`}>
          Or say how to fix it
        </label>
        <input
          id={`fix-${label}`}
          value={typed}
          placeholder="Or say how…"
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              send(typed)
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-secondary bg-primary px-2 py-1 paragraph-sm text-primary"
        />
        {typed.trim() ? (
          <Button size="sm" variant="primary" disabled={!!busy || fixing} onClick={() => send(typed)}>
            Send
          </Button>
        ) : null}
      </div>
      {fixing ? <p className="paragraph-xs text-tertiary">Mia is rewriting the whole job to follow it (about a minute)…</p> : null}
      {fixFailed ? <p className="paragraph-xs text-error [overflow-wrap:anywhere]">{fixFailed}</p> : null}
      {gone ? why : null}
      {sent ? <p className="paragraph-xs text-tertiary">Sent. Mia's fix shows here; if she needs to ask you something, it's in the chat.</p> : null}
    </div>
  )
}
