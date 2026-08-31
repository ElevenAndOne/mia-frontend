import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../../contexts/session-context'
import { fetchLinkedContent, saveLinkedContent } from '../services/campaign-api'
import type { LinkedContent, LinkedContentSave } from '../types'

// Local edit state: action_id → set of selected candidate ids. Everything the user
// ticks or unticks lives here until they save, so the panel stays responsive and one
// save writes the whole campaign in a single request.
type Selection = Record<string, Set<string>>

function initialSelection(data: LinkedContent): Selection {
  const sel: Selection = {}
  for (const phase of data.phases) {
    for (const ch of phase.channels) {
      // Pre-tick both what is already linked and what the dates suggest — the point of
      // the screen is that accepting the suggestions is the default, not the chore.
      sel[ch.action_id] = new Set(
        ch.candidates.filter((c) => c.linked || c.suggested).map((c) => c.id)
      )
    }
  }
  return sel
}

export function useLinkedContent(campaignId: string, enabled: boolean) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const [data, setData] = useState<LinkedContent | null>(null)
  const [selection, setSelection] = useState<Selection>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Cache-first: the tab used to show a spinner on every visit. A previous load's result
  // is shown immediately and refreshed in the background; the user's unsaved ticks are
  // never overwritten by the refresh.
  const queryClient = useQueryClient()
  const cacheKey = useMemo(
    () => ['linked-content', tenantId, campaignId] as const,
    [tenantId, campaignId]
  )
  const dirtyRef = useRef(false)

  const load = useCallback(async () => {
    if (!sessionId || !tenantId || !campaignId) return
    const cached = queryClient.getQueryData<LinkedContent>(cacheKey)
    if (cached) {
      setData((prev) => prev ?? cached)
      setSelection((prev) => (Object.keys(prev).length ? prev : initialSelection(cached)))
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const d = await fetchLinkedContent(sessionId, tenantId, campaignId)
      queryClient.setQueryData(cacheKey, d)
      setData(d)
      if (!dirtyRef.current) setSelection(initialSelection(d))
    } catch {
      if (!cached) setError('Could not load linked content')
    } finally {
      setLoading(false)
    }
  }, [sessionId, tenantId, campaignId, queryClient, cacheKey])

  useEffect(() => {
    if (enabled) void load()
  }, [enabled, load])

  const toggle = useCallback((actionId: string, candidateId: string) => {
    setSelection((prev) => {
      const next = { ...prev }
      const set = new Set(next[actionId] ?? [])
      if (set.has(candidateId)) set.delete(candidateId)
      else set.add(candidateId)
      next[actionId] = set
      return next
    })
  }, [])

  const setChannel = useCallback((actionId: string, ids: string[]) => {
    setSelection((prev) => ({ ...prev, [actionId]: new Set(ids) }))
  }, [])

  // Unsaved when any channel's ticked set differs from what is stored server-side.
  const dirty = useMemo(() => {
    if (!data) return false
    return data.phases.some((p) =>
      p.channels.some((ch) => {
        const stored = new Set(ch.candidates.filter((c) => c.linked).map((c) => c.id))
        const current = selection[ch.action_id] ?? new Set<string>()
        return stored.size !== current.size || [...current].some((id) => !stored.has(id))
      })
    )
  }, [data, selection])

  const save = useCallback(
    async (override?: Selection) => {
      if (!data || !sessionId || !tenantId) return false
      const sel = override ?? selection
      setSaving(true)
      setError(null)
      try {
        const channels: LinkedContentSave[] = []
        for (const phase of data.phases) {
          for (const ch of phase.channels) {
            const picked = sel[ch.action_id] ?? new Set<string>()
            const byId = new Map(ch.candidates.map((c) => [c.id, c]))
            channels.push({
              action_id: ch.action_id,
              linked: [...picked].map((id) => ({
                id,
                name: byId.get(id)?.name ?? id,
              })),
              // A suggestion the user unticked is a decision, not an omission — record it
              // so next week's review doesn't propose the same thing again.
              dismissed: ch.candidates
                .filter((c) => c.suggested && !picked.has(c.id))
                .map((c) => ({ id: c.id, name: c.name })),
            })
          }
        }
        const res = await saveLinkedContent(sessionId, tenantId, campaignId, channels)
        if (!res.ok) throw new Error('save failed')
        await load()
        return true
      } catch {
        setError('Could not save — nothing was changed')
        return false
      } finally {
        setSaving(false)
      }
    },
    [data, selection, sessionId, tenantId, campaignId, load]
  )

  dirtyRef.current = dirty

  // "Accept" used to only tick boxes that were already pre-ticked, so it looked dead and
  // the real action (Save) was easy to miss. Accepting now ticks AND saves in one go.
  const acceptAndSave = useCallback(
    async (updates: Record<string, string[]>) => {
      const next: Selection = { ...selection }
      for (const [actionId, ids] of Object.entries(updates)) {
        next[actionId] = new Set([...(next[actionId] ?? []), ...ids])
      }
      setSelection(next)
      return save(next)
    },
    [selection, save]
  )

  return {
    data,
    selection,
    loading,
    saving,
    error,
    dirty,
    toggle,
    setChannel,
    save,
    acceptAndSave,
    reload: load,
  }
}
