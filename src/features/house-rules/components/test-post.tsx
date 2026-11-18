import { useEffect, useMemo, useState } from 'react'
import { Spinner } from '../../../components/spinner'
import { useCheck } from '../hooks/use-house-rules'
import type { CheckHit } from '../types'

const EXAMPLE = 'Tag a friend who needs this! Save this date: the market opens 12 June.'

interface Segment {
  text: string
  hit: CheckHit | null
}

/** The text cut into plain runs and caught lines, in order; overlapping catches keep the first. */
function segments(text: string, hits: CheckHit[]): Segment[] {
  const placed = hits.filter((h) => h.span).sort((a, b) => a.span![0] - b.span![0])
  const out: Segment[] = []
  let at = 0
  for (const h of placed) {
    const [s, e] = h.span!
    if (s < at || e > text.length) continue
    if (s > at) out.push({ text: text.slice(at, s), hit: null })
    out.push({ text: text.slice(s, e), hit: h })
    at = e
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: null })
  return out
}

function quoteList(hits: CheckHit[]): string {
  const inOrder = [...hits].sort((a, b) => (a.span?.[0] ?? Infinity) - (b.span?.[0] ?? Infinity))
  const q = [...new Set(inOrder.map((h) => `“${h.found}”`))]
  return q.length <= 1 ? q.join('') : `${q.slice(0, -1).join(', ')} and ${q[q.length - 1]}`
}

export function TestPost({ sessionId }: { sessionId: string | null }) {
  const [text, setText] = useState(EXAMPLE)
  const [sent, setSent] = useState(EXAMPLE)

  useEffect(() => {
    const t = setTimeout(() => setSent(text), 400) // check once they pause typing
    return () => clearTimeout(t)
  }, [text])

  const check = useCheck(sessionId, sent)
  const result = sent.trim() ? check.data : undefined
  const hits = useMemo(() => result?.hits ?? [], [result])
  const segs = useMemo(() => segments(sent, hits), [sent, hits])
  const live = hits.filter((h) => h.status === 'live')
  const waiting = hits.filter((h) => h.status === 'waiting')

  let verdict = ''
  if (!sent.trim()) verdict = 'Paste a post to check it.'
  else if (check.isError) verdict = 'The check didn’t run. Try again in a moment.'
  else if (result && !hits.length) verdict = 'Clean. Nothing on the list.'
  else if (result) {
    verdict = [
      live.length ? `Mia would rewrite ${quoteList(live)}.` : '',
      waiting.length
        ? `Approve ${quoteList(waiting)} and Mia would rewrite ${waiting.length > 1 ? 'them' : 'it'}${live.length ? ' too' : ''}.`
        : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-secondary bg-primary p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="house-rules-test" className="title-h6 text-primary">
          Test a post
        </label>
        <span className="paragraph-sm text-tertiary">Paste any post. Mia shows which lines it would trip.</span>
      </div>
      <textarea
        id="house-rules-test"
        value={text}
        maxLength={5000}
        rows={3}
        onChange={(e) => setText(e.target.value)}
        className="w-full resize-y rounded-xl border border-secondary bg-secondary px-4 py-3 paragraph-md text-primary"
      />
      {sent.trim() && (
        <div className="whitespace-pre-wrap break-words rounded-xl border border-secondary bg-secondary px-4 py-3 paragraph-md text-primary" aria-live="polite">
          {segs.map((s, i) =>
            s.hit ? (
              <mark
                key={i}
                title={s.hit.status === 'live' ? 'On the list now' : 'Waiting for approval'}
                className={`rounded-sm px-0.5 text-primary [box-decoration-break:clone] ${
                  s.hit.status === 'live' ? 'bg-utility-warning-100 font-semibold' : 'bg-utility-info-100'
                }`}
              >
                {s.text}
              </mark>
            ) : (
              <span key={i}>{s.text}</span>
            )
          )}
        </div>
      )}
      {hits.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 paragraph-sm text-tertiary">
          {live.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-utility-warning-100" aria-hidden="true" />
              On the list now
            </span>
          )}
          {waiting.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-utility-info-100" aria-hidden="true" />
              Waiting for approval
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 subheading-md text-primary">
        {check.isFetching && <Spinner size="sm" />}
        <span>{verdict}</span>
      </div>
      {result && result.unchecked > 0 && (
        <span className="paragraph-sm text-tertiary">
          {result.unchecked} live {result.unchecked === 1 ? 'rule is' : 'rules are'} about a post’s shape, not its
          words: Mia’s writers follow {result.unchecked === 1 ? 'it' : 'them'}, but this box can’t check{' '}
          {result.unchecked === 1 ? 'it' : 'them'}.
        </span>
      )}
    </section>
  )
}
