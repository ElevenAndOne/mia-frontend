import { sessionCache } from '../../../utils/session-cache'
import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../../contexts/toast-context'
import {
  fetchRecentConversations,
  deleteConversation,
  renameConversation,
  pinConversation,
} from '../../chat/services/chat-service'
import type { RecentConversation } from '../../chat/services/chat-service'

/**
 * Owns the "recent chats" list + its mutations (delete / rename / pin), shared by
 * the permanent sidebar's slide-over (and reusable elsewhere).
 *
 * Campaign-builder conversations (skill: strategy_planning) are excluded — those
 * belong to "Past builds" on the Campaigns page, not the general chat history.
 */
export type RecentChatsStatus = 'idle' | 'loading' | 'ready' | 'error'

const CHATS_CACHE = sessionCache<RecentConversation[]>('recent-chats')

export const useRecentConversations = (sessionId: string | null, workspaceId?: string | null) => {
  const { showToast } = useToast()
  // The last list per workspace shows at once, even after a refresh (19 Nov 2026), and is
  // refreshed behind it.
  const ck = workspaceId ?? 'none'
  const [conversations, setConversationsState] = useState<RecentConversation[]>(() => CHATS_CACHE.get(ck) ?? [])
  const setConversations = useCallback(
    (u: RecentConversation[] | ((prev: RecentConversation[]) => RecentConversation[])) =>
      setConversationsState((prev) => {
        const next = typeof u === 'function' ? u(prev) : u
        CHATS_CACHE.set(ck, next)
        return next
      }),
    [ck]
  )
  // "No recent chats yet" only after a real, successful empty answer: the panel used to show
  // it while loading and after a failed fetch, and stayed that way until a hard refresh
  // (30 Sep 2026).
  const [status, setStatus] = useState<RecentChatsStatus>(() => (CHATS_CACHE.has(ck) ? 'ready' : 'idle'))

  // A different workspace is a different list: never show the last one's chats (or none).
  useEffect(() => {
    const cached = CHATS_CACHE.get(ck)
    setConversationsState(cached ?? [])
    setStatus(cached ? 'ready' : 'idle')
  }, [ck])

  const load = useCallback(async () => {
    if (!sessionId) return
    setStatus((s) => (s === 'ready' ? s : 'loading'))
    try {
      const list = await fetchRecentConversations(sessionId, undefined, 'strategy_planning')
      setConversations(list)
      setStatus('ready')
    } catch {
      setStatus('error')
      showToast('error', "Couldn't load your recent chats. Please try again.")
    }
  }, [sessionId, showToast, setConversations])

  const remove = useCallback(
    async (conversationId: string) => {
      if (!sessionId) return false
      const ok = await deleteConversation(sessionId, conversationId)
      if (ok) {
        setConversations((prev) => prev.filter((c) => c.conversation_id !== conversationId))
      }
      return ok
    },
    [sessionId, setConversations]
  )

  const rename = useCallback(
    async (conversationId: string, title: string) => {
      const trimmed = title.trim()
      if (!trimmed || !sessionId) return
      const ok = await renameConversation(sessionId, conversationId, trimmed)
      if (ok) {
        setConversations((prev) =>
          prev.map((c) => (c.conversation_id === conversationId ? { ...c, title: trimmed } : c))
        )
      }
    },
    [sessionId, setConversations]
  )

  const togglePin = useCallback(
    async (conversation: RecentConversation) => {
      if (!sessionId) return
      const newPinned = await pinConversation(sessionId, conversation.conversation_id)
      if (newPinned === null) return
      setConversations((prev) =>
        prev
          .map((c) =>
            c.conversation_id === conversation.conversation_id ? { ...c, is_pinned: newPinned } : c
          )
          .sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
            return new Date(b.last_at || 0).getTime() - new Date(a.last_at || 0).getTime()
          })
      )
    },
    [sessionId, setConversations]
  )

  return { conversations, setConversations, status, load, remove, rename, togglePin }
}
