import { useEffect, useState } from 'react'

// Whimsical "thinking" words shown while Mia is composing with no specific tool
// running (Claude-style). When a real tool status arrives (e.g. "Checking your
// Google Ads performance…") the caller shows that instead — these are the filler.
const THINKING_PHRASES = [
  'Percolating',
  'Noodling',
  'Mulling',
  'Pondering',
  'Ruminating',
  'Cogitating',
  'Simmering',
  'Brewing',
  'Marinating',
  'Tinkering',
  'Whirring',
  'Daydreaming',
]

// Rotates a whimsical phrase every `intervalMs` while `active`. Starts on a random
// word so it doesn't always open the same way. Returns '' when inactive so callers
// can fall back to a real status with `status || phrase`.
export function useThinkingPhrase(active: boolean, intervalMs = 2800): string {
  const [i, setI] = useState(() => Math.floor(Math.random() * THINKING_PHRASES.length))

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setI((n) => (n + 1) % THINKING_PHRASES.length), intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs])

  return active ? `${THINKING_PHRASES[i % THINKING_PHRASES.length]}…` : ''
}
