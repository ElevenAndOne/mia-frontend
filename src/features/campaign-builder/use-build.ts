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

  const query = useQuery({
    queryKey: key,
    queryFn: () => api.fetchBuild(sessionId!, tenantId!, campaignId!),
    enabled: !!sessionId && !!tenantId && !!campaignId,
    refetchInterval: (q) => {
      const s = q.state.data as BuildState | undefined
      return s && [s.brief_run, s.plan_run, s.words_run].some((r) => r?.status === 'running') ? POLL_MS : false
    },
  })

  // mia-cube's KPI list with this client's last results: for the picker and the Brief tab.
  // Re-read when a plan or brief lands, since that's when the client file behind it changes.
  const kpis = useQuery({
    queryKey: [...key, 'kpis', query.data?.plan_run?.run_id ?? null, query.data?.brief?.version ?? null],
    queryFn: () => api.fetchKpiOptions(sessionId!, tenantId!, campaignId!),
    enabled: !!sessionId && !!tenantId && !!campaignId && !!query.data?.brief,
    staleTime: 5 * 60 * 1000,
  })

  const run = useCallback(
    async <T,>(label: string, fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(label)
      setError(null)
      try {
        const out = await fn()
        await queryClient.invalidateQueries({ queryKey: key })
        return out
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
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
    loadError: query.error instanceof Error ? query.error.message : null,
    busy,
    error,
    clearError: () => setError(null),
    saveBrief: (fields: Partial<Record<BriefField, unknown>>, name?: string) =>
      run('brief', () => api.saveBrief(...ids(), fields, name)),
    redraft: (answers: string[]) => run('redraft', () => api.redraftBrief(...ids(), answers)),
    makePlan: () => run('plan', () => api.makePlan(...ids())),
    editPlan: (ops: PlanOp[]) =>
      run('edit', async () => {
        const next = await api.editPlan(...ids(), ops)
        queryClient.setQueryData(key, next)
        return next
      }),
    approve: () => run('approve', () => api.approvePlan(...ids())),
    writeWords: (jobIds?: string[], rewrite = false) => run('words', () => api.writeWords(...ids(), jobIds, rewrite)),
    discard: async () => {
      setBusy('discard')
      setError(null)
      try {
        await api.discardDraft(...ids())
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
