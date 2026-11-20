// Small formatting helpers shared by the house-rules page's rows and cards.

export function day(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "today", "yesterday", "3 days ago", else the date. */
export function ago(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  return day(iso)
}

/** Only an http(s) link is ever put in an href. */
export function safeLink(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}

/** 0.183 → "+18%", -0.04 → "−4%", tiny moves → "0%". */
export function pct(change: number | null): string {
  if (change === null || Number.isNaN(change)) return '–'
  const n = Math.round(change * 100)
  if (n === 0) return '0%'
  return `${n > 0 ? '+' : '−'}${Math.abs(n)}%`
}

/** "1 client", "9 clients". */
export const clientsWord = (n: number) => `${n} ${n === 1 ? 'client' : 'clients'}`
