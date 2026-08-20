import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../../utils/api'
import type { IntegrationHealth } from '../components/health-pill'

/**
 * Per-platform connection warnings for the active workspace. DB-only on the
 * backend, so it is cheap enough to run on every visit; a missing spend signal
 * warms itself server-side and simply appears on the next load.
 */
export function useIntegrationHealth(sessionId: string | null, tenantId?: string) {
  const { data } = useQuery({
    queryKey: ['integration-health', sessionId, tenantId],
    queryFn: async (): Promise<Record<string, IntegrationHealth>> => {
      const response = await apiFetch('/api/integrations/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId ?? '' },
        body: JSON.stringify({ session_id: sessionId }),
      })
      if (!response.ok) return {}
      const json = await response.json()
      return json.platforms ?? {}
    },
    enabled: !!sessionId,
    staleTime: 60 * 1000,
    // A warning that fails to load should be silent, not noisy.
    retry: false,
  })

  return data ?? {}
}
