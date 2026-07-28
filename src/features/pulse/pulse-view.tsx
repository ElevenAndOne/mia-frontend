import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../contexts/session-context'
import { usePulseDashboard, useTesterDetail, useWorkspaces } from './hooks/use-pulse'
import { PulseError } from './services/pulse-service'
import type {
  FeedbackItem,
  FeedbackSummary,
  Metric,
  PulseFilter,
  PulseRange,
  RecentQuestion,
  TesterRow,
  TesterStatus,
  TimelineEvent,
  TimeseriesPoint,
  Workspace,
  WorkspaceMember,
} from './types'
import './pulse.css'

const RANGES: PulseRange[] = ['7d', '30d', 'all']
const AVATARS = ['#1a5afc', '#f86721', '#6b51ef', '#2bccb3', '#f5aa29', '#2cb763', '#f74798', '#3cbcfd']

// ---------- formatters ----------
function initials(name?: string | null): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function avatarColor(seed?: string | null): string {
  const s = seed || ''
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATARS[h % AVATARS.length]
}

function timeAgo(iso?: string | null): string {
  if (!iso) return 'never'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'never'
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatMoney(usd: number): string {
  if (!usd) return '$0.00'
  if (usd >= 100) return `$${Math.round(usd).toLocaleString()}`
  return `$${usd.toFixed(2)}`
}

function formatTokens(n: number): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

const STATUS_LABEL: Record<TesterStatus, string> = {
  active: 'Active',
  idle: 'Idle',
  new: 'New',
  cold: 'Cold',
}

function StatusPill({ status }: { status: TesterStatus }) {
  return (
    <span className={`plz-pill plz-st-${status}`}>
      <span className="plz-dot" style={{ background: 'currentColor' }} />
      {STATUS_LABEL[status]}
    </span>
  )
}

function questionTag(q: RecentQuestion): string {
  if (q.is_campaign_builder) return 'Campaign builder'
  const skill = q.skills?.[0]
  if (skill) return skill.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return 'Chat'
}

function timelineLabel(e: TimelineEvent): { a: string; m: string } {
  const pretty = (s: string) => s.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  if (e.type === 'question') {
    return { a: 'Asked a question', m: String((e.data?.question as string) || '') }
  }
  if (e.type === 'page_visit') {
    return { a: `Viewed ${pretty(e.page || 'a page')}`, m: '' }
  }
  if (e.type === 'campaign_saved') {
    return { a: 'Saved a campaign', m: (e.data?.campaign_id as string) ? `#${e.data.campaign_id}` : '' }
  }
  return { a: pretty(e.type || 'Activity'), m: e.page ? pretty(e.page) : '' }
}

// ---------- small pieces ----------
function DeltaLine({ metric, unit }: { metric: Metric | { value: number; delta: number | null }; unit: string }) {
  const d = metric.delta
  if (d === null || d === undefined) return <div className="plz-delta plz-flat">vs all time</div>
  if (d === 0) return <div className="plz-delta plz-flat">no change</div>
  const up = d > 0
  const abs = Math.abs(d)
  const val =
    unit === 'sec' ? formatDuration(abs) : unit === 'usd' ? formatMoney(abs) : `${abs}${unit === 'pct' ? '%' : ''}`
  return (
    <div className={`plz-delta ${up ? 'plz-up' : 'plz-down'}`}>
      {up ? '▲' : '▼'} {val} vs prev
    </div>
  )
}

function Spinner() {
  return (
    <div className="plz-state">
      <div className="plz-spinner" />
    </div>
  )
}

function QuestionsChart({ points }: { points: TimeseriesPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.value))
  return (
    <div className="plz-bars">
      {points.map((p, i) => {
        const isToday = i === points.length - 1
        const showX = isToday || i % Math.ceil(points.length / 7) === 0
        const label = isToday ? 'today' : new Date(p.date).getDate()
        return (
          <div className="plz-barcol" key={p.date} title={`${p.value} questions · ${p.date}`}>
            <div
              className={`plz-bar${isToday ? ' today' : ''}`}
              style={{ height: `${Math.round((p.value / max) * 100)}%` }}
            />
            <div className="plz-barx">{showX ? label : ' '}</div>
          </div>
        )
      })}
    </div>
  )
}

// ---------- detail pane ----------
function DetailPane({
  sessionId,
  googleUserId,
  filter,
}: {
  sessionId: string | null
  googleUserId: string | null
  filter: PulseFilter
}) {
  const { data, isLoading, error } = useTesterDetail(sessionId, googleUserId, filter)

  if (!googleUserId) return <div className="plz-card plz-empty">Select a tester to see their activity.</div>
  if (isLoading) return <div className="plz-card"><Spinner /></div>
  if (error || !data) return <div className="plz-card plz-empty">Couldn’t load this tester.</div>

  const color = avatarColor(data.email || data.google_user_id)
  const platforms = data.connected_platforms.length
    ? data.connected_platforms.map((p) => p.replace(/_/g, ' ')).join(' · ')
    : '— none connected'

  return (
    <div className="plz-card">
      <div className="plz-dhead">
        <div className="plz-av" style={{ width: 44, height: 44, fontSize: 17, background: color }}>
          {initials(data.name)}
        </div>
        <div className="plz-who">
          <b>{data.name || data.email || 'Unknown'}</b>
          <span>
            {[data.role, data.tenant].filter(Boolean).join(' · ') || 'No workspace'}
            <StatusPill status={data.status} />
          </span>
        </div>
      </div>

      <div className="plz-mini">
        <div>
          <div className="v plz-num">{data.counters.questions}</div>
          <div className="l">Questions</div>
        </div>
        <div>
          <div className="v plz-num">{data.counters.sessions}</div>
          <div className="l">Sessions</div>
        </div>
        <div>
          <div className="v plz-num">{data.days_on_beta ?? '—'}d</div>
          <div className="l">On beta</div>
        </div>
        <div title={`${formatTokens(data.counters.tokens)} tokens (tracked turns)`}>
          <div className="v plz-num">{formatMoney(data.counters.est_cost_usd)}</div>
          <div className="l">Est. cost</div>
        </div>
      </div>

      <div className="plz-meta-line">
        Connected: <b>{platforms}</b> · last active {timeAgo(data.last_active)}
      </div>

      <div className="plz-seclab">Activity timeline</div>
      {data.timeline.length ? (
        <div className="plz-tl">
          {data.timeline.map((e, i) => {
            const { a, m } = timelineLabel(e)
            return (
              <div className="plz-tli" key={i}>
                <span className={`plz-tldot${e.type === 'question' ? ' q' : ''}`} />
                <div>
                  <div className="a">{a}</div>
                  {m && <div className="m">{m}</div>}
                </div>
                <div className="plz-tltime">{timeAgo(e.timestamp)}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="plz-empty">No tracked activity yet.</div>
      )}

      <div className="plz-seclab">Recent questions</div>
      {data.recent_questions.length ? (
        data.recent_questions.map((q, i) => (
          <div className="plz-conv" key={i}>
            <div className="plz-q">“{q.question}”</div>
            <div className="plz-qmeta">
              <span className="plz-tag">{questionTag(q)}</span>
              <span>{timeAgo(q.timestamp)}</span>
            </div>
          </div>
        ))
      ) : (
        <div className="plz-empty">Signed up but hasn’t asked anything yet.</div>
      )}
    </div>
  )
}

// ---------- feedback (thumbs up/down) ----------
function FeedbackSection({
  summary,
  items,
  isLoading,
  onSelectUser,
}: {
  summary: FeedbackSummary | undefined
  items: FeedbackItem[]
  isLoading: boolean
  onSelectUser: (googleUserId: string | null) => void
}) {
  const hasVotes = !!summary && summary.total > 0
  return (
    <div className="plz-card plz-topics">
      <div className="plz-card-h" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <h2>Message feedback</h2>
        <span className="plz-hint">
          {summary
            ? summary.total
              ? `${summary.total} votes · ${summary.satisfaction_pct}% positive`
              : 'no votes in range'
            : ''}
        </span>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !hasVotes ? (
        <div className="plz-empty">
          No thumbs up/down in this range yet. Votes land here the moment a tester rates a
          response in chat.
        </div>
      ) : (
        <>
          <div className="plz-fbstats">
            <div className="plz-fbstat">
              <div className="v plz-num up">👍 {summary!.up}</div>
              <div className="l">Thumbs up</div>
            </div>
            <div className="plz-fbstat">
              <div className="v plz-num down">👎 {summary!.down}</div>
              <div className="l">Thumbs down</div>
            </div>
            <div className="plz-fbstat">
              <div className="v plz-num">{summary!.satisfaction_pct ?? '—'}%</div>
              <div className="l">Positive</div>
              <DeltaLine
                metric={{ value: summary!.satisfaction_pct ?? 0, delta: summary!.satisfaction_delta }}
                unit="pct"
              />
            </div>
            <div className="plz-fbstat">
              <div className="v plz-num">{summary!.down_with_details}</div>
              <div className="l">With comments</div>
            </div>
          </div>

          <div className="plz-fbgrid">
            <div>
              {summary!.categories.length > 0 && (
                <>
                  <div className="plz-seclab">Issue types (thumbs down)</div>
                  {summary!.categories.map((c) => (
                    <div className="plz-topic" key={c.key}>
                      <span className="plz-tlabel">{c.label}</span>
                      <span className="plz-track">
                        <span
                          className="plz-fill down"
                          style={{ width: `${Math.max(3, (c.count / summary!.down) * 100)}%` }}
                        />
                      </span>
                      <span className="plz-tn2 plz-num">{c.count}</span>
                    </div>
                  ))}
                </>
              )}
              {summary!.skills.some((s) => s.down > 0) && (
                <>
                  <div className="plz-seclab">Skills getting thumbs down</div>
                  {summary!.skills
                    .filter((s) => s.down > 0)
                    .slice(0, 8)
                    .map((s) => (
                      <div className="plz-topic" key={s.key}>
                        <span className="plz-tlabel">{s.label}</span>
                        <span className="plz-track">
                          <span
                            className="plz-fill down"
                            style={{ width: `${Math.max(3, s.negative_pct)}%` }}
                          />
                        </span>
                        <span
                          className="plz-tn2 plz-num"
                          title={`${s.negative_pct}% of votes on this skill are negative`}
                        >
                          {s.down}👎 · {s.up}👍
                        </span>
                      </div>
                    ))}
                </>
              )}
            </div>

            <div>
              <div className="plz-seclab">Recent thumbs down</div>
              {items.length ? (
                items.map((f) => (
                  <div
                    className="plz-conv plz-fbitem"
                    key={f.feedback_id}
                    onClick={() => onSelectUser(f.google_user_id)}
                    title="Show this tester in the drill-down"
                  >
                    <div className="plz-q">“{f.question}”</div>
                    {f.response && <div className="plz-fbresp">{f.response.slice(0, 260)}{f.response.length > 260 ? '…' : ''}</div>}
                    {f.details && <div className="plz-fbdetails">“{f.details}”</div>}
                    <div className="plz-qmeta">
                      {f.category_label && <span className="plz-tag">{f.category_label}</span>}
                      <span>{f.user_email || 'unknown'}</span>
                      <span>{timeAgo(f.created_at)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="plz-empty">No thumbs-down votes in this range. 🎉</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ---------- filter bar ----------
function useOutsideClose(ref: RefObject<HTMLElement | null>, onClose: () => void, open: boolean) {
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, onClose, open])
}

function WorkspaceFilter({
  workspaces,
  selected,
  onChange,
}: {
  workspaces: Workspace[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClose(ref, () => setOpen(false), open)

  const label =
    selected.length === 0
      ? 'All workspaces'
      : selected.length === 1
        ? workspaces.find((w) => w.tenant_id === selected[0])?.name ?? '1 workspace'
        : `${selected.length} workspaces`

  const toggle = (tid: string) =>
    onChange(selected.includes(tid) ? selected.filter((t) => t !== tid) : [...selected, tid])

  return (
    <div className="plz-filter" ref={ref}>
      <button
        type="button"
        className={`plz-fbtn${selected.length ? ' on' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="plz-flabel">Workspace</span>
        {label}
      </button>
      {open && (
        <div className="plz-fmenu">
          <button type="button" className="plz-fitem" onClick={() => onChange([])}>
            <span className={`plz-check${selected.length === 0 ? ' on' : ''}`} />
            <span className="plz-fname">All workspaces</span>
          </button>
          <div className="plz-fdiv" />
          {workspaces.map((w) => (
            <button key={w.tenant_id} type="button" className="plz-fitem" onClick={() => toggle(w.tenant_id)}>
              <span className={`plz-check${selected.includes(w.tenant_id) ? ' on' : ''}`} />
              <span className="plz-fname">{w.name}</span>
              <span className="plz-fcount">{w.member_count}</span>
            </button>
          ))}
          {workspaces.length === 0 && <div className="plz-empty">No workspaces found.</div>}
        </div>
      )}
    </div>
  )
}

function UserFilter({
  users,
  selected,
  onChange,
}: {
  users: WorkspaceMember[]
  selected: string | null
  onChange: (next: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClose(ref, () => setOpen(false), open)

  const label = selected ? users.find((u) => u.google_user_id === selected)?.name ?? 'User' : 'All users'
  const pick = (id: string | null) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <div className="plz-filter" ref={ref}>
      <button
        type="button"
        className={`plz-fbtn${selected ? ' on' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="plz-flabel">User</span>
        {label}
      </button>
      {open && (
        <div className="plz-fmenu">
          <button type="button" className="plz-fitem" onClick={() => pick(null)}>
            <span className={`plz-radio${!selected ? ' on' : ''}`} />
            <span className="plz-fname">All users</span>
          </button>
          <div className="plz-fdiv" />
          {users.map((u) => (
            <button key={u.google_user_id} type="button" className="plz-fitem" onClick={() => pick(u.google_user_id)}>
              <span className={`plz-radio${selected === u.google_user_id ? ' on' : ''}`} />
              <span className="plz-fname">{u.name}</span>
            </button>
          ))}
          {users.length === 0 && <div className="plz-empty">No users in scope.</div>}
        </div>
      )}
    </div>
  )
}

// ---------- main view ----------
export function PulseView() {
  const { sessionId } = useSession()
  const [range, setRange] = useState<PulseRange>('7d')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const [userFilter, setUserFilter] = useState<string | null>(null)

  const workspaces = useWorkspaces(sessionId)
  const wsList = useMemo<Workspace[]>(() => workspaces.data?.workspaces ?? [], [workspaces.data])

  // Users available in the picker: members of the selected workspaces (or everyone
  // when no workspace is selected), de-duped across workspaces.
  const availableUsers = useMemo<WorkspaceMember[]>(() => {
    const src = selectedTenants.length
      ? wsList.filter((w) => selectedTenants.includes(w.tenant_id))
      : wsList
    const map = new Map<string, WorkspaceMember>()
    for (const w of src) for (const m of w.members) if (!map.has(m.google_user_id)) map.set(m.google_user_id, m)
    return [...map.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [wsList, selectedTenants])

  // Drop the user filter if the chosen user falls out of the workspace scope.
  useEffect(() => {
    if (userFilter && !availableUsers.some((u) => u.google_user_id === userFilter)) setUserFilter(null)
  }, [availableUsers, userFilter])

  const filter = useMemo<PulseFilter>(
    () => ({ tenantIds: selectedTenants, userId: userFilter }),
    [selectedTenants, userFilter]
  )
  const filtered = selectedTenants.length > 0 || userFilter !== null

  const { overview, timeseries, testers, topics, feedbackSummary, feedbackRecent } =
    usePulseDashboard(sessionId, range, filter)

  // Keep the detail pane in sync: follow the user filter, else auto-select the top
  // tester, and never leave a selection that's no longer in the (filtered) list.
  useEffect(() => {
    const rows = testers.data?.testers
    if (!rows || !rows.length) return
    if (userFilter) {
      setSelectedId(userFilter)
      return
    }
    if (!selectedId || !rows.some((r) => r.google_user_id === selectedId)) {
      setSelectedId(rows[0].google_user_id)
    }
  }, [testers.data, userFilter, selectedId])

  const forbidden = [overview.error, testers.error].some(
    (e) => e instanceof PulseError && e.status === 403
  )
  if (forbidden) {
    return (
      <div className="plz-root">
        <div className="plz-container">
          <div className="plz-card plz-state">
            <div>
              <h3>Not authorized</h3>
              <p>Your account isn’t on the Mia Pulse allowlist. Ask an admin to add your email.</p>
              <Link className="plz-back" to="/home">
                ← Back to Mia
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const ov = overview.data
  const rows: TesterRow[] = testers.data?.testers ?? []
  const tp = topics.data

  return (
    <div className="plz-root">
      <div className="plz-container">
        {/* top bar */}
        <div className="plz-top">
          <div className="plz-title">
            <div className="plz-mark">M</div>
            <div>
              <h1>
                Beta usage <span className="plz-badge">Mia Pulse</span>
              </h1>
              <div className="plz-sub">How your beta testers are using Mia · internal</div>
            </div>
          </div>
          <div className="plz-tools">
            <div className="plz-seg" role="tablist" aria-label="Time range">
              {RANGES.map((r) => (
                <button
                  key={r}
                  className={r === range ? 'on' : ''}
                  onClick={() => setRange(r)}
                  aria-pressed={r === range}
                >
                  {r === 'all' ? 'All' : r}
                </button>
              ))}
            </div>
            <Link className="plz-back" to="/home">
              ← Back to Mia
            </Link>
          </div>
        </div>

        {/* filter bar — scope the whole dashboard by workspace and/or user */}
        <div className="plz-filters">
          <WorkspaceFilter workspaces={wsList} selected={selectedTenants} onChange={setSelectedTenants} />
          <UserFilter users={availableUsers} selected={userFilter} onChange={setUserFilter} />
          {filtered && (
            <button
              type="button"
              className="plz-fclear"
              onClick={() => {
                setSelectedTenants([])
                setUserFilter(null)
              }}
            >
              Clear
            </button>
          )}
          <span className="plz-fscope">
            {testers.data
              ? `${testers.data.count} ${testers.data.count === 1 ? 'user' : 'users'}${filtered ? ' in view' : ''}`
              : ''}
          </span>
        </div>

        {/* KPI strip */}
        <div className="plz-kpis">
          <div className="plz-card plz-kpi">
            <div className="plz-lab">Active testers</div>
            <div className="plz-val plz-num">
              {ov ? ov.active_testers.value : '—'}
              {ov && <small> / {ov.active_testers.total}</small>}
            </div>
            {ov && <DeltaLine metric={ov.active_testers} unit="" />}
          </div>
          <div className="plz-card plz-kpi">
            <div className="plz-lab">Questions asked</div>
            <div className="plz-val plz-num">{ov ? ov.questions.value : '—'}</div>
            {ov && <DeltaLine metric={ov.questions} unit="" />}
          </div>
          <div className="plz-card plz-kpi">
            <div className="plz-lab">Campaigns built</div>
            <div className="plz-val plz-num">{ov ? ov.campaigns_built.value : '—'}</div>
            {ov && <DeltaLine metric={ov.campaigns_built} unit="" />}
          </div>
          <div className="plz-card plz-kpi">
            <div className="plz-lab">Median session</div>
            <div className="plz-val plz-num">{ov ? formatDuration(ov.median_session_seconds.value) : '—'}</div>
            {ov && <DeltaLine metric={ov.median_session_seconds} unit="sec" />}
          </div>
          <div
            className="plz-card plz-kpi"
            title="Estimated Anthropic API spend for chat turns. Token usage is recorded from 27 Jul 2026 — earlier questions aren't counted."
          >
            <div className="plz-lab">Est. LLM cost</div>
            <div className="plz-val plz-num">
              {ov ? formatMoney(ov.est_cost_usd.value) : '—'}
              {ov && <small> {formatTokens(ov.tokens.value)} tok</small>}
            </div>
            {ov && <DeltaLine metric={ov.est_cost_usd} unit="usd" />}
          </div>
        </div>

        {/* main columns */}
        <div className="plz-cols">
          <div className="plz-stack">
            {/* chart */}
            <div className="plz-card">
              <div className="plz-card-h">
                <h2>Questions per day</h2>
                <span className="plz-hint">
                  <span style={{ color: 'var(--color-orange-500)', fontWeight: 700 }}>■</span> today
                </span>
              </div>
              <div className="plz-chart">
                {timeseries.data ? <QuestionsChart points={timeseries.data.points} /> : <Spinner />}
              </div>
            </div>

            {/* tester table */}
            <div className="plz-card">
              <div className="plz-card-h">
                <h2>Testers</h2>
                <span className="plz-hint">{testers.data ? `${testers.data.count} total` : ''}</span>
              </div>
              {testers.isLoading ? (
                <Spinner />
              ) : rows.length ? (
                <table className="plz-table">
                  <thead>
                    <tr>
                      <th>Tester</th>
                      <th className="r">Questions</th>
                      <th className="r">Cost</th>
                      <th className="r">Last active</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.google_user_id}
                        className={`plz-trow${r.google_user_id === selectedId ? ' sel' : ''}`}
                        onClick={() => setSelectedId(r.google_user_id)}
                      >
                        <td>
                          <div className="plz-uid">
                            <div
                              className="plz-av"
                              style={{ width: 30, height: 30, fontSize: 12, background: avatarColor(r.email || r.google_user_id) }}
                            >
                              {initials(r.name)}
                            </div>
                            <div>
                              <div className="plz-nm">{r.name}</div>
                              <div className="plz-tn">{r.tenant || 'No workspace'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="r plz-big plz-num">{r.questions_in_range}</td>
                        <td
                          className="r plz-muted plz-num"
                          title={`${formatTokens(r.tokens_in_range)} tokens (tracked turns)`}
                        >
                          {formatMoney(r.cost_in_range)}
                        </td>
                        <td className="r plz-muted">{timeAgo(r.last_active)}</td>
                        <td>
                          <StatusPill status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="plz-empty">No testers found for this range.</div>
              )}
            </div>
          </div>

          {/* detail */}
          <DetailPane sessionId={sessionId} googleUserId={selectedId} filter={filter} />
        </div>

        {/* topics */}
        <div className="plz-card plz-topics">
          <div className="plz-card-h" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <h2>What testers ask Mia to do</h2>
            <span className="plz-hint">
              {tp ? `${tp.total_questions} questions · ${tp.campaign_builder.pct}% in the campaign builder` : ''}
            </span>
          </div>
          {topics.isLoading ? (
            <Spinner />
          ) : tp && tp.topics.length ? (
            tp.topics.slice(0, 8).map((t) => (
              <div className="plz-topic" key={t.key}>
                <span className="plz-tlabel">{t.label}</span>
                <span className="plz-track">
                  <span className="plz-fill" style={{ width: `${Math.max(3, t.pct)}%` }} />
                </span>
                <span className="plz-tn2 plz-num">
                  {t.count} · {t.pct}%
                </span>
              </div>
            ))
          ) : (
            <div className="plz-empty">No questions in this range yet.</div>
          )}
        </div>

        {/* message feedback — thumbs up/down + issue reports from chat */}
        <FeedbackSection
          summary={feedbackSummary.data}
          items={feedbackRecent.data?.items ?? []}
          isLoading={feedbackSummary.isLoading || feedbackRecent.isLoading}
          onSelectUser={(id) => id && setSelectedId(id)}
        />

        <div className="plz-foot">
          Mia Pulse · internal beta-usage view · reads chat history, activity, quick-insights &amp;
          message-feedback data.
        </div>
      </div>
    </div>
  )
}

export default PulseView
