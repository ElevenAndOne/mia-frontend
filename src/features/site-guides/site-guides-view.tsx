import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  SiteGuideError,
  downloadBundle,
  fetchBlobUrl,
  fetchGuide,
  fetchWorkspaces,
  filePath,
  pagePath,
  pdfPath,
  saveEdits,
  setStatus,
  startBuild,
} from './site-guides-service'
import type { Edits, Guide, GuideResponse, GuideStatus, WorkspaceRow } from './types'
import './site-guides.css'

const STATUS_WORDS: Record<GuideStatus, string> = {
  none: 'No guide',
  building: 'Building',
  draft: 'Draft',
  checked: 'Checked',
  approved: 'Owner approved',
  failed: 'Build failed',
}

const COLOUR_JOBS: [string, string][] = [
  ['main', 'Main (buttons, links)'],
  ['accent', 'Accent (small highlights)'],
  ['dark', 'Dark (footer, dark sections)'],
  ['ground', 'Page background'],
  ['panel', 'Pale sections and cards'],
  ['ink', 'Reading text'],
]

const DEVICES: [string, string][] = [
  ['line_flourish', 'A drawn line under a heading'],
  ['band_behind_word', 'A colour band behind one word'],
  ['round_tag', 'A round tag'],
  ['label_and_rule', 'A small label and a short rule'],
  ['paper_card', 'A paper card'],
]

function when(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong'
}

/** A guide file shown from a blob URL, fetched with the session (the files have no public link). */
function useBlob(path: string | null, key: string | number): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!path) {
      setUrl(null)
      return
    }
    let made: string | null = null
    let gone = false
    fetchBlobUrl(path)
      .then((u) => {
        if (gone) URL.revokeObjectURL(u)
        else {
          made = u
          setUrl(u)
        }
      })
      .catch(() => setUrl(null))
    return () => {
      gone = true
      if (made) URL.revokeObjectURL(made)
    }
  }, [path, key])
  return url
}

/** One page of the guide as a picture. After an edit the new picture is fetched in the background
 *  and swapped in when it is ready: no blank flash, and the reader stays where they were. */
function GuidePage({ tenantId, n, stamp }: { tenantId: string; n: number; stamp: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [fresh, setFresh] = useState(true)
  const shown = useRef<string | null>(null)
  useEffect(() => {
    let gone = false
    setFresh(false)
    fetchBlobUrl(pagePath(tenantId, n))
      .then((u) => {
        if (gone) {
          URL.revokeObjectURL(u)
          return
        }
        const old = shown.current
        shown.current = u
        setUrl(u)
        setFresh(true)
        if (old) window.setTimeout(() => URL.revokeObjectURL(old), 2000)
      })
      .catch(() => setFresh(true))
    return () => {
      gone = true
    }
  }, [tenantId, n, stamp])
  useEffect(
    () => () => {
      if (shown.current) URL.revokeObjectURL(shown.current)
    },
    []
  )
  return (
    <div className={`sg-page${fresh ? '' : ' is-stale'}`}>
      {url ? <img src={url} alt={`Page ${n}`} /> : <span className="sg-page-wait" />}
      <em>{n}</em>
    </div>
  )
}

function Thumb({ tenantId, file, chosen, onPick, label }: { tenantId: string; file: string; chosen: boolean; onPick: () => void; label: string }) {
  const url = useBlob(filePath(tenantId, file), file)
  return (
    <button type="button" className={`sg-thumb${chosen ? ' is-on' : ''}`} onClick={onPick} title={label}>
      {url ? <img src={url} alt={label} /> : <span className="sg-thumb-wait" />}
      {chosen && <em>Hero</em>}
    </button>
  )
}

function ColourRow({ job, label, guide, busy, onSet }: { job: string; label: string; guide: Guide; busy: boolean; onSet: (hex: string) => void }) {
  const now = guide.colours.roles[job]
  const [typed, setTyped] = useState(now)
  useEffect(() => setTyped(now), [now])
  const valid = /^#[0-9a-fA-F]{6}$/.test(typed)
  return (
    <div className="sg-colour">
      <span className="sg-swatch" style={{ background: now }} />
      <div className="sg-colour-main">
        <b>{label}</b>
        <small>{guide.colours.named[job]?.name} · {now}</small>
        <div className="sg-measured">
          {guide.colours.measured.map((m) => (
            <button
              type="button"
              key={m.hex}
              disabled={busy}
              className={m.hex.toUpperCase() === now.toUpperCase() ? 'is-on' : ''}
              style={{ background: m.hex }}
              title={`${m.hex}, seen in ${m.sources.join(' and ')}`}
              onClick={() => onSet(m.hex)}
            />
          ))}
        </div>
      </div>
      <form
        className="sg-hex"
        onSubmit={(ev) => {
          ev.preventDefault()
          if (valid && typed.toUpperCase() !== now.toUpperCase()) onSet(typed)
        }}
      >
        <input value={typed} onChange={(ev) => setTyped(ev.target.value.trim())} maxLength={7} aria-label={`${label} colour code`} />
        <button type="submit" disabled={busy || !valid || typed.toUpperCase() === now.toUpperCase()}>Set</button>
      </form>
    </div>
  )
}

function FontRow({ label, current, options, busy, onSet }: { label: string; current: string; options: string[]; busy: boolean; onSet: (name: string) => void }) {
  const [typed, setTyped] = useState('')
  const all = useMemo(() => Array.from(new Set([current, ...options])), [current, options])
  return (
    <div className="sg-field">
      <label>{label}</label>
      <div className="sg-inline">
        <select value={current} disabled={busy} onChange={(ev) => onSet(ev.target.value)}>
          {all.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <form
          className="sg-inline"
          onSubmit={(ev) => {
            ev.preventDefault()
            if (typed.trim()) {
              onSet(typed.trim())
              setTyped('')
            }
          }}
        >
          <input placeholder="Another Google font" value={typed} onChange={(ev) => setTyped(ev.target.value)} />
          <button type="submit" disabled={busy || !typed.trim()}>Use</button>
        </form>
      </div>
    </div>
  )
}

function EditPanel({ data, busy, onEdit }: { data: GuideResponse; busy: boolean; onEdit: (edits: Edits) => void }) {
  const guide = data.guide as Guide
  const [note, setNote] = useState(guide.designer_note || '')
  const [tagline, setTagline] = useState('')
  useEffect(() => setNote(guide.designer_note || ''), [guide.designer_note])
  const names = guide.domain.rows.filter((r) => !r.problem && (r.free.com || r.free['co.za']))
  return (
    <div className="sg-edit">
      <h3>Change a choice</h3>
      <p className="sg-hint">Each change redraws the PDF straight away. It does not ask the model again.</p>

      <h4>Colours</h4>
      {COLOUR_JOBS.map(([job, label]) => (
        <ColourRow key={job} job={job} label={label} guide={guide} busy={busy} onSet={(hex) => onEdit({ colours: { [job]: hex } })} />
      ))}

      <h4>Fonts</h4>
      <FontRow label="Headings" current={guide.fonts.heading.family} options={guide.fonts.heading.candidates} busy={busy} onSet={(f) => onEdit({ heading_font: f })} />
      <FontRow label="Reading text" current={guide.fonts.body.family} options={guide.fonts.body.candidates} busy={busy} onSet={(f) => onEdit({ body_font: f })} />

      {guide.logo.found && guide.logo.has_simple && (
        <>
          <h4>Logo in the header</h4>
          <div className="sg-toggle">
            <button type="button" disabled={busy} className={guide.logo.use === 'simple' ? 'is-on' : ''} onClick={() => onEdit({ logo: 'simple' })}>Without the small text</button>
            <button type="button" disabled={busy} className={guide.logo.use === 'full' ? 'is-on' : ''} onClick={() => onEdit({ logo: 'full' })}>Full logo</button>
          </div>
        </>
      )}

      {guide.photos.picks.length > 0 && (
        <>
          <h4>Hero photograph</h4>
          <div className="sg-thumbs">
            {guide.photos.picks.map((p) => (
              <Thumb key={p.n} tenantId={data.tenant_id} file={p.file} label={p.use} chosen={p.n === guide.photos.hero_n} onPick={() => p.n !== guide.photos.hero_n && !busy && onEdit({ hero_n: p.n })} />
            ))}
          </div>
          <small className="sg-hint">
            {guide.photos.full_size.length} of {guide.photos.picks.length} are in the download at full size.
          </small>
        </>
      )}

      <h4>Tagline shown first</h4>
      <div className="sg-field">
        <select value={guide.voice.taglines[0]?.line || ''} disabled={busy} onChange={(ev) => onEdit({ tagline: ev.target.value })}>
          {guide.voice.taglines.map((t) => (
            <option key={t.line} value={t.line}>{t.line} ({t.from === 'theirs' ? 'their own line' : 'suggested'})</option>
          ))}
        </select>
        <form
          className="sg-inline"
          onSubmit={(ev) => {
            ev.preventDefault()
            if (tagline.trim()) {
              onEdit({ tagline: tagline.trim() })
              setTagline('')
            }
          }}
        >
          <input placeholder="Or write one" value={tagline} onChange={(ev) => setTagline(ev.target.value)} maxLength={120} />
          <button type="submit" disabled={busy || !tagline.trim()}>Use</button>
        </form>
      </div>

      <h4>Device</h4>
      <div className="sg-field">
        <select value={guide.device.kind} disabled={busy} onChange={(ev) => onEdit({ device: ev.target.value })}>
          {DEVICES.map(([k, words]) => (
            <option key={k} value={k}>{words}</option>
          ))}
        </select>
      </div>

      <h4>Domain</h4>
      <div className="sg-field">
        {names.length ? (
          <select value={guide.domain.choice?.name || ''} disabled={busy} onChange={(ev) => onEdit({ domain: ev.target.value })}>
            {names.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} ({[r.free.com ? '.com' : '', r.free['co.za'] ? '.co.za' : ''].filter(Boolean).join(' and ')} free)
              </option>
            ))}
          </select>
        ) : (
          <small className="sg-hint">No free name was found.</small>
        )}
      </div>

      <h4>Note for the web designer</h4>
      <div className="sg-field">
        <textarea rows={3} value={note} maxLength={1000} onChange={(ev) => setNote(ev.target.value)} placeholder="Shown on the cover of the PDF" />
        <div className="sg-inline">
          <button type="button" disabled={busy || note === (guide.designer_note || '')} onClick={() => onEdit({ note })}>Save note</button>
          {(guide.edited?.length || guide.designer_note) && (
            <button type="button" className="sg-quiet" disabled={busy} onClick={() => onEdit({ reset: true })}>Undo all my changes</button>
          )}
        </div>
      </div>
    </div>
  )
}

function GuidePanel({ tenantId, onChanged }: { tenantId: string; onChanged: () => void }) {
  const [data, setData] = useState<GuideResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [drawn, setDrawn] = useState(0) // bumps when the PDF has been redrawn
  const timer = useRef<number | null>(null)

  const load = useCallback(async () => {
    try {
      const got = await fetchGuide(tenantId)
      setData((before) => {
        if (before && before.status === 'building' && got.status !== 'building') {
          setDrawn((n) => n + 1)
          onChanged()
        }
        return got
      })
      setError(null)
      return got
    } catch (err) {
      setError(message(err))
      return null
    }
  }, [tenantId, onChanged])

  useEffect(() => {
    setData(null)
    setError(null)
    void load()
  }, [load])

  // While a build runs, ask how it is going every few seconds.
  useEffect(() => {
    if (data?.status !== 'building') return
    timer.current = window.setInterval(() => void load(), 3000)
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [data?.status, load])

  const pages = data?.pages || 0
  const openPdf = () =>
    act(async () => {
      const url = await fetchBlobUrl(pdfPath(tenantId))
      window.open(url, '_blank', 'noopener')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    })

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  const build = (fresh: boolean) =>
    act(async () => {
      await startBuild(tenantId, fresh)
      await load()
      onChanged()
    })

  const edit = (edits: Edits) =>
    act(async () => {
      const got = await saveEdits(tenantId, edits)
      setData(got)
      setDrawn((n) => n + 1)
    })

  const mark = (status: 'draft' | 'checked' | 'approved') =>
    act(async () => {
      await setStatus(tenantId, status)
      await load()
      onChanged()
    })

  if (!data) return <div className="sg-panel sg-empty">{error || 'Loading…'}</div>
  const building = data.status === 'building'
  const guide = data.guide || null

  return (
    <div className="sg-panel">
      <div className="sg-head">
        <div>
          <h2>{data.name}</h2>
          <span className={`sg-chip sg-${data.status}`}>{STATUS_WORDS[data.status]}</span>
          {data.built_at && <small> Built {when(data.built_at)}{data.built_by ? ` by ${data.built_by}` : ''}</small>}
          {data.status_at && data.status !== 'draft' && <small> · marked {when(data.status_at)}{data.status_by ? ` by ${data.status_by}` : ''}</small>}
        </div>
        <div className="sg-actions">
          {!guide && !building && <button type="button" className="sg-primary" disabled={busy} onClick={() => build(false)}>Build guide</button>}
          {guide && !building && (
            <>
              <button type="button" className="sg-primary" disabled={busy} onClick={() => act(() => downloadBundle(tenantId, `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-site-guide.zip`))}>Download</button>
              <button type="button" disabled={busy} onClick={openPdf} title="Opens the PDF itself in a new tab">Open PDF</button>
              <button type="button" disabled={busy} onClick={() => build(false)} title="Reads their Page and pictures again. Keeps the colours and fonts.">Rebuild</button>
              <button type="button" disabled={busy} onClick={() => window.confirm('Choose the colours and fonts again from scratch?') && build(true)} title="Lets Mia choose the colours and fonts again">Choose again</button>
              {data.status === 'draft' && <button type="button" disabled={busy} onClick={() => mark('checked')}>Mark as checked</button>}
              {data.status === 'checked' && <button type="button" disabled={busy} onClick={() => mark('approved')}>Owner approved</button>}
              {data.status !== 'draft' && <button type="button" className="sg-quiet" disabled={busy} onClick={() => mark('draft')}>Back to draft</button>}
            </>
          )}
        </div>
      </div>

      {error && <div className="sg-error">{error}</div>}
      {data.error && !building && <div className="sg-error">The last build did not finish: {data.error}</div>}

      {building && (
        <div className="sg-progress">
          <span className="sg-spin" />
          <div>
            <b>Building the guide. This takes a few minutes.</b>
            <small>{data.step || 'Starting'}</small>
          </div>
        </div>
      )}

      {!guide && !building && data.status !== 'failed' && (
        <div className="sg-empty">
          No guide yet. Building one reads their Facebook Page and pictures, then takes a few minutes.
        </div>
      )}

      {guide && !building && (
        <div className="sg-body">
          <div className="sg-pdf">
            {pages > 0 ? (
              <div className="sg-pages">
                {Array.from({ length: pages }, (_, i) => (
                  <GuidePage key={i + 1} tenantId={tenantId} n={i + 1} stamp={`${data.version}-${drawn}`} />
                ))}
              </div>
            ) : (
              <div className="sg-empty">Drawing the PDF…</div>
            )}
            {guide.questions_for_pitch.length > 0 && (
              <details className="sg-questions">
                <summary>{guide.questions_for_pitch.length} things to confirm with the owner</summary>
                <ol>
                  {guide.questions_for_pitch.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
              </details>
            )}
          </div>
          <EditPanel data={data} busy={busy} onEdit={edit} />
        </div>
      )}
    </div>
  )
}

export default function SiteGuidesView() {
  const [rows, setRows] = useState<WorkspaceRow[] | null>(null)
  const [error, setError] = useState<{ status: number; text: string } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [find, setFind] = useState('')

  const loadRows = useCallback(async () => {
    try {
      const got = await fetchWorkspaces()
      setRows(got.workspaces)
      setError(null)
    } catch (err) {
      setError({ status: err instanceof SiteGuideError ? err.status : 0, text: message(err) })
    }
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const shown = useMemo(() => {
    const f = find.trim().toLowerCase()
    return (rows || []).filter((r) => !f || r.name.toLowerCase().includes(f))
  }, [rows, find])

  if (error?.status === 403) {
    return (
      <div className="sg-root">
        <div className="sg-empty">
          {error.text} <Link to="/">Back to Mia</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="sg-root">
      <div className="sg-top">
        <div>
          <h1>Site guides</h1>
          <p>A short brand guide for a business with no website, built from what Mia holds. For the web designer. Staff only.</p>
        </div>
        <Link to="/" className="sg-back">Back to Mia</Link>
      </div>
      {error && <div className="sg-error">{error.text}</div>}
      <div className="sg-layout">
        <aside className="sg-list">
          <input placeholder="Find a workspace" value={find} onChange={(ev) => setFind(ev.target.value)} />
          {!rows && !error && <div className="sg-empty">Loading…</div>}
          {rows && shown.length === 0 && <div className="sg-empty">No Basic workspaces found.</div>}
          {shown.map((r) => (
            <button type="button" key={r.tenant_id} className={`sg-row${selected === r.tenant_id ? ' is-on' : ''}`} onClick={() => setSelected(r.tenant_id)}>
              <b>{r.name}</b>
              <span className={`sg-chip sg-${r.status || 'none'}`}>{STATUS_WORDS[r.status || 'none']}</span>
              <small>
                {r.website ? `Has a website: ${r.website.replace(/^https?:\/\//, '')}` : r.page_read ? 'No website' : 'No website · Page not read yet'}
                {typeof r.photos === 'number' ? ` · ${r.photos} photos` : ''}
                {r.workspace_created ? ` · made ${r.workspace_created}` : ''}
              </small>
            </button>
          ))}
        </aside>
        <main className="sg-main">
          {selected ? <GuidePanel key={selected} tenantId={selected} onChanged={loadRows} /> : <div className="sg-panel sg-empty">Pick a workspace to build or open its guide.</div>}
        </main>
      </div>
    </div>
  )
}
