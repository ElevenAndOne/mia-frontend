/**
 * A Map-like cache that also lives in sessionStorage, so the last answer shown on a page survives
 * a refresh in the same tab (Josh, 19 Nov 2026: every page reloaded slowly after F5). It clears
 * when the tab closes. Storage can be full, blocked or private: then it is just the in-memory map.
 * Only for "show this at once, then refresh behind it": never the source of truth.
 */
export function sessionCache<T>(name: string) {
  const mem = new Map<string, T>()
  const key = (k: string) => `mia:cache:${name}:${k}`
  return {
    get(k: string): T | undefined {
      if (mem.has(k)) return mem.get(k)
      try {
        const raw = sessionStorage.getItem(key(k))
        if (raw == null) return undefined
        const v = JSON.parse(raw) as T
        mem.set(k, v)
        return v
      } catch {
        return undefined
      }
    },
    has(k: string): boolean {
      return this.get(k) !== undefined
    },
    set(k: string, v: T) {
      mem.set(k, v)
      try {
        sessionStorage.setItem(key(k), JSON.stringify(v))
      } catch {
        /* full or blocked: memory only */
      }
    },
  }
}
