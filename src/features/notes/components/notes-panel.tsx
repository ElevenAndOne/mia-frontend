import { useMemo, useState } from 'react'
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
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

// Who/where a note came from. `created_by` is an id or an email — only an email is
// worth showing to a person.
const provenance = (n: MiaNote) => {
  const origin =
    n.created_by_kind === 'chat'
      ? 'From chat'
      : n.created_by_kind === 'ui'
        ? 'Added here'
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
}: {
  note: MiaNote
  busy: boolean
  onRetire: () => void
  onRestore: () => void
  onPromote?: () => void
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
  const [tab, setTab] = useState<'active' | 'retired'>('active')
  const [draft, setDraft] = useState('')
  const [kind, setKind] = useState<NoteKind>('decision')

  const grouped = useMemo(
    () =>
      NOTE_GROUPS.map((g) => ({
        ...g,
        items: notes.filter((n) => g.kinds.includes(n.kind)),
      })).filter((g) => g.items.length > 0),
    [notes]
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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="heading-sm text-primary">{title}</h2>
        <p className="paragraph-sm text-secondary mt-1">{description}</p>
      </div>

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
            {saving ? <Spinner size="sm" /> : 'Add note'}
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
          />
        ))}
    </div>
  )
}
