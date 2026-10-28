import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../contexts/session-context'
import * as api from './api'
import type { BriefField, BuildState, PlanOp } from './types'

export const buildKey = (tenantId: string | undefined, campaignId: string | undefined) => [
  'campaign-build',
  tenantId,
  campaignId,
]

const POLL_MS = 4000

/** The page's one source of truth. Polls while Mia is working on the brief or the plan,
 *  so a refresh (or another tab) always shows the same state the server has. */
export function useBuild(campaignId: string | undefined) {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const queryClient = useQueryClient()
  const key = buildKey(tenantId, campaignId)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Which press the error came from ("apply:<card id>"), so a card's error shows under that card only (local test 27 Oct:
  // a "Get prices" failure showed under an untouched card, reading as if the card had failed)
  const [errorAt, setErrorAt] = useState<string | null>(null)

  const query = useQuery({
    queryKey: key,
    queryFn: () => api.fetchBuild(sessionId!, tenantId!, campaignId!),
    enabled: !!sessionId && !!tenantId && !!campaignId,
    refetchInterval: (q) => {
      const s = q.state.data as BuildState | undefined
      if (q.state.status === 'error') return 15_000 // a failed read is tried again, so the page recovers on its own
      // also while Mia re-checks after a change, so the page shows the result when it lands (27 Oct)
      return s && ([s.brief_run, s.plan_run, s.words_run].some((r) => r?.status === 'running') || s.checking) ? POLL_MS : false
    },
  })

  // mia-cube's KPI list with this client's last results: for the picker and the Brief tab.
  // Re-read when a plan or brief lands, since that's when the client file behind it changes.
  const kpis = useQuery({
    queryKey: [...key, 'kpis', query.data?.plan_run?.run_id ?? null, query.data?.brief?.version ?? null],
    queryFn: () => api.fetchKpiOptions(sessionId!, tenantId!, campaignId!),
    enabled: !!sessionId && !!tenantId && !!campaignId && !!query.data?.brief,
    staleTime: 5 * 60 * 1000,
    refetchInterval: (q) => (q.state.status === 'error' ? 30_000 : false), // a failed read is tried again
  })

  const run = useCallback(
    async <T,>(label: string, fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(label)
      setError(null)
      setErrorAt(null)
      try {
        const out = await fn()
        await queryClient.invalidateQueries({ queryKey: key })
        return out
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
        setErrorAt(label)
        return undefined
      } finally {
        setBusy(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, tenantId, campaignId],
  )

  const ids = () => [sessionId!, tenantId!, campaignId!] as const

  return {
    state: query.data,
    loading: query.isPending,
    kpiGroups: kpis.data?.groups ?? [],
    // said in the picker, not "Loading…" forever (review 26 Oct)
    kpiError: kpis.error instanceof Error ? kpis.error.message : null,
    loadError: query.error instanceof Error ? query.error.message : null,
    busy,
    error,
    errorAt,
    clearError: () => {
      setError(null)
      setErrorAt(null)
    },
    saveBrief: (
      fields: Partial<Record<BriefField | 'playbook', unknown>>,
      name?: string,
      answered?: { id: string; answer: string | null }[],
    ) => run('brief', () => api.saveBrief(...ids(), fields, name, answered)),
    redraft: (answers: string[]) => run('redraft', () => api.redraftBrief(...ids(), answers)),
    makePlan: () => run('plan', () => api.makePlan(...ids())),
    keepPlan: () => run('keep', () => api.keepPlan(...ids())),
    skipQuestion: (id: string) => run(`skip:${id}`, () => api.skipQuestion(...ids(), id)),
    confirmBrief: (fields: string[]) => run('confirm', () => api.confirmBrief(...ids(), fields)),
    fillTargets: () => run('fill', () => api.fillTargets(...ids())),
    finalCheck: () => run('check', () => api.finalCheck(...ids())),
    applyChange: (id: string) => run(`apply:${id}`, () => api.applyChange(...ids(), id)),
    dropChange: (id: string) => run(`drop:${id}`, () => api.dropChange(...ids(), id)),
    editPlan: (ops: PlanOp[]) =>
      run('edit', async () => {
        const next = await api.editPlan(...ids(), ops)
        queryClient.setQueryData(key, next)
        return next
      }),
    approve: (pastFindings = false) => run('approve', () => api.approvePlan(...ids(), pastFindings)),
    reload: () => queryClient.invalidateQueries({ queryKey: key }),
    reprice: () => run('reprice', () => api.repricePlan(...ids())),
    writeWords: (jobIds?: string[], rewrite = false) => run('words', () => api.writeWords(...ids(), jobIds, rewrite)),
    discard: async () => {
      setBusy('discard')
      setError(null)
      try {
        await api.discardDraft(...ids())
        // Every list that shows campaigns re-reads, so a discarded draft is gone without a refresh (a PM's report,
        // 22 Oct: discarded campaigns stayed on screen until the page was reloaded).
        queryClient.removeQueries({ queryKey: key })
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['campaign-board'] }),
          queryClient.invalidateQueries({ queryKey: ['campaign-list'] }),
        ])
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not discard the draft')
        return false
      } finally {
        setBusy(null)
      }
    },
  }
}
