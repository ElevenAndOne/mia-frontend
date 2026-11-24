// A person's own yes to a change Claude proposed (step 5, 24 Nov 2026; backend routes/claude_changes.py).
// Claude can't make these changes: it gives the person this page's link. Mia's own facts first (workspace, what the
// change does, the risk), then Claude's words as plain text, then No and Yes (Yes is never the default). Only the
// person it was proposed for sees it; anyone else gets "not found".
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/button'
import { useSession } from '../contexts/session-context'
import { apiFetch, safeJson } from '../utils/api'

interface ClaudeChange {
  proposal_id: string
  state: 'open' | 'used' | 'cancelled' | 'expired'
  door: 'panel' | 'mia'
  workspace?: string
  summary: string
  said?: string
  expires_at: string
  change?: { what_it_does?: string; note?: { kind?: string; text?: string } } & Record<string, unknown>
  result?: { status: string; message?: string | null; yes_by?: string | null } | null
}

// Claude's words are shown as text only, with invisible and direction-changing characters removed
const INVISIBLE = new RegExp('[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]', 'g')
const clean = (s: unknown) => String(s ?? '').replace(INVISIBLE, '')

export default function ClaudeChangePage() {
  const { proposalId = '' } = useParams<{ proposalId: string }>()
  const { sessionId } = useSession()
  const [change, setChange] = useState<ClaudeChange | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId) return
    const res = await apiFetch(
      `/api/claude-changes/${encodeURIComponent(proposalId)}?session_id=${encodeURIComponent(sessionId)}`
    )
    const body = await safeJson<ClaudeChange & { detail?: string }>(res, {} as ClaudeChange)
    if (!res.ok) {
      setError(body.detail || 'Could not load this change.')
      return
    }
    setChange(body)
  }, [proposalId, sessionId])

  useEffect(() => {
    void load()
  }, [load])

  const press = async (what: 'confirm' | 'decline') => {
    if (!sessionId) return
    setBusy(true)
    setError(null)
    const res = await apiFetch(`/api/claude-changes/${encodeURIComponent(proposalId)}/${what}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
    const body = await safeJson<{ detail?: string; status?: string; message?: string }>(res, {})
    setBusy(false)
    if (!res.ok) {
      setError(body.detail || 'That didn’t go through.')
      return
    }
    setDone(
      what === 'decline'
        ? 'Not made. Nothing was changed.'
        : body.status === 'done'
          ? 'Done. Mia made the change.'
          : body.status === 'still_running'
            ? 'Mia is still making it. It shows in her change history when it finishes.'
            : `Mia couldn’t make it: ${body.message || 'nothing was changed.'}`
    )
    void load()
  }

  const open = change?.state === 'open' && !done
  return (
    <div className="w-full h-full overflow-y-auto bg-secondary">
      <div className="mx-auto max-w-xl px-4 py-8 flex flex-col gap-4">
        <h1 className="title-h6 text-primary">Confirm a change from Claude</h1>
        {error ? <p className="paragraph-sm text-error-primary">{error}</p> : null}
        {!change && !error ? <p className="paragraph-sm text-secondary">Loading…</p> : null}
        {change ? (
          <>
            <div className="rounded-xl bg-primary border border-secondary p-4 flex flex-col gap-1">
              <p className="paragraph-sm text-secondary">Workspace: {change.workspace ?? '—'}</p>
              {change.change?.what_it_does ? (
                <p className="paragraph-sm text-primary">{clean(change.change.what_it_does)}</p>
              ) : null}
              <p className="paragraph-sm text-primary font-semibold">
                Pressing Yes makes this change in Mia straight away, in your name. Only press it if you asked for
                this change and it says what you want.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="paragraph-xs text-tertiary">The change, as Claude proposed it (Claude’s words, shown as written):</p>
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-primary border border-secondary p-4 paragraph-sm text-primary max-h-80 overflow-auto font-sans">
                {clean(change.summary)}
                {change.change?.note?.text ? `\n\nThe note: ${clean(change.change.note.text)}` : ''}
              </pre>
              {change.said ? (
                <p className="paragraph-xs text-tertiary">What you asked for, as Claude put it: {clean(change.said)}</p>
              ) : null}
            </div>
            {open ? (
              <div className="flex gap-2">
                <Button variant="secondary" disabled={busy} onClick={() => void press('decline')}>
                  No, don’t
                </Button>
                <Button variant="primary" disabled={busy} onClick={() => void press('confirm')}>
                  Yes, make this change
                </Button>
              </div>
            ) : null}
            {done ? <p className="paragraph-sm text-primary">{done}</p> : null}
            {!open && !done ? (
              <p className="paragraph-sm text-secondary">
                {change.state === 'used'
                  ? `This change was ${change.result?.status === 'completed' ? 'made' : 'tried'}${change.result?.yes_by === 'panel' ? ' from the panel in Claude' : ''}.`
                  : change.state === 'cancelled'
                    ? 'This change was declined. Nothing was changed.'
                    : 'This proposal has expired. Ask Claude to propose it again if you still want it.'}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
