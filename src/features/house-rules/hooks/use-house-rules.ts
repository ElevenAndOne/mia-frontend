import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../../contexts/toast-context'
import { clientsWord } from '../components/format'
import {
  addClientNotes,
  checkPost,
  decideMany,
  decideNews,
  decideRule,
  fetchBenchmarks,
  fetchMe,
  fetchNews,
  fetchRules,
  runJob,
  takeBackClientNotes,
} from '../services/house-rules-service'
import type {
  Decision,
  HouseRule,
  JobName,
  NewsDecision,
  NewsList,
  NewsStatus,
  RuleKind,
  RuleList,
  RuleStatus,
} from '../types'

const KEY = 'house-rules'

export function useMe(sessionId: string | null) {
  return useQuery({
    queryKey: [KEY, 'me', sessionId],
    queryFn: () => fetchMe(sessionId),
    enabled: !!sessionId,
    retry: false, // a 403 is an answer, not a blip
    staleTime: 5 * 60 * 1000,
  })
}

export function useRules(sessionId: string | null, kind: RuleKind, enabled: boolean) {
  return useQuery({
    queryKey: [KEY, 'rules', kind, sessionId],
    queryFn: () => fetchRules(sessionId, kind),
    enabled: !!sessionId && enabled,
    staleTime: 15 * 1000,
  })
}

const AFTER: Record<Decision, RuleStatus> = { approve: 'active', reject: 'rejected', retire: 'retired' }
type Snapshot = Array<[readonly unknown[], RuleList | undefined]>

/** Approve, reject, retire one rule, or decide many at once. The row moves on screen at once (the server can be a
 *  slow hop away); a refusal puts it back and says why; the server's own rows then replace the guess, and every
 *  list and the test box refresh. */
export function useDecisions(sessionId: string | null) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const rulesKey = [KEY, 'rules']
  const refresh = () => qc.invalidateQueries({ queryKey: [KEY] })

  const patch = (byId: Map<string, Partial<HouseRule>>) =>
    qc.setQueriesData<RuleList>({ queryKey: rulesKey }, (old) =>
      old ? { ...old, rules: old.rules.map((r) => (byId.has(r.id) ? { ...r, ...byId.get(r.id) } : r)) } : old
    )

  const guess = async (ids: string[], decision: Decision, note?: string): Promise<Snapshot> => {
    await qc.cancelQueries({ queryKey: rulesKey }) // a refetch in flight would overwrite the move
    const before = qc.getQueriesData<RuleList>({ queryKey: rulesKey })
    patch(new Map(ids.map((id) => [id, { status: AFTER[decision], decision_note: note ?? null }])))
    return before
  }

  const undo = (before: Snapshot | undefined, err: unknown) => {
    for (const [key, data] of before ?? []) qc.setQueryData(key, data)
    showToast('error', err instanceof Error ? err.message : 'That didn’t save. Try again.')
  }

  const one = useMutation({
    mutationFn: (v: { id: string; decision: Decision; note?: string }) => decideRule(sessionId, v.id, v.decision, v.note),
    onMutate: (v) => guess([v.id], v.decision, v.note),
    onSuccess: (row) => patch(new Map([[row.id, row]])),
    onError: (err, _v, before) => undo(before, err),
    onSettled: refresh,
  })

  const many = useMutation({
    mutationFn: (v: { ids: string[]; decision: 'approve' | 'reject' }) => decideMany(sessionId, v.ids, v.decision),
    onMutate: (v) => guess(v.ids, v.decision),
    onSuccess: (data, v) => {
      patch(new Map(data.rules.map((r) => [r.id, r])))
      showToast('success', `${data.count} ${data.count === 1 ? 'line' : 'lines'} ${v.decision === 'approve' ? 'approved' : 'rejected'}`)
    },
    onError: (err, _v, before) => undo(before, err),
    onSettled: refresh,
  })

  return { one, many }
}

export function useCheck(sessionId: string | null, text: string) {
  return useQuery({
    queryKey: [KEY, 'check', text, sessionId],
    queryFn: () => checkPost(sessionId, text),
    enabled: !!sessionId && text.trim().length > 0,
    placeholderData: (prev) => prev, // keep the last result while the next one loads, no flicker
    staleTime: 15 * 1000,
  })
}

// ── What's changing ─────────────────────────────────────────────────────────────

/** The cards and the jobs' last runs. While a check runs it's asked again every few seconds, so new cards appear
 *  without a reload; otherwise once a minute is plenty (jobs run daily or weekly). */
export function useNews(sessionId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [KEY, 'news', sessionId],
    queryFn: () => fetchNews(sessionId),
    enabled: !!sessionId && enabled,
    staleTime: 15 * 1000,
    refetchInterval: (q) =>
      Object.values(q.state.data?.jobs ?? {}).some((j) => j.running) ? 4000 : 60 * 1000,
  })
}

export function useBenchmarks(sessionId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [KEY, 'benchmarks', sessionId],
    queryFn: () => fetchBenchmarks(sessionId),
    enabled: !!sessionId && enabled,
    staleTime: 60 * 1000,
  })
}

const NEWS_AFTER: Record<NewsDecision, NewsStatus> = { keep: 'kept', ignore: 'ignored', make_rule: 'made_rule' }

/** Keep, ignore, or make a card a rule. The card moves at once; a refusal puts it back and says why. Making a rule
 *  also refreshes the Platform facts tab. */
export function useNewsDecision(sessionId: string | null) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const newsKey = [KEY, 'news', sessionId]

  return useMutation({
    mutationFn: (v: { id: string; decision: NewsDecision; ruleText?: string }) =>
      decideNews(sessionId, v.id, v.decision, v.ruleText),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: newsKey })
      const before = qc.getQueryData<NewsList>(newsKey)
      qc.setQueryData<NewsList>(newsKey, (old) =>
        old
          ? { ...old, cards: old.cards.map((c) => (c.id === v.id ? { ...c, status: NEWS_AFTER[v.decision] } : c)) }
          : old
      )
      return before
    },
    onSuccess: (data, v) => {
      qc.setQueryData<NewsList>(newsKey, (old) =>
        old ? { ...old, cards: old.cards.map((c) => (c.id === data.news.id ? data.news : c)) } : old
      )
      if (v.decision === 'make_rule') showToast('success', 'Done. Mia follows it from now on: see Platform facts.')
    },
    onError: (err, _v, before) => {
      if (before) qc.setQueryData(newsKey, before)
      showToast('error', err instanceof Error ? err.message : 'That didn’t save. Try again.')
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: newsKey })
      if (v.decision === 'make_rule') qc.invalidateQueries({ queryKey: [KEY, 'rules'] })
    },
  })
}

/** Mia adds a card's note to every client it touches, or takes the notes back. */
export function useClientNotes(sessionId: string | null) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const newsKey = [KEY, 'news', sessionId]

  return useMutation({
    mutationFn: (v: { id: string; takeBack?: boolean; text?: string }) =>
      v.takeBack ? takeBackClientNotes(sessionId, v.id) : addClientNotes(sessionId, v.id, v.text),
    onSuccess: (card, v) => {
      qc.setQueryData<NewsList>(newsKey, (old) =>
        old ? { ...old, cards: old.cards.map((c) => (c.id === card.id ? card : c)) } : old
      )
      showToast(
        'success',
        v.takeBack
          ? 'Taken back. Mia no longer has that note for those clients.'
          : `Done. Mia keeps this in mind for ${clientsWord(card.client_notes?.count ?? 0)} (it’s in their Notes).`
      )
    },
    onError: (err) => showToast('error', err instanceof Error ? err.message : 'That didn’t save. Try again.'),
  })
}

const STARTED: Record<Exclude<JobName, 'house_rules_digest'>, string> = {
  platform_news: 'Checking the platforms now. New cards show up here in a minute or two.',
  platform_benchmarks: 'Reading every client’s numbers now. This takes a few minutes.',
  slop_finder: 'Reading Mia’s recent posts now. New lines show up under Waiting in a minute or two.',
}

/** "Check now": starts a background job; the news query then polls until it's done. */
export function useRunJob(sessionId: string | null) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (job: Exclude<JobName, 'house_rules_digest'>) => runJob(sessionId, job),
    onSuccess: (_d, job) => showToast('success', STARTED[job]),
    onError: (err) => showToast('error', err instanceof Error ? err.message : 'That didn’t start. Try again.'),
    onSettled: () => qc.invalidateQueries({ queryKey: [KEY, 'news'] }),
  })
}
