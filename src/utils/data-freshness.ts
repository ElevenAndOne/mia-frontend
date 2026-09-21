// Provenance labels for figures the backend serves from the analytics store, a live
// platform call or a manual entry. Pure: the badge component only paints the result.

import { format, parseISO } from 'date-fns'

export type DataFreshnessSource = 'store' | 'live' | 'manual'

export const DATA_SOURCE_LABELS: Record<DataFreshnessSource, string> = {
  store: 'Store',
  live: 'Live',
  manual: 'Manual',
}

/** "2026-09-12T02:00:00Z" → "12 Sep"; unparseable input is returned as-is; null stays null. */
export const formatShortAsOf = (iso: string | null | undefined): string | null => {
  if (!iso) return null
  const parsed = parseISO(iso)
  return Number.isNaN(parsed.getTime()) ? iso : format(parsed, 'd MMM')
}

/**
 * Pill text. Store figures carry their watermark ("Store · to 12 Sep"); live and
 * manual figures are labelled plainly. With no source, notes alone still earn a
 * "Partial" pill so an incomplete number never looks whole. Nothing to say → null.
 */
export const freshnessLabel = (
  source: DataFreshnessSource | null,
  asOf?: string | null,
  notes: string[] = []
): string | null => {
  if (source) {
    const base = DATA_SOURCE_LABELS[source]
    const date = source === 'store' ? formatShortAsOf(asOf) : null
    return date ? `${base} · to ${date}` : base
  }
  return notes.length > 0 ? 'Partial' : null
}

/** Tooltip body: one note per line, with the as-of date first when there is one. */
export const freshnessTitle = (notes: string[] = [], asOf?: string | null): string | undefined => {
  const lines: string[] = []
  const date = formatShortAsOf(asOf)
  if (date) lines.push(`Data complete through ${date}`)
  lines.push(...notes)
  return lines.length > 0 ? lines.join('\n') : undefined
}
