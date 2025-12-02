/**
 * Custom hook for fetching integration/platform connection status
 * Uses React Query for automatic caching, deduplication, and background refetching
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../utils/api'

interface PlatformStatus {
  google: { connected: boolean; linked: boolean; last_synced?: string }
  ga4: { connected: boolean; linked: boolean; last_synced?: string }
  meta: { connected: boolean; linked: boolean; last_synced?: string }
  facebook_organic: { connected: boolean; linked: boolean; last_synced?: string }
  brevo: { connected: boolean; linked: boolean; last_synced?: string }
  hubspot: { connected: boolean; linked: boolean; last_synced?: string }
  mailchimp: { connected: boolean; linked: boolean; last_synced?: string }
}

interface IntegrationStatusResult {
  platformStatus: PlatformStatus | null
  currentAccountData: any
  ga4Properties: any[]
  linkedGA4Properties: any[]
  isLoading: boolean
  isRefetching: boolean
  error: Error | null
  refetch: () => void
  invalidate: () => void
}

async function fetchIntegrationStatus(sessionId: string, selectedAccountId?: string | number): Promise<{
  platformStatus: PlatformStatus
  currentAccountData: any
  ga4Properties: any[]
  linkedGA4Properties: any[]
}> {
  // Run ALL status checks in parallel for speed
  const [
    accountsResponse,
    hubspotResponse,
    mailchimpResponse,
    brevoResponse,
    metaCredsResponse,
    googleStatusResponse
  ] = await Promise.all([
    apiFetch('/api/accounts/available', { headers: { 'X-Session-ID': sessionId } }),
    apiFetch(`/api/oauth/hubspot/status?session_id=${sessionId}`).catch(() => null),
    apiFetch(`/api/oauth/mailchimp/status?session_id=${sessionId}`).catch(() => null),
    apiFetch(`/api/oauth/brevo/status?session_id=${sessionId}`).catch(() => null),
    apiFetch(`/api/oauth/meta/credentials-status?session_id=${sessionId}`).catch(() => null),
    apiFetch(`/api/oauth/google/status`, { headers: { 'X-Session-ID': sessionId } }).catch(() => null)
  ])

  // Track account-specific linking
  let googleLinked = false
  let metaLinked = false
  let ga4Linked = false
  let brevoLinked = false
  let facebookOrganicLinked = false
  let currentAccountData: any = null
  let ga4Properties: any[] = []
  let linkedGA4Properties: any[] = []

  if (accountsResponse.ok) {
    const accountsData = await accountsResponse.json()

    if (accountsData.ga4_properties) {
      ga4Properties = accountsData.ga4_properties
    }

    if (accountsData.accounts && accountsData.accounts.length > 0) {
      const account = selectedAccountId
        ? accountsData.accounts.find((acc: any) => acc.id === selectedAccountId)
        : accountsData.accounts[0]

      if (account) {
        googleLinked = !!account.google_ads_id
        metaLinked = !!account.meta_ads_id
        ga4Linked = !!account.ga4_property_id
        brevoLinked = !!account.brevo_api_key
        facebookOrganicLinked = !!account.facebook_page_id
        currentAccountData = account

        if (account.linked_ga4_properties) {
          linkedGA4Properties = account.linked_ga4_properties
        }
      }
    }
  }

  // Parse parallel responses
  const hubspotConnected = hubspotResponse?.ok ? (await hubspotResponse.json()).authenticated || false : false
  const mailchimpConnected = mailchimpResponse?.ok ? (await mailchimpResponse.json()).authenticated || false : false
  const brevoConnected = brevoResponse?.ok ? (await brevoResponse.json()).authenticated || false : false
  const metaHasCredentials = metaCredsResponse?.ok ? (await metaCredsResponse.json()).has_credentials || false : false
  const googleHasCredentials = googleStatusResponse?.ok ? (await googleStatusResponse.json()).authenticated || false : false

  const now = new Date().toISOString()
  const platformStatus: PlatformStatus = {
    google: { connected: googleHasCredentials || googleLinked, linked: googleLinked, last_synced: now },
    ga4: { connected: ga4Linked, linked: ga4Linked, last_synced: now },
    meta: { connected: metaHasCredentials, linked: metaLinked, last_synced: now },
    facebook_organic: { connected: metaHasCredentials && facebookOrganicLinked, linked: facebookOrganicLinked, last_synced: now },
    brevo: { connected: brevoConnected || brevoLinked, linked: brevoLinked, last_synced: now },
    hubspot: { connected: hubspotConnected, linked: hubspotConnected, last_synced: now },
    mailchimp: { connected: mailchimpConnected, linked: mailchimpConnected, last_synced: now }
  }

  return { platformStatus, currentAccountData, ga4Properties, linkedGA4Properties }
}

export function useIntegrationStatus(
  sessionId: string | null,
  selectedAccountId?: string | number
): IntegrationStatusResult {
  const queryClient = useQueryClient()

  const queryKey = ['integration-status', sessionId, selectedAccountId]

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchIntegrationStatus(sessionId!, selectedAccountId),
    enabled: !!sessionId,
    // Keep data fresh for 2 minutes (integration status doesn't change often)
    staleTime: 2 * 60 * 1000,
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
