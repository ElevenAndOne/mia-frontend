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
