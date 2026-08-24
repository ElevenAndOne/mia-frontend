// How a checklist row presents its verdict, and how it prints a timestamp.
// Split from launch-check-row.tsx to keep that component inside the 200-line
// limit; nothing here is logic.

import type { CheckSeverity } from '../types'

export const fmtWhen = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// A waived warning reads as settled, so it takes the muted tick rather than the
// amber "!". "Couldn't check" is deliberately NOT a tick — that's the whole point
// of having the state.
export const LOOK: Record<CheckSeverity | 'waived', { cls: string; glyph: string }> = {
  pass: { cls: 'bg-utility-success-100 text-utility-success-700', glyph: '✓' },
  waived: { cls: 'bg-tertiary text-quaternary', glyph: '✓' },
  block: { cls: 'bg-utility-error-100 text-utility-error-700', glyph: '✕' },
  warn: { cls: 'bg-utility-warning-100 text-utility-warning-700', glyph: '!' },
  unknown: { cls: 'bg-tertiary text-secondary', glyph: '?' },
  info: { cls: 'bg-tertiary text-quaternary', glyph: '·' },
}

