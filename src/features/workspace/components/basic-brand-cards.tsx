import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '../../../components/spinner'
import { Trash01 } from '../../../components/icon/trash-01'
import { UserAvatar } from '../../../components/user-avatar'
import { useToast } from '../../../contexts/toast-context'
import {
  fetchMarketingContext,
  saveManualOverrides,
} from '../../marketing-context/services/marketing-context-service'
import type { BrandGuideExtracted } from '../../marketing-context/types'
import {
  deleteLearnedRule,
  deletePerson,
  fetchLearnedRules,
  fetchPeople,
  resetLearnedRules,
  updateLearnedRule,
  updatePerson,
  type LearnedRule,
  type WorkspacePerson,
} from '../services/basic-brand-service'

/**
 * The slim Basic Brand tab (30 Sep 2026, docs2/MIA_CONVERSATION_AND_LEARNING_PLAN §3.5):
 * four plain questions about how Mia writes, the people she knows, and what she has
 * learned. The long Marketing Context list stays one tap away under "More".
 */

interface CardProps {
  sessionId: string
  tenantId: string
  canManage: boolean
}

const ghost =
  'px-2.5 py-1.5 border border-primary rounded-lg paragraph-xs text-secondary hover:bg-tertiary transition-colors disabled:opacity-50'
const input =
  'w-full px-3 py-2 border border-secondary rounded-lg paragraph-sm bg-primary text-primary disabled:opacity-60'

const Muted = ({ children }: { children: React.ReactNode }) => (
  <p className="paragraph-xs text-quaternary">{children}</p>
)

// --------------------------------------------------------------------------- //
// How Mia writes for you                                                       //
// --------------------------------------------------------------------------- //
type WriteKey = 'one_liner' | 'target_audience' | 'brand_voice' | 'voice_dont'

const QUESTIONS: Array<{ key: WriteKey; label: string; hint: string; list?: boolean }> = [
  { key: 'one_liner', label: 'What you do', hint: 'e.g. Family bakery in Stellenbosch, sourdough and cakes' },
  { key: 'target_audience', label: "Who it's for", hint: 'e.g. Locals, families, friends who follow along' },
  { key: 'brand_voice', label: 'How you sound', hint: 'e.g. Warm, chatty, a bit cheeky' },
  { key: 'voice_dont', label: 'Words or things to avoid', hint: 'One per line, e.g. "cheap", no politics', list: true },
]

export function HowMiaWritesCard({ sessionId, tenantId, canManage }: CardProps) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const key = ['marketing-context', tenantId]
  const q = useQuery({
    queryKey: key,
    queryFn: () => fetchMarketingContext(sessionId, tenantId),
    enabled: Boolean(sessionId && tenantId),
  })
  const current = (k: WriteKey): string => {
    const ctx = q.data
    const v = (ctx?.manual_overrides?.[k] ?? ctx?.brand_guide_extracted?.[k] ?? null) as
      | string
      | string[]
      | null
    return Array.isArray(v) ? v.join('\n') : v || ''
  }
  const [draft, setDraft] = useState<Record<WriteKey, string> | null>(null)
  useEffect(() => {
    if (q.data && draft === null) {
      setDraft({
        one_liner: current('one_liner'),
        target_audience: current('target_audience'),
        brand_voice: current('brand_voice'),
        voice_dont: current('voice_dont'),
      })
    }
    // current() reads q.data; the draft is seeded once and then belongs to the person typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data])

  const save = useMutation({
    mutationFn: async (d: Record<WriteKey, string>) => {
      const overrides: Partial<BrandGuideExtracted> = {
        one_liner: d.one_liner.trim() || null,
        target_audience: d.target_audience.trim() || null,
        brand_voice: d.brand_voice.trim() || null,
        voice_dont: d.voice_dont
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      }
      await saveManualOverrides(sessionId, overrides, tenantId)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key })
      showToast('success', 'Saved. Mia writes with this from now on.')
    },
    onError: () => showToast('error', "Couldn't save that. Try again in a moment."),
  })

  if (q.isLoading || (q.data && !draft)) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="sm" />
      </div>
    )
  }
  if (q.isError) {
    return (
      <div className="space-y-2">
        <Muted>Couldn't load this right now.</Muted>
        <button type="button" className={ghost} onClick={() => void q.refetch()}>
          Try again
        </button>
      </div>
    )
  }
  const d = draft ?? { one_liner: '', target_audience: '', brand_voice: '', voice_dont: '' }
  const dirty = QUESTIONS.some((f) => d[f.key] !== current(f.key))
  return (
    <div className="space-y-3">
      {QUESTIONS.map((f) => (
        <label key={f.key} className="block space-y-1">
          <span className="subheading-md text-primary">{f.label}</span>
          <textarea
            className={input}
            rows={f.list ? 3 : 2}
            value={d[f.key]}
            placeholder={f.hint}
            disabled={!canManage}
            onChange={(e) => setDraft({ ...d, [f.key]: e.target.value })}
          />
        </label>
      ))}
      {canManage && (
        <div className="flex justify-end">
          <button
            type="button"
            className="px-3 py-2 bg-brand-solid text-primary-onbrand rounded-lg subheading-md disabled:opacity-50"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate(d)}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

// --------------------------------------------------------------------------- //
// People                                                                        //
// --------------------------------------------------------------------------- //
export function PeopleCard({ sessionId, tenantId, canManage }: CardProps) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const key = ['workspace-people', tenantId]
  const q = useQuery({
    queryKey: key,
    queryFn: () => fetchPeople(sessionId, tenantId),
    enabled: Boolean(sessionId && tenantId),
  })
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ display_name: '', relation: '' })
  const save = useMutation({
    mutationFn: (p: WorkspacePerson) => updatePerson(sessionId, tenantId, p.person_id, form),
    onSuccess: () => {
      setEditing(null)
      void qc.invalidateQueries({ queryKey: key })
    },
    onError: () => showToast('error', "Couldn't save that. Try again in a moment."),
  })
  const forget = useMutation({
    mutationFn: (p: WorkspacePerson) => deletePerson(sessionId, tenantId, p.person_id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key })
      showToast('success', 'Forgotten, photos and all.')
    },
    onError: () => showToast('error', "Couldn't remove them. Try again in a moment."),
  })

  if (q.isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="sm" />
      </div>
    )
  }
  if (q.isError) {
    return (
      <div className="space-y-2">
        <Muted>Couldn't load the people Mia knows right now.</Muted>
        <button type="button" className={ghost} onClick={() => void q.refetch()}>
          Try again
        </button>
      </div>
    )
  }
  const people = q.data ?? []
  if (!people.length) {
    return (
      <Muted>
        Nobody yet. On WhatsApp, send Mia a photo and say who it is ("this is Roger, my husband"), and
        she'll use them in pictures when you ask.
      </Muted>
    )
  }
  return (
    <div className="divide-y divide-tertiary">
      {people.map((p) => (
        <div key={p.person_id} className="flex items-center gap-3 py-2.5">
          {p.faces?.[0]?.crop_url ? (
            <img src={p.faces[0].crop_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <UserAvatar name={p.display_name} size="md" fallbackClassName="bg-quaternary text-tertiary" />
          )}
          {editing === p.person_id ? (
            <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
              <input
                className={input}
                value={form.display_name}
                aria-label="Name"
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
              <input
                className={input}
                value={form.relation}
                placeholder="e.g. husband, grandson"
                aria-label="Who they are to you"
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <p className="subheading-md text-primary truncate">
                {p.display_name}
                {p.is_owner ? ' (you)' : ''}
              </p>
              <p className="paragraph-xs text-quaternary truncate">
                {[p.relation, p.faces?.length ? `${p.faces.length} photo${p.faces.length > 1 ? 's' : ''}` : 'no photo yet']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          )}
          {canManage && (
            <div className="flex items-center gap-2 shrink-0">
              {editing === p.person_id ? (
                <>
                  <button type="button" className={ghost} onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={ghost}
                    disabled={save.isPending || !form.display_name.trim()}
                    onClick={() => save.mutate(p)}
                  >
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={ghost}
                    onClick={() => {
                      setForm({ display_name: p.display_name, relation: p.relation ?? '' })
                      setEditing(p.person_id)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${ghost} text-error`}
                    aria-label={`Forget ${p.display_name}`}
                    disabled={forget.isPending}
                    onClick={() => {
                      if (window.confirm(`Forget ${p.display_name}? Mia deletes their photos too.`)) forget.mutate(p)
                    }}
                  >
                    <Trash01 size={14} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// --------------------------------------------------------------------------- //
// What Mia has learned                                                          //
// --------------------------------------------------------------------------- //
export function LearnedRulesCard({ sessionId, tenantId, canManage }: CardProps) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const key = ['learned-rules', tenantId]
  const q = useQuery({
    queryKey: key,
    queryFn: () => fetchLearnedRules(sessionId, tenantId),
    enabled: Boolean(sessionId && tenantId),
  })
  const refresh = () => void qc.invalidateQueries({ queryKey: key })
  const onError = () => showToast('error', "Couldn't change that. Try again in a moment.")
  const toggle = useMutation({
    mutationFn: (r: LearnedRule) =>
      updateLearnedRule(sessionId, tenantId, r.id, { status: r.status === 'active' ? 'off' : 'active' }),
    onSuccess: refresh,
    onError,
  })
  const remove = useMutation({
    mutationFn: (r: LearnedRule) => deleteLearnedRule(sessionId, tenantId, r.id),
    onSuccess: refresh,
    onError,
  })
  const reset = useMutation({
    mutationFn: () => resetLearnedRules(sessionId, tenantId),
    onSuccess: () => {
      refresh()
      showToast('success', 'Mia has forgotten what she learned. She starts fresh from your next posts.')
    },
    onError,
  })

  if (q.isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="sm" />
      </div>
    )
  }
  if (q.isError) {
    return (
      <div className="space-y-2">
        <Muted>Couldn't load this right now.</Muted>
        <button type="button" className={ghost} onClick={() => void q.refetch()}>
          Try again
        </button>
      </div>
    )
  }
  const rules = q.data ?? []
  if (!rules.length) {
    return (
      <Muted>
        Nothing yet. When you keep changing Mia's posts the same way (shorter, no hashtags, more
        emoji), she notices, tells you, and writes that way from then on.
      </Muted>
    )
  }
  return (
    <div className="space-y-2">
      <div className="divide-y divide-tertiary">
        {rules.map((r) => (
          <div key={r.id} className="flex items-start gap-3 py-2.5">
            <div className="flex-1 min-w-0">
              <p className={`paragraph-sm ${r.status === 'active' ? 'text-primary' : 'text-quaternary line-through'}`}>
                {r.text}
              </p>
              <p className="paragraph-xs text-quaternary">
                {r.status === 'suggested'
                  ? 'Suggested, not on yet'
                  : r.evidence_count > 0
                    ? `Learned from ${r.evidence_count} of your changes`
                    : 'You told Mia this'}
              </p>
            </div>
            {canManage && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className={ghost}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate(r)}
                >
                  {r.status === 'active' ? 'Turn off' : 'Turn on'}
                </button>
                <button
                  type="button"
                  className={`${ghost} text-error`}
                  aria-label="Delete this rule"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(r)}
                >
                  <Trash01 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {canManage && (
        <button
          type="button"
          className="paragraph-xs text-quaternary hover:text-secondary"
          disabled={reset.isPending}
          onClick={() => {
            if (window.confirm('Forget everything Mia has learned about how you like your posts?')) reset.mutate()
          }}
        >
          Reset what Mia learned
        </button>
      )}
    </div>
  )
}
