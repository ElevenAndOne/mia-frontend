import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createNote, fetchNotes, restoreNote, retireNote } from '../services/notes-api'
import type { MiaNote, NoteKind, NoteScope } from '../types'

export const notesKey = (tenantId: string, scope: NoteScope, campaignId: string | null) =>
  ['notes', tenantId, scope, campaignId] as const

// One list per (scope, campaign). Retired notes are fetched too so the tab can show
// both counts without a second round-trip; the component filters.
export const useNotes = (
  sessionId: string | null,
  tenantId: string | null | undefined,
  scope: NoteScope,
  campaignId: string | null = null
) => {
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const query = useQuery({
    queryKey: notesKey(tenantId ?? '', scope, campaignId),
    queryFn: ({ signal }) =>
      fetchNotes(sessionId!, tenantId!, { scope, campaignId, includeRetired: true }, signal),
    enabled: !!sessionId && !!tenantId && (scope === 'workspace' || !!campaignId),
  })

  // Any write can move a note between scopes (promote), so invalidate every notes
  // list for the tenant rather than just this one.
  const refresh = useCallback(() => {
    if (tenantId) void queryClient.invalidateQueries({ queryKey: ['notes', tenantId] })
  }, [queryClient, tenantId])

  const guard = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    if (!sessionId || !tenantId) return null
    try {
      return await fn()
    } finally {
      refresh()
    }
  }

  const add = async (text: string, kind: NoteKind) => {
    setSaving(true)
    try {
      return await guard(() => createNote(sessionId!, tenantId!, { text, kind, scope, campaignId }))
    } finally {
      setSaving(false)
    }
  }

  const retire = async (note: MiaNote) => {
    setBusyId(note.note_id)
    try {
      return await guard(() => retireNote(sessionId!, tenantId!, note.note_id))
    } finally {
      setBusyId(null)
    }
  }

  const restore = async (note: MiaNote) => {
    setBusyId(note.note_id)
    try {
      return await guard(() => restoreNote(sessionId!, tenantId!, note.note_id))
    } finally {
      setBusyId(null)
    }
  }

  // "Make brand-wide": the rule turned out to be permanent. Copy it to workspace
  // scope and retire the campaign copy so it isn't read twice.
  const promote = async (note: MiaNote) => {
    setBusyId(note.note_id)
    try {
      return await guard(async () => {
        const created = await createNote(sessionId!, tenantId!, {
          text: note.text,
          kind: note.kind,
          scope: 'workspace',
        })
        await retireNote(sessionId!, tenantId!, note.note_id)
        return created
      })
    } finally {
      setBusyId(null)
    }
  }

  const all = query.data ?? []
  return {
    notes: all.filter((n) => n.is_active),
    retired: all.filter((n) => !n.is_active),
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    saving,
    busyId,
    add,
    retire,
    restore,
    promote,
    refresh,
  }
}
