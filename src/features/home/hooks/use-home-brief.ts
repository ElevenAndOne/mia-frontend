import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BriefCard, HomeBrief } from '../types'
import {
  dismissBriefCard,
  fetchHomeBrief,
  patchBriefCard,
  refreshHomeBrief,
} from '../services/home-brief-api'

export const homeBriefKey = (tenantId: string | null | undefined) =>
  ['home-brief', tenantId] as const

/**
 * Today's home brief for the active workspace (Basic experience).
 *
 * `enabled` lets the caller switch it off for team/agency workspaces so nothing is fetched
 * there. Optimistic updates: dismissing removes the card at once; patching (after a post is
 * scheduled) swaps the card in place, then both re-fetch quietly.
 */
export function useHomeBrief(
  sessionId: string | null,
  tenantId: string | null | undefined,
  enabled = true
) {
  const qc = useQueryClient()
  const key = homeBriefKey(tenantId)
  const ready = Boolean(sessionId && tenantId && enabled)

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchHomeBrief(sessionId as string, tenantId as string),
    enabled: ready,
    // The backend rebuilds the brief after a website read, a reconnect or a schedule; Home
    // must show that when the person comes back from Settings. A 5-minute staleTime kept
    // the "Add your website" card on screen after the site had been read (2026-09-12).
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
    retry: 1,
  })

  const refresh = useMutation({
    mutationFn: () => refreshHomeBrief(sessionId as string, tenantId as string),
    onSuccess: (brief) => qc.setQueryData(key, brief),
  })

  const dismiss = useMutation({
    mutationFn: (cardId: string) =>
      dismissBriefCard(sessionId as string, tenantId as string, cardId),
    onMutate: (cardId) => {
      qc.setQueryData<HomeBrief>(key, (old) =>
        old ? { ...old, cards: old.cards.filter((c) => c.id !== cardId) } : old
      )
    },
    onSuccess: (_res, cardId) => {
      qc.setQueryData<HomeBrief>(key, (old) =>
        old ? { ...old, cards: old.cards.filter((c) => c.id !== cardId) } : old
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })

  const patchCard = useMutation({
    mutationFn: ({
      cardId,
      patch,
    }: {
      cardId: string
      patch: Partial<Pick<BriefCard, 'state' | 'title' | 'sub' | 'cta'>>
    }) => patchBriefCard(sessionId as string, tenantId as string, cardId, patch),
    onMutate: ({ cardId, patch }) => {
      qc.setQueryData<HomeBrief>(key, (old) =>
        old
          ? { ...old, cards: old.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) }
          : old
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })

  return {
    brief: query.data ?? null,
    isLoading: ready && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: () => refresh.mutate(),
    isRefreshing: refresh.isPending,
    dismiss: (cardId: string) => dismiss.mutate(cardId),
    patchCard: (
      cardId: string,
      patch: Partial<Pick<BriefCard, 'state' | 'title' | 'sub' | 'cta'>>
    ) => patchCard.mutate({ cardId, patch }),
  }
}
