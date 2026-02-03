import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccountData, GA4Property, LinkedGA4Property, PlatformStatus } from '../types'
import { fetchIntegrationStatus } from '../services/integration-status-service'

interface IntegrationStatusResult {
  platformStatus: PlatformStatus | null
  currentAccountData: AccountData | null
  ga4Properties: GA4Property[]
  linkedGA4Properties: LinkedGA4Property[]
  isLoading: boolean
  isRefetching: boolean
  error: Error | null
  refetch: () => void
  invalidate: () => void
}

export function useIntegrationStatus(
  sessionId: string | null,
  selectedAccountId?: string | number,
  tenantId?: string
): IntegrationStatusResult {
  const queryClient = useQueryClient()

  const queryKey = ['integration-status', sessionId, selectedAccountId, tenantId]

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchIntegrationStatus(sessionId!, selectedAccountId, tenantId),
    enabled: !!sessionId,
    // FEB 2026 FIX: Always refetch when component mounts
    // This ensures fresh data when navigating back from Integrations page
    // Without this, cached data is used and newly connected platforms don't appear
    refetchOnMount: 'always',
    // Keep data fresh for 30 seconds (reduced from 2 min to ensure updates propagate)
    staleTime: 30 * 1000,
    // Cache for 5 minutes
    gcTime: 5 * 60 * 1000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['integration-status'] })
  }

  return {
    platformStatus: data?.platformStatus || null,
    currentAccountData: data?.currentAccountData || null,
    ga4Properties: data?.ga4Properties || [],
    linkedGA4Properties: data?.linkedGA4Properties || [],
    isLoading,
    isRefetching: isFetching && !isLoading,
    error: error as Error | null,
    refetch: () => { refetch() },
    invalidate
  }
}
