import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import {
  approveRecommendation,
  dismissRecommendation,
  redraftRecommendation,
  scheduleDraft as scheduleDraftRequest,
  type ScheduleDraftInput,
  fetchLatestMemo,
} from '../services/memo-service'
import type { MemoRecommendation } from '../types'
import { normalizeKind } from '../utils/memo-format'

// Open items lead with the most urgent kind, then the most money at stake — the
// same ranking the memo used to decide what to show at all.
const KIND_RANK: Record<string, number> = { optimise: 0, protect: 1, grow: 2, info: 3 }

const value = (rec: MemoRecommendation): number =>
  rec.evidence?.impact ?? rec.evidence?.stake ?? 0

const decidedAt = (rec: MemoRecommendation): number => {
  const stamp = rec.applied_at ?? rec.decided_at
  return stamp ? new Date(stamp).getTime() : 0
}

export const useMemoPage = () => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id ?? null
  const role = activeWorkspace?.role
  const canManage = role === 'owner' || role === 'admin'
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [busyRecId, setBusyRecId] = useState<string | null>(null)

  const memoQuery = useQuery({
    queryKey: ['memo-latest', tenantId],
    queryFn: ({ signal }) => fetchLatestMemo(sessionId!, signal),
    enabled: !!sessionId && !!tenantId,
  })

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['memo-latest', tenantId] })
  }, [queryClient, tenantId])

  const approve = useCallback(
    async (recId: string) => {
      if (!sessionId) return
      try {
        setBusyRecId(recId)
        await approveRecommendation(sessionId, recId)
        showToast('success', 'Approved — Mia is executing the action')
        refresh()
        // The outcome (applied/failed) is written back by the backend watcher
        // shortly after the workflow completes — pick it up without user action.
        setTimeout(refresh, 8000)
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to approve')
      } finally {
        setBusyRecId(null)
      }
    },
    [sessionId, showToast, refresh],
  )

  const scheduleDraft = useCallback(
    async (recId: string, input: ScheduleDraftInput) => {
      if (!sessionId) return
      const result = await scheduleDraftRequest(sessionId, recId, input)
      showToast('success', result.message || 'Post scheduled — find it on the Posts page')
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      refresh()
      return result
    },
    [sessionId, showToast, refresh, queryClient],
  )

  const redraft = useCallback(
    async (recId: string) => {
      if (!sessionId) return
      setBusyRecId(recId)
      try {
        await redraftRecommendation(sessionId, recId)
        showToast('success', 'Mia wrote three new drafts')
        refresh()
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to redraft')
      } finally {
        setBusyRecId(null)
      }
    },
    [sessionId, showToast, refresh],
  )

  const dismiss = useCallback(
    async (recId: string) => {
      if (!sessionId) return
      try {
        setBusyRecId(recId)
        await dismissRecommendation(sessionId, recId)
        showToast('info', "Dismissed — Mia won't raise this again for a few weeks")
        refresh()
      } catch (err) {
        showToast('error', err instanceof Error ? err.message : 'Failed to dismiss')
      } finally {
        setBusyRecId(null)
      }
    },
    [sessionId, showToast, refresh],
  )

  const recommendations = memoQuery.data?.recommendations ?? []

  const open = useMemo(
    () =>
      recommendations
        .filter((r) => r.state === 'proposed')
        .sort(
          (a, b) =>
            (KIND_RANK[normalizeKind(a.kind)] ?? 9) - (KIND_RANK[normalizeKind(b.kind)] ?? 9) || value(b) - value(a),
        ),
    [recommendations],
  )

  // History reads newest first — what Mia did most recently, not what kind it was.
  const handled = useMemo(
    () =>
      recommendations
        .filter((r) => r.state !== 'proposed')
        .sort((a, b) => decidedAt(b) - decidedAt(a)),
    [recommendations],
  )

  return {
    memo: memoQuery.data ?? null,
    open,
    handled,
    isLoading: memoQuery.isLoading,
    error: memoQuery.error instanceof Error ? memoQuery.error.message : null,
    canManage,
    busyRecId,
    approve,
    dismiss,
    scheduleDraft,
    redraft,
    refresh,
  }
}
