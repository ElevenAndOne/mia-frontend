/**
 * Custom hook for fetching integration/platform connection status
 * Uses React Query for automatic caching, deduplication, and background refetching
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../../utils/api'

interface PlatformStatus {
  google: { connected: boolean; linked: boolean; last_synced?: string }
  ga4: { connected: boolean; linked: boolean; last_synced?: string }
  meta: { connected: boolean; linked: boolean; last_synced?: string }
  facebook_organic: { connected: boolean; linked: boolean; last_synced?: string }
  brevo: { connected: boolean; linked: boolean; last_synced?: string }
  hubspot: { connected: boolean; linked: boolean; last_synced?: string }
  mailchimp: { connected: boolean; linked: boolean; last_synced?: string }
}

interface GA4Property {
  property_id: string
  display_name: string
}

interface LinkedGA4Property extends GA4Property {
  is_primary: boolean
  sort_order: number
}

interface AccountData {
  id: string | number
  name?: string
  google_ads_id?: string
  meta_ads_id?: string
  ga4_property_id?: string
  brevo_api_key?: string
  brevo_account_name?: string
  hubspot_portal_id?: string
  mailchimp_account_id?: string
  facebook_page_id?: string
  linked_ga4_properties?: GA4Property[]
}

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

async function fetchIntegrationStatus(
  sessionId: string,
  selectedAccountId?: string | number,
  tenantId?: string
): Promise<{
  platformStatus: PlatformStatus
  currentAccountData: AccountData | null
  ga4Properties: GA4Property[]
  linkedGA4Properties: LinkedGA4Property[]
}> {
  // TENANT WORKSPACE FIX (Jan 2025):
  // If tenant_id is provided, fetch tenant-level integration status instead of account-level
  // This allows viewers to see workspace integrations without needing personal credentials
  if (tenantId) {
    console.log('[INTEGRATION-STATUS] ========================================')
    console.log('[INTEGRATION-STATUS] 🔍 FETCHING TENANT STATUS')
    console.log('[INTEGRATION-STATUS] tenant_id:', tenantId)
    console.log('[INTEGRATION-STATUS] session_id:', sessionId)
    console.log('[INTEGRATION-STATUS] ========================================')

    const tenantResponse = await apiFetch(`/api/tenants/${tenantId}/integrations`, {
      headers: { 'X-Session-ID': sessionId }
    })

    if (tenantResponse.ok) {
      const tenantData = await tenantResponse.json()
      console.log('[INTEGRATION-STATUS] ========================================')
      console.log('[INTEGRATION-STATUS] 📥 RECEIVED FROM API')
      console.log('[INTEGRATION-STATUS] Full response:', tenantData)
      console.log('[INTEGRATION-STATUS] platform_status:', tenantData.platform_status)
      console.log('[INTEGRATION-STATUS] google_ads:', tenantData.platform_status?.google_ads)
      console.log('[INTEGRATION-STATUS] ga4:', tenantData.platform_status?.ga4)
      console.log('[INTEGRATION-STATUS] meta_ads:', tenantData.platform_status?.meta_ads)
      console.log('[INTEGRATION-STATUS] ========================================')

      const now = new Date().toISOString()

      // Map tenant platform_status to our PlatformStatus format
      const platformStatus: PlatformStatus = {
        google: {
          connected: tenantData.platform_status?.google_ads || false,
          linked: tenantData.platform_status?.google_ads || false,
          last_synced: now
        },
        ga4: {
          connected: tenantData.platform_status?.ga4 || false,
          linked: tenantData.platform_status?.ga4 || false,
          last_synced: now
        },
        meta: {
          connected: tenantData.platform_status?.meta_ads || false,
          linked: tenantData.platform_status?.meta_ads || false,
          last_synced: now
        },
        facebook_organic: {
          connected: tenantData.platform_status?.facebook_organic || false,
          linked: tenantData.platform_status?.facebook_organic || false,
          last_synced: now
        },
        brevo: {
          connected: tenantData.platform_status?.brevo || false,
          linked: tenantData.platform_status?.brevo || false,
          last_synced: now
        },
        hubspot: {
          connected: tenantData.platform_status?.hubspot || false,
          linked: tenantData.platform_status?.hubspot || false,
          last_synced: now
        },
        mailchimp: {
          connected: tenantData.platform_status?.mailchimp || false,
          linked: tenantData.platform_status?.mailchimp || false,
          last_synced: now
        }
      }

      console.log('[INTEGRATION-STATUS] ========================================')
      console.log('[INTEGRATION-STATUS] 🎯 FINAL MAPPED STATUS')
      console.log('[INTEGRATION-STATUS] google.connected:', platformStatus.google.connected)
      console.log('[INTEGRATION-STATUS] ga4.connected:', platformStatus.ga4.connected)
      console.log('[INTEGRATION-STATUS] meta.connected:', platformStatus.meta.connected)
      console.log('[INTEGRATION-STATUS] ========================================')

      return { platformStatus, currentAccountData: null, ga4Properties: [], linkedGA4Properties: [] }
    } else {
      console.error('[INTEGRATION-STATUS] Tenant endpoint failed:', tenantResponse.status, tenantResponse.statusText)
    }
  }

  // ACCOUNT ISOLATION FIX (Dec 5, 2025):
  // Fallback to account-level status if no tenant_id (legacy behavior)
  console.log('[INTEGRATION-STATUS] Using account-level status (tenant_id:', tenantId, ')')
  // We only need to fetch account data - platform "connected" status is based on account-level IDs
  // Removed redundant user-level credential checks (hubspot/mailchimp/brevo/meta/google status endpoints)
  const accountsResponse = await apiFetch('/api/accounts/available', { headers: { 'X-Session-ID': sessionId } })

  // Track account-specific linking (ACCOUNT ISOLATION - Dec 5, 2025)
  // Each platform's "connected" status must be based on the CURRENT ACCOUNT's linked IDs
  let googleLinked = false
  let metaLinked = false
  let ga4Linked = false
  let brevoLinked = false
  let hubspotLinked = false
  let mailchimpLinked = false
  let facebookOrganicLinked = false
  let currentAccountData: AccountData | null = null
  let ga4Properties: GA4Property[] = []
  let linkedGA4Properties: LinkedGA4Property[] = []

  if (accountsResponse.ok) {
    const accountsData = await accountsResponse.json()

    if (accountsData.ga4_properties) {
      ga4Properties = accountsData.ga4_properties
    }

    if (accountsData.accounts && accountsData.accounts.length > 0) {
      const account = selectedAccountId
        ? accountsData.accounts.find((acc: AccountData) => acc.id === selectedAccountId)
        : accountsData.accounts[0]

      if (account) {
        googleLinked = !!account.google_ads_id
        metaLinked = !!account.meta_ads_id
        ga4Linked = !!account.ga4_property_id
        brevoLinked = !!account.brevo_api_key
        hubspotLinked = !!account.hubspot_portal_id
        mailchimpLinked = !!account.mailchimp_account_id
        facebookOrganicLinked = !!account.facebook_page_id
        currentAccountData = account

        if (account.linked_ga4_properties) {
          linkedGA4Properties = account.linked_ga4_properties
        }
      }
    }
  }

  const now = new Date().toISOString()
  // ACCOUNT ISOLATION FIX (Dec 5, 2025):
  // Platform "connected" status must be based on ACCOUNT-level linking, not USER-level credentials
  // This ensures each Google Ads account shows only its own linked platforms
  const platformStatus: PlatformStatus = {
    google: { connected: googleLinked, linked: googleLinked, last_synced: now },
    ga4: { connected: ga4Linked, linked: ga4Linked, last_synced: now },
    meta: { connected: metaLinked, linked: metaLinked, last_synced: now },
    facebook_organic: { connected: facebookOrganicLinked, linked: facebookOrganicLinked, last_synced: now },
    brevo: { connected: brevoLinked, linked: brevoLinked, last_synced: now },
    hubspot: { connected: hubspotLinked, linked: hubspotLinked, last_synced: now },
    mailchimp: { connected: mailchimpLinked, linked: mailchimpLinked, last_synced: now }
  }

  return { platformStatus, currentAccountData, ga4Properties, linkedGA4Properties }
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
