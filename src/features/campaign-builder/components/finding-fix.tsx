import { useState } from 'react'
import { Button } from '../../../components/button'
import type { BuildState } from '../types'
import { askMia, clearFocus } from './your-turn'

// Fix a finding where it is (P6, local test 27 Oct: each self-check finding went back and forth through the chat, and
// an answer landed in the wrong box). One tap asks Mia to fix it as decided, or the PM says how in a line; Mia's card
// for it shows right here with Apply (and in the chat), since the card remembers the item it was asked from.
export function FindingFix({
  label,
  detail,
  quick,
  state,
  busy,
  onApply,
  onDrop,
}: {
  label: string // the Ask Mia label: also how the card finds its way back here (pending.about)
  detail: string
  quick: string // the one-tap fix, said as the PM would ("Fix it to follow what I decided")
  state: BuildState
  busy: string | null
  onApply?: (id: string) => Promise<unknown>
  onDrop?: (id: string) => Promise<unknown>
}) {
  const [typed, setTyped] = useState('')
  const [sent, setSent] = useState(false)
  const cards = (state.pending ?? []).filter((p) => p.about === label)
  // her card has come: "Sent" has done its job, so after Apply or Not now the box is fresh again
  if (cards.length && sent) setSent(false)
  const send = (text: string) => {
    if (!text.trim()) return
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
        <Button size="sm" onClick={() => send(quick)}>
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
          <Button size="sm" variant="primary" onClick={() => send(typed)}>
            Send
          </Button>
        ) : null}
      </div>
      {sent ? <p className="paragraph-xs text-tertiary">Sent. Mia's fix shows here; if she needs to ask you something, it's in the chat.</p> : null}
    </div>
  )
}
