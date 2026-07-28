import { useQuery } from '@tanstack/react-query'
import {
  fetchOverview,
  fetchTesterDetail,
  fetchTesters,
  fetchTimeseries,
  fetchTopics,
  fetchWorkspaces,
} from '../services/pulse-service'
import type { PulseFilter, PulseRange } from '../types'

const STALE = 30 * 1000 // 30s — usage data doesn't need to be second-fresh

export function useWorkspaces(sessionId: string | null) {
  return useQuery({
    queryKey: ['pulse', 'workspaces', sessionId],
    queryFn: () => fetchWorkspaces(sessionId),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // workspace membership changes rarely
  })
}

export function usePulseDashboard(sessionId: string | null, range: PulseRange, filter: PulseFilter) {
  const enabled = !!sessionId
  // Stable cache key for the filter so queries refetch when the selection changes.
  const filterKey = [...[...filter.tenantIds].sort(), `u:${filter.userId ?? ''}`].join('|')

  const overview = useQuery({
    queryKey: ['pulse', 'overview', range, filterKey, sessionId],
    queryFn: () => fetchOverview(sessionId, range, filter),
    enabled,
    staleTime: STALE,
  })

  const timeseries = useQuery({
    queryKey: ['pulse', 'timeseries', range, filterKey, sessionId],
    queryFn: () => fetchTimeseries(sessionId, 'questions', range, filter),
    enabled,
    staleTime: STALE,
  })

  const testers = useQuery({
    queryKey: ['pulse', 'testers', range, filterKey, sessionId],
    queryFn: () => fetchTesters(sessionId, range, filter),
    enabled,
    staleTime: STALE,
  })

  const topics = useQuery({
    queryKey: ['pulse', 'topics', range, filterKey, sessionId],
    queryFn: () => fetchTopics(sessionId, range, filter),
    enabled,
    staleTime: STALE,
  })

  return { overview, timeseries, testers, topics }
}

export function useTesterDetail(sessionId: string | null, googleUserId: string | null, filter?: PulseFilter) {
  // Workspace filter scopes the drill-down too (questions/timeline/platforms).
  const tenantKey = [...(filter?.tenantIds ?? [])].sort().join('|')
  return useQuery({
    queryKey: ['pulse', 'tester-detail', googleUserId, tenantKey, sessionId],
    queryFn: () => fetchTesterDetail(sessionId, googleUserId as string, filter),
    enabled: !!sessionId && !!googleUserId,
    staleTime: STALE,
  })
}
