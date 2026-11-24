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
  change?: {
    what_it_does?: string
    note?: { kind?: string; text?: string }
    fact?: { text?: string; status?: string }
    post?: PostPreview
  } & Record<string, unknown>
  result?: { status: string; message?: string | null; yes_by?: string | null } | null
}

// A post through Claude (step 6a): Mia worked out the Page, the time on the business's clock and the pictures (her own
// library's URLs); the words are Claude's
interface PostPreview {
  platform?: string
  page?: string
  when_local?: string
  zone?: string
  text?: string
  pictures?: string[]
}

// Claude's words are shown as text only, with every invisible format character removed (zero-width, direction-changing,
// tag letters), the same rule as Mia's server and the claude.ai panel; the emoji joiner stays
const INVISIBLE = new RegExp('\\p{Cf}', 'gu')
const clean = (s: unknown) => String(s ?? '').replace(INVISIBLE, (c) => (c === '\u200D' ? c : ''))
// the server sends only its own library's URLs for a post (Claude gives asset ids, never addresses); https only here
const ownPicture = (u: unknown) => typeof u === 'string' && /^https:\/\//.test(u)

export default function ClaudeChangePage() {
  const { proposalId = '' } = useParams<{ proposalId: string }>()
  const { sessionId } = useSession()
  const [change, setChange] = useState<ClaudeChange | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await apiFetch(
        `/api/claude-changes/${encodeURIComponent(proposalId)}?session_id=${encodeURIComponent(sessionId)}`
      )
      const body = await safeJson<ClaudeChange & { detail?: string }>(res, {} as ClaudeChange)
      if (!res.ok) {
        setError(body.detail || 'Could not load this change.')
        return
      }
      setChange(body)
    } catch {
      // a network failure never leaves the page on "Loading…" for good (audit 24 Nov)
      setError('Mia couldn’t be reached. Check your connection and reload the page.')
    }
  }, [proposalId, sessionId])

  useEffect(() => {
    void load()
  }, [load])

  const press = async (what: 'confirm' | 'decline') => {
    if (!sessionId || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/claude-changes/${encodeURIComponent(proposalId)}/${what}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      const body = await safeJson<{ detail?: string; status?: string; message?: string; state?: string }>(res, {})
      if (!res.ok) {
        setError(body.detail || 'That didn’t go through.')
        void load() // expired or changed since: show it as it is now, no dead buttons
        return
      }
      if (what === 'decline') {
        // already made (the panel's Yes in another tab) or already declined: say so, never "not made" (audit)
        if (body.state && body.state !== 'cancelled') {
          void load()
          return
        }
        setDone('Not made. Nothing was changed.')
      } else {
        setDone(
          body.status === 'done'
            ? change?.change?.post
              ? `Booked. It goes out ${change.change.post.when_local ?? 'at its time'} and shows in Mia’s Posts, where it can be moved or cancelled.`
              : 'Done. Mia made the change.'
            : body.status === 'still_running'
              ? 'Mia is still making it. It shows in her change history when it finishes.'
              : `Mia couldn’t make it: ${body.message || 'nothing was changed.'}`
        )
      }
      void load()
    } catch {
      setError('Mia couldn’t be reached, so it may or may not have gone through. Reload the page to see.')
    } finally {
      setBusy(false)
    }
  }

  const open = change?.state === 'open' && !done
  const post = change?.change?.post
  const pictures = (post?.pictures ?? []).filter(ownPicture) as string[]
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
                {post
                  ? 'Only press Yes if you asked for this post and the words, pictures and time are right.'
                  : 'Pressing Yes makes this change in Mia straight away, in your name. Only press it if you asked for this change and it says what you want.'}
              </p>
            </div>
            {post ? (
              <div className="rounded-xl bg-primary border border-secondary p-4 flex flex-col gap-2">
                <p className="paragraph-sm text-secondary">
                  {post.platform === 'instagram' ? 'Instagram' : 'Facebook'} · {post.page ?? '—'} ·{' '}
                  <span className="text-primary font-semibold">{post.when_local}</span>
                  {post.zone ? ` (${post.zone})` : ''}
                </p>
                {pictures.length ? (
                  <div className="flex flex-wrap gap-2">
                    {pictures.map((u) => (
                      <img
                        key={u}
                        src={u}
                        alt="Picture in the post"
                        referrerPolicy="no-referrer"
                        className="h-32 w-32 rounded-lg object-contain bg-secondary border border-secondary"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <p className="paragraph-xs text-tertiary">
                {post
                  ? 'The post, as Claude wrote it (shown exactly as it would go out):'
                  : 'The change, as Claude proposed it (Claude’s words, shown as written):'}
              </p>
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-primary border border-secondary p-4 paragraph-sm text-primary max-h-80 overflow-auto font-sans">
                {post ? clean(post.text) : clean(change.summary)}
                {change.change?.note?.text ? `\n\nThe note: ${clean(change.change.note.text)}` : ''}
                {change.change?.fact?.text ? `\n\nThe fact: ${clean(change.change.fact.text)}` : ''}
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
            {busy ? <p className="paragraph-sm text-secondary">Working… this can take up to a minute.</p> : null}
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
