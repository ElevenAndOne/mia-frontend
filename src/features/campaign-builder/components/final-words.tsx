import { useEffect, useState } from 'react'
import { Button } from '../../../components/button'
import type { BuildState, FinalWords, PlanOp } from '../types'
import { Card, Chip, NeedsYou } from './parts'

// Final words (rule 08): the copy model writes each job's words, Claude checks them. The PM starts
// it once the job list is right; it runs in the background, a few jobs at a time. Every piece is
// editable here; what the PM types is marked as theirs and never rewritten.

const LIMIT: Record<string, number> = {
  'ad.primary_text': 125,
  'ad.headline': 40,
  'ad.description': 30,
  'email.subject': 60,
  'email.preheader': 90,
}
const limitFor = (where: string) =>
  where.startsWith('rsa.headlines') ? 30 : where.startsWith('rsa.descriptions') ? 90 : LIMIT[where]

export function WordsCard({
  state,
  busy,
  locked,
  onWrite,
}: {
  state: BuildState
  busy: string | null
  locked: boolean
  onWrite: (jobIds?: string[], rewrite?: boolean) => Promise<unknown>
}) {
  const jobs = state.plan?.assets ?? []
  const run = state.words_run
  const without = jobs.filter((a) => !a.final_words).length
  const flagged = jobs.filter((a) => a.final_words?.status === 'flagged').length
  if (locked || !jobs.length) return null
  return (
    <Card warn={flagged > 0} className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="subheading-sm text-primary">Final words</p>
        <p className="paragraph-sm text-secondary">
          {run?.status === 'running'
            ? `${run.stage_label ?? 'Writing'}… About a minute a job, a few at a time. You can keep working.`
            : without === jobs.length
              ? 'When the jobs look right, Mia writes the finished words for each one: words on every slide, captions, ad copy and search ads, checked against the brand and your rules.'
              : `${jobs.length - without} of ${jobs.length} jobs have their final words${flagged ? `; ${flagged} need a look` : ''}.`}
        </p>
        {run?.status === 'failed' ? <p className="paragraph-xs text-utility-warning-700">The last run stopped: {run.error ?? 'try again'}</p> : null}
      </div>
      {run?.status === 'running' ? null : (
        <Button variant={without ? 'primary' : 'secondary'} loading={busy === 'words'} disabled={!without} onClick={() => onWrite()}>
          {without ? `Write the final words (${without} job${without === 1 ? '' : 's'})` : 'All jobs have words'}
        </Button>
      )}
    </Card>
  )
}

export function JobWords({
  fw,
  index,
  jobId,
  moving = false,
  disabled,
  running,
  onEdit,
  onRewrite,
}: {
  fw: FinalWords
  index: number
  jobId?: string
  moving?: boolean // a video or animation: its words are per frame, not per slide
  disabled: boolean
  running: boolean
  onEdit: (ops: PlanOp[]) => Promise<unknown>
  onRewrite: (jobIds: string[]) => Promise<unknown>
}) {
  const mine = new Set((fw.set_by_pm ?? []).map((w) => (w.startsWith('captions[') ? w.toLowerCase() : w)))
  const flagFor = (where: string) => fw.flags.filter((f) => f.where === where || where.startsWith(`${f.where}[`))
  const piece = (where: string, label: string, value: string, multiline = false, prefix = '') => (
    <Piece
      key={where}
      where={where}
      label={label}
      value={value}
      multiline={multiline}
      mine={mine.has(where)}
      flags={flagFor(where)}
      disabled={disabled}
      onCommit={(v) => onEdit([{ op: 'update_words', index, where, value: prefix + v }])}
    />
  )
  // An extra ad version is stored as a caption starting "Variant B:". The label says so beside the box, so the
  // copy a designer lifts from the box is only the copy (live test 18 Oct).
  const caption = (key: string, c: { platform: string; text: string }) => {
    const m = /^\s*(variant\s+[a-z])\s*[:\-–]\s*/i.exec(c.text)
    return m
      ? piece(key, `Caption · ${c.platform} · ${m[1].replace(/^v/, 'V')}`, c.text.slice(m[0].length), true, `${m[1]}: `)
      : piece(key, `Caption · ${c.platform}`, c.text, true)
  }
  return (
    <details open={fw.status === 'flagged'}>
      <summary className="cursor-pointer paragraph-xs text-secondary flex flex-wrap items-center gap-2">
        Final words {fw.status === 'flagged' ? <NeedsYou>needs a look</NeedsYou> : <Chip tone="good">ready</Chip>}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {fw.flags.length ? (
          <div className="rounded-lg border border-utility-warning-300 bg-utility-warning-50 p-2 flex flex-col gap-2">
            <ul className="paragraph-xs text-utility-warning-700 flex flex-col gap-0.5">
              {fw.flags.map((f, i) => (
                <li key={i} className="[overflow-wrap:anywhere]">
                  ⚠ {f.where}: {f.problem}. {f.fix}
                </li>
              ))}
            </ul>
            {disabled || !jobId ? null : (
              // One click: Mia rewrites this job using exactly these notes, or the PM says the words are fine.
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary" disabled={running} onClick={() => onRewrite([jobId])}>
                  Fix it
                </Button>
                <Button size="sm" disabled={running} onClick={() => onEdit([{ op: 'accept_words', index }])}>
                  Looks fine as is
                </Button>
                <span className="paragraph-xs text-tertiary">Or edit the words below yourself.</span>
              </div>
            )}
          </div>
        ) : null}
        {/* Slide words often have a line break (headline + line): a one-line box glued them together (16 Oct). */}
        {fw.slides.map((s) =>
          piece(`slides[${s.n}]`, `${moving ? 'Frame' : 'Slide'} ${s.n}`, s.words, s.words.includes('\n') || s.words.length > 60),
        )}
        {fw.ad ? (
          <>
            {piece('ad.primary_text', 'Primary text', fw.ad.primary_text, true)}
            {piece('ad.headline', 'Headline', fw.ad.headline)}
            {piece('ad.description', 'Description', fw.ad.description)}
            {piece('ad.cta', 'Button', fw.ad.cta)}
          </>
        ) : null}
        {fw.rsa ? (
          <>
            {fw.rsa.headlines.map((h, i) => piece(`rsa.headlines[${i}]`, `Headline ${i + 1}`, h))}
            {fw.rsa.descriptions.map((h, i) => piece(`rsa.descriptions[${i}]`, `Description ${i + 1}`, h, true))}
          </>
        ) : null}
        {fw.email ? (
          <>
            {piece('email.subject', 'Subject', fw.email.subject)}
            {piece('email.preheader', 'Preheader', fw.email.preheader)}
            {piece('email.body', 'Body', fw.email.body, true)}
          </>
        ) : null}
        {captionKeys(fw.captions).map(([key, c]) => caption(key, c))}
        {disabled || !jobId ? null : (
          <button
            type="button"
            disabled={running}
            className="self-start paragraph-xs text-tertiary hover:text-primary disabled:opacity-50"
            onClick={() => onRewrite([jobId])}
          >
            Rewrite this job's words (your own edits are kept)
          </button>
        )}
      </div>
    </details>
  )
}

function Piece({
  where,
  label,
  value,
  multiline,
  mine,
  flags,
  disabled,
  onCommit,
}: {
  where: string
  label: string
  value: string
  multiline: boolean
  mine: boolean
  flags: { problem: string }[]
  disabled: boolean
  onCommit: (v: string) => void
}) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  const limit = limitFor(where)
  const over = limit != null && v.length > limit
  const cls = `w-full rounded-md bg-primary px-2 py-1 paragraph-xs text-primary ${
    over || flags.length ? 'border-2 border-utility-warning-300' : 'border border-secondary'
  }`
  return (
    <label className="flex flex-col gap-0.5">
      <span className="paragraph-xs text-tertiary flex flex-wrap items-center gap-2 [overflow-wrap:anywhere]">
        {label}
        {mine ? <Chip tone="pm">yours</Chip> : null}
        {limit != null ? (
          <span className={over ? 'text-utility-warning-700' : ''}>
            {v.length}/{limit}
          </span>
        ) : null}
      </span>
      {disabled ? (
        <span className="paragraph-xs text-primary whitespace-pre-wrap [overflow-wrap:anywhere]">{value}</span>
      ) : multiline ? (
        <textarea
          rows={Math.min(6, Math.max(2, v.split('\n').length + Math.floor(v.length / 70)))}
          className={cls}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== value && onCommit(v)}
        />
      ) : (
        <input className={cls} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v)} />
      )}
    </label>
  )
}

// Same keys as the server (words.caption_keys): platform plus which one of that platform, so a
// caption stays on its platform when a rewrite returns them in another order.
function captionKeys(caps: { platform: string; text: string }[]): [string, { platform: string; text: string }][] {
  const seen: Record<string, number> = {}
  return caps.map((c) => {
    const p = (c.platform ?? '').trim().toLowerCase()
    seen[p] = (seen[p] ?? 0) + 1
    return [`captions[${p}:${seen[p]}]`, c]
  })
}
