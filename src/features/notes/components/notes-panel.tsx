import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '../../../components/spinner'
import { useToast } from '../../../contexts/toast-context'
import { useNotes } from '../hooks/use-notes'
import { NOTE_GROUPS, NOTE_KIND_META, type MiaNote, type NoteKind, type NoteScope } from '../types'

interface Props {
  sessionId: string | null
  tenantId: string | null | undefined
  scope: NoteScope
  campaignId?: string | null
  title: string
  description: string
  /** Placeholder for the composer — says what "here" means (this campaign / every campaign). */
  placeholder: string
}

const fmtDate = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Who/where a note came from. `created_by` is an id or an email — only an email is
// worth showing to a person.
const provenance = (n: MiaNote) => {
  const origin =
    n.created_by_kind === 'chat' || n.created_by_kind === 'builder'
      ? 'From chat'
      : n.created_by_kind === 'ui'
        ? 'Added here'
        : n.created_by_kind === 'claude'
          ? 'From Claude'
          : n.created_by_kind === 'whatsapp'
            ? 'From WhatsApp'
            : 'Set up by Mia'
  const who = n.created_by && n.created_by.includes('@') ? n.created_by.split('@')[0] : null
  return [origin, who, fmtDate(n.created_at)].filter(Boolean).join(' · ')
}

const KindChip = ({ kind }: { kind: NoteKind }) => {
  const meta = NOTE_KIND_META[kind]
  return (
    <span title={meta.hint} className={`px-1.5 py-0.5 rounded label-xs shrink-0 ${meta.tone}`}>
      {meta.label}
    </span>
  )
}

const ScopeChip = ({ scope }: { scope: NoteScope }) => (
  <span className="px-1.5 py-0.5 rounded bg-primary border border-secondary label-xs text-quaternary shrink-0">
    {scope === 'campaign' ? 'This campaign' : 'Whole workspace'}
  </span>
)

const actionCls =
  'label-xs px-2 py-1 rounded-lg border border-tertiary text-secondary hover:bg-tertiary disabled:opacity-50 whitespace-nowrap'

const NoteRow = ({
  note,
  busy,
  onRetire,
  onRestore,
  onPromote,
  onOpenChat,
}: {
  note: MiaNote
  busy: boolean
  onRetire: () => void
  onRestore: () => void
  onPromote?: () => void
  onOpenChat?: () => void
}) => (
  <div
    className={`rounded-xl border bg-primary px-4 py-3 flex items-start justify-between gap-4 ${
      note.is_active ? 'border-tertiary' : 'border-dashed border-tertiary opacity-70'
    }`}
  >
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <KindChip kind={note.kind} />
        <ScopeChip scope={note.scope} />
      </div>
      <p className="paragraph-sm text-primary mt-1.5">{note.text}</p>
      <p className="paragraph-xs text-quaternary mt-1">
        {note.is_active
          ? provenance(note)
          : `Retired ${fmtDate(note.retired_at) ?? ''}${
              note.retired_by && note.retired_by.includes('@')
                ? ` by ${note.retired_by.split('@')[0]}`
                : ''
            } · originally ${provenance(note).toLowerCase()}`}
        {onOpenChat && (
          <>
            {' · '}
            <button onClick={onOpenChat} className="text-utility-brand-700 hover:underline">
              open the conversation
            </button>
          </>
        )}
      </p>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      {busy ? (
        <Spinner size="sm" />
      ) : note.is_active ? (
        <>
          {onPromote && (
            <button
              onClick={onPromote}
              title="Apply this rule to every campaign in the workspace"
              className={actionCls}
            >
              Make brand-wide
            </button>
          )}
          <button
            onClick={onRetire}
            title="Stop applying this rule (kept in history)"
            className={actionCls}
          >
            Retire
          </button>
        </>
      ) : (
        <button onClick={onRestore} className={actionCls}>
          Restore
        </button>
      )}
    </div>
  </div>
)

// Everything Mia has been told to remember for one scope: read, add, retire. This is
// a window onto the same list she reads on every chat turn, not a separate system.
export const NotesPanel = ({
  sessionId,
  tenantId,
  scope,
  campaignId = null,
  title,
  description,
  placeholder,
}: Props) => {
  const { notes, retired, loading, error, saving, busyId, add, retire, restore, promote } =
    useNotes(sessionId, tenantId, scope, campaignId)
  const { showToast } = useToast()
  const navigate = useNavigate()
  // Same hand-off the sidebar's Recent Chats uses: /home picks the conversation up from state.
  const openChat = (n: MiaNote) =>
    n.source_conversation_id
      ? () => navigate('/home', { state: { loadConversationId: n.source_conversation_id } })
      : undefined
  const [tab, setTab] = useState<'active' | 'retired'>('active')
  const [kindFilter, setKindFilter] = useState<NoteKind | 'all'>('all')
  const [draft, setDraft] = useState('')
  // Compact view (no title) starts on "Must follow"; the full panel keeps Decision.
  const [kind, setKind] = useState<NoteKind>(title ? 'decision' : 'constraint')

  const grouped = useMemo(
    () =>
      NOTE_GROUPS.map((g) => ({
        ...g,
        items: notes.filter(
          (n) => g.kinds.includes(n.kind) && (kindFilter === 'all' || n.kind === kindFilter)
        ),
      })).filter((g) => g.items.length > 0),
    [notes, kindFilter]
  )

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      showToast('success', ok)
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  const submit = async () => {
    const text = draft.trim()
    if (!text) return
    try {
      const created = await add(text, kind)
      if (created && !created.created) {
        showToast('info', 'Mia already has that rule — nothing added.')
      } else {
        showToast(
          'success',
          scope === 'campaign' ? 'Noted for this campaign' : 'Noted for the whole workspace'
        )
      }
      setDraft('')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not save the note')
    }
  }

  if (!title) {
    // Compact (agency Settings → Mia, 19 Nov 2026): two kinds instead of five, one clean line per
    // rule, retired ones behind a link. Hard rules are the ones Mia must follow; the rest she
    // keeps in mind. Campaign Setup → Rules keeps the full panel.
    const hard = notes.filter((n) => n.kind === 'constraint' || n.kind === 'avoid')
    const soft = notes.filter((n) => !(n.kind === 'constraint' || n.kind === 'avoid'))
    const must = kind === 'constraint' || kind === 'avoid'
    const item = (n: MiaNote) => (
      <li key={n.note_id} className="group flex items-start gap-3 py-2.5">
        <span className="min-w-0 flex-1">
          <span className="block paragraph-sm text-primary">{n.text}</span>
          <span className="block paragraph-xs text-quaternary mt-0.5">
            {n.is_active ? provenance(n) : `Retired ${fmtDate(n.retired_at) ?? ''}`}
            {openChat(n) && (
              <>
                {' · '}
                <button onClick={openChat(n)} className="hover:underline hover:text-secondary">
                  open chat
                </button>
              </>
            )}
          </span>
        </span>
        {busyId === n.note_id ? (
          <Spinner size="sm" />
        ) : (
          <button
            onClick={() =>
              void (n.is_active
                ? run(() => retire(n), 'Retired')
                : run(() => restore(n), 'Restored'))
            }
            className="shrink-0 paragraph-xs text-quaternary hover:text-primary opacity-70 group-hover:opacity-100"
          >
            {n.is_active ? 'Retire' : 'Restore'}
          </button>
        )}
      </li>
    )
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-secondary bg-secondary p-3 flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submit()
            }}
            placeholder={placeholder}
            rows={2}
            maxLength={500}
            className="w-full paragraph-sm text-primary bg-primary border border-secondary rounded-lg px-3 py-2 outline-none focus:border-brand-solid resize-none placeholder:text-quaternary"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <div role="radiogroup" aria-label="Kind of rule" className="inline-flex rounded-lg bg-tertiary/60 p-0.5 gap-0.5">
              {(
                [
                  ['constraint', 'Must follow'],
                  ['preference', 'Good to know'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={(k === 'constraint') === must}
                  onClick={() => setKind(k)}
                  className={`px-3 py-1 rounded-md paragraph-xs transition-all ${
                    (k === 'constraint') === must ? 'bg-quaternary text-primary shadow-sm font-medium' : 'text-tertiary hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="flex-1" />
            <button
              onClick={() => void submit()}
              disabled={saving || !draft.trim()}
              className="px-3 py-1.5 bg-brand-solid text-primary-onbrand rounded-lg paragraph-sm font-medium hover:bg-brand-solid-hover disabled:opacity-50"
            >
              {saving ? <Spinner size="sm" /> : 'Add rule'}
            </button>
          </div>
        </div>
        {loading && <Spinner size="sm" />}
        {error && <p className="paragraph-xs text-utility-error-500">{error}</p>}
        {!loading && notes.length === 0 && (
          <p className="paragraph-xs text-quaternary">None yet. Tell Mia one in chat or add it here.</p>
        )}
        {hard.length > 0 && (
          <div>
            <p className="paragraph-xs font-medium text-tertiary">Must follow</p>
            <ul className="flex flex-col divide-y divide-secondary">{hard.map(item)}</ul>
          </div>
        )}
        {soft.length > 0 && (
          <div>
            <p className="paragraph-xs font-medium text-tertiary">Good to know</p>
            <ul className="flex flex-col divide-y divide-secondary">{soft.map(item)}</ul>
          </div>
        )}
        {retired.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setTab(tab === 'retired' ? 'active' : 'retired')}
              className="paragraph-xs text-quaternary hover:text-secondary"
            >
              {tab === 'retired' ? 'Hide retired' : `Show retired (${retired.length})`}
            </button>
            {tab === 'retired' && <ul className="flex flex-col divide-y divide-secondary opacity-70">{retired.map(item)}</ul>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* No heading when the page around it gives one (agency Settings → Mia, 19 Nov 2026). */}
      {title ? (
        <div>
          <h2 className="heading-sm text-primary">{title}</h2>
          {description ? <p className="paragraph-sm text-secondary mt-1">{description}</p> : null}
        </div>
      ) : null}

      {/* Composer */}
      <div className="rounded-xl border border-tertiary bg-primary p-3 flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submit()
          }}
          placeholder={placeholder}
          rows={2}
          maxLength={500}
          className="w-full paragraph-sm text-primary bg-secondary border border-tertiary rounded-lg px-3 py-2 outline-none focus:border-utility-brand-400 resize-none placeholder:text-quaternary"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as NoteKind)}
            title={NOTE_KIND_META[kind].hint}
            className="paragraph-xs text-secondary bg-secondary border border-tertiary rounded-lg px-2 py-1.5 outline-none focus:border-utility-brand-400"
          >
            {(Object.keys(NOTE_KIND_META) as NoteKind[]).map((k) => (
              <option key={k} value={k}>
                {NOTE_KIND_META[k].label}
              </option>
            ))}
          </select>
          <span className="paragraph-xs text-quaternary">{NOTE_KIND_META[kind].hint}</span>
          <span className="flex-1" />
          <span className="paragraph-xs text-quaternary">{draft.length}/500</span>
          <button
            onClick={() => void submit()}
            disabled={saving || !draft.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-solid text-primary-onbrand rounded-lg label-sm hover:bg-brand-solid-hover transition-colors disabled:opacity-50"
          >
            {saving ? <Spinner size="sm" /> : 'Add rule'}
          </button>
        </div>
      </div>

      {/* Active / Retired */}
      <div className="flex items-center gap-1.5">
        {(['active', 'retired'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2.5 py-1 rounded-full label-xs border transition-colors ${
              tab === t
                ? 'bg-brand-solid text-primary-onbrand border-transparent'
                : 'border-tertiary text-secondary hover:bg-tertiary'
            }`}
          >
            {t === 'active' ? `Active · ${notes.length}` : `Retired · ${retired.length}`}
          </button>
        ))}
        {tab === 'active' && notes.length > 3 && (
          <>
            <span className="w-px h-4 bg-tertiary mx-1" aria-hidden />
            {(['all', ...Object.keys(NOTE_KIND_META)] as Array<NoteKind | 'all'>).map((k) => {
              const count = k === 'all' ? notes.length : notes.filter((n) => n.kind === k).length
              if (k !== 'all' && count === 0) return null
              return (
                <button
                  key={k}
                  onClick={() => setKindFilter(k)}
                  className={`px-2.5 py-1 rounded-full label-xs border transition-colors ${
                    kindFilter === k
                      ? 'bg-brand-solid text-primary-onbrand border-transparent'
                      : 'border-tertiary text-secondary hover:bg-tertiary'
                  }`}
                >
                  {k === 'all' ? 'All kinds' : `${NOTE_KIND_META[k].label} · ${count}`}
                </button>
              )
            })}
          </>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Spinner size="md" variant="dark" />
        </div>
      )}
      {error && <p className="paragraph-xs text-utility-error-500">{error}</p>}

      {!loading && tab === 'active' && notes.length === 0 && (
        <div className="rounded-xl border border-dashed border-tertiary p-5 text-center">
          <p className="paragraph-sm text-secondary">Nothing remembered yet.</p>
          <p className="paragraph-xs text-quaternary mt-1">
            Tell Mia a rule in chat (“never use the word stockist”) or add one above — it will apply
            in every future conversation{scope === 'campaign' ? ' about this campaign' : ''}.
          </p>
        </div>
      )}

      {tab === 'active' &&
        grouped.map((g) => (
          <div key={g.title} className="flex flex-col gap-2">
            <p className="label-xs text-quaternary uppercase tracking-[0.12em]">{g.title}</p>
            {g.items.map((n) => (
              <NoteRow
                key={n.note_id}
                note={n}
                busy={busyId === n.note_id}
                onRetire={() => void run(() => retire(n), 'Retired — Mia will stop applying it')}
                onRestore={() => void run(() => restore(n), 'Restored')}
                onPromote={
                  scope === 'campaign'
                    ? () => void run(() => promote(n), 'Now applies to every campaign')
                    : undefined
                }
                onOpenChat={openChat(n)}
              />
            ))}
          </div>
        ))}

      {!loading && tab === 'retired' && retired.length === 0 && (
        <p className="paragraph-xs text-quaternary text-center py-6">No retired notes.</p>
      )}
      {tab === 'retired' &&
        retired.map((n) => (
          <NoteRow
            key={n.note_id}
            note={n}
            busy={busyId === n.note_id}
            onRetire={() => undefined}
            onRestore={() => void run(() => restore(n), 'Restored — Mia will apply it again')}
            onOpenChat={openChat(n)}
          />
        ))}
    </div>
  )
}
