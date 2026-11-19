import { QueryClient } from '@tanstack/react-query'

// The app-wide React Query client. Lives in its own module (not main.tsx) so
// non-component code — service modules, cache-bust helpers — can invalidate or
// seed queries without a hook.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 5 minutes - won't refetch if already cached
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Don't refetch on window focus (annoying for users)
      refetchOnWindowFocus: false,
      // Retry failed requests once
      retry: 1,
      // Don't refetch when component remounts if data exists
      refetchOnMount: false,
    },
  },
})

// ── Kept across a refresh (19 Nov 2026) ─────────────────────────────────────────────────────
// After F5 every page waited for its first fetch again. A few page-level lists are kept in
// sessionStorage (this tab only) and shown at once while they refresh. Only these keys: big or
// fast-changing data (posts, chat) is never kept. Tied to the signed-in session (`buster`), so
// another sign-in in the tab never sees them, and dropped after the same 10 minutes the cache
// keeps them in memory.
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'

const KEPT_KEYS = new Set([
  'campaign-board',
  'campaign-list',
  'campaign-detail',
  'reports',
  'notes',
  'integration-status',
  'integration-health',
  'workspace-people',
])

const storage = (() => {
  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
})()

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createSyncStoragePersister({ storage, key: 'mia:query-cache', throttleTime: 1000 }),
  maxAge: 10 * 60 * 1000,
  buster: (() => {
    try {
      return localStorage.getItem('mia_session_id') ?? ''
    } catch {
      return ''
    }
  })(),
  dehydrateOptions: {
    shouldDehydrateQuery: (q) =>
      q.state.status === 'success' && typeof q.queryKey[0] === 'string' && KEPT_KEYS.has(q.queryKey[0]),
  },
}
