import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../../contexts/toast-context'
import { checkPost, decideMany, decideRule, fetchMe, fetchRules } from '../services/house-rules-service'
import type { Decision, HouseRule, RuleKind, RuleList, RuleStatus } from '../types'

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
