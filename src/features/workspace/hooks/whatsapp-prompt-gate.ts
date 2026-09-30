import { useSyncExternalStore } from 'react'

/**
 * Whether the "Mia works on WhatsApp" prompt still has the floor.
 *
 * An invited member landing on Home got the best-post canvas sliding open AND the number
 * prompt on top of it, and only saw the prompt once they closed the canvas (Josh, 30 Sep
 * 2026). The prompt now goes first: while it is deciding ('pending') or showing ('open') the
 * canvas waits, and slides up once it is 'done'. Someone who verified their number in
 * onboarding is 'done' after one quick read, so their arrival looks as it always did.
 */
export type WhatsAppPromptGate = 'pending' | 'open' | 'done'

let state: WhatsAppPromptGate = 'pending'
const listeners = new Set<() => void>()

export const setWhatsAppPromptGate = (next: WhatsAppPromptGate) => {
  if (state === next) return
  state = next
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const useWhatsAppPromptGate = (): WhatsAppPromptGate =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => 'done'
  )
