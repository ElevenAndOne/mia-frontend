export type NoteScope = 'workspace' | 'campaign'
export type NoteKind = 'decision' | 'constraint' | 'preference' | 'avoid' | 'learning'

export interface MiaNote {
  note_id: string
  tenant_id: string
  campaign_id: string | null
  scope: NoteScope
  kind: NoteKind
  text: string
  source_conversation_id: string | null
  created_by: string | null
  created_by_kind: 'chat' | 'ui' | 'system'
  is_active: boolean
  created_at: string | null
  retired_at: string | null
  retired_by: string | null
}

export const NOTE_KIND_META: Record<NoteKind, { label: string; hint: string; tone: string }> = {
  constraint: {
    label: 'Constraint',
    hint: 'Hard rule — compliance, banned words, a fixed budget',
    tone: 'bg-utility-error-50 text-utility-error-700',
  },
  avoid: {
    label: 'Avoid',
    hint: "Don't do this again",
    tone: 'bg-utility-warning-50 text-utility-warning-700',
  },
  decision: {
    label: 'Decision',
    hint: 'An agreed direction',
    tone: 'bg-utility-brand-100 text-utility-brand-700',
  },
  preference: {
    label: 'Preference',
    hint: 'Softer taste — tone, style, format',
    tone: 'bg-tertiary text-secondary',
  },
  learning: {
    label: 'Learning',
    hint: 'Something observed that should shape future work',
    tone: 'bg-utility-success-50 text-utility-success-700',
  },
}

// Render order: hard rules first, soft ones after — the same order Mia reads them in.
export const NOTE_GROUPS: Array<{ title: string; kinds: NoteKind[] }> = [
  { title: 'Hard rules', kinds: ['constraint', 'avoid'] },
  { title: 'Direction', kinds: ['decision'] },
  { title: 'Preferences', kinds: ['preference'] },
  { title: "What we've learnt", kinds: ['learning'] },
]
