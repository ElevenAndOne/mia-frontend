import { useEffect } from 'react'
import { takeHomeCardInFlight } from '../in-flight'
import type { BriefCard, PostScheduledEvent } from '../types'

const PLATFORM: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
}

type PatchCard = (
  cardId: string,
  patch: Partial<Pick<BriefCard, 'state' | 'title' | 'sub' | 'cta'>>
) => void

/**
 * When a post gets scheduled (schedule-post.tsx fires `mia:post-scheduled`), the home card
 * that started the chat changes state in place — same slot, new words, a way to the result —
 * and the Posts nav item blinks.
 *
 * Mount this where the chat lives (ChatView), not in the home column: the schedule flow runs
 * from the canvas inside a conversation, by which time the home column is unmounted. That
 * was why the card never turned over (2026-09-12).
 */
export function useHomeCardTurnover(patchCard: PatchCard, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const onScheduled = (ev: Event) => {
      const detail = (ev as CustomEvent<PostScheduledEvent>).detail
      const cardId = takeHomeCardInFlight()
      if (!cardId || !detail) return
      const when = new Date(detail.scheduled_at)
      const day = when.toLocaleDateString(undefined, { weekday: 'long' })
      const time = when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      patchCard(cardId, {
        state: 'scheduled',
        title: `Scheduled for ${day} ${time} on ${PLATFORM[detail.platform] ?? detail.platform}`,
        sub: detail.title
          ? `“${detail.title}” · Mia will post it for you`
          : 'Mia will post it for you',
        cta: { label: 'View in Posts', type: 'route', route: '/posts' },
      })
      window.dispatchEvent(new CustomEvent('mia:blink-nav', { detail: { key: 'posts' } }))
    }
    window.addEventListener('mia:post-scheduled', onScheduled)
    return () => window.removeEventListener('mia:post-scheduled', onScheduled)
  }, [patchCard, enabled])
}
