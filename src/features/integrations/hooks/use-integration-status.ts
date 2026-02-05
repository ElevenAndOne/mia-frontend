import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AccountData, GA4Property, LinkedGA4Property, PlatformStatus } from '../types'
import { useMiaClient, type Account, type WorkspaceIntegrations } from '../../../sdk'

interface IntegrationStatusData {
  platformStatus: PlatformStatus
  currentAccountData: AccountData | null
  ga4Properties: GA4Property[]
  linkedGA4Properties: LinkedGA4Property[]
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

const buildPlatformStatus = (flags: Partial<Record<keyof PlatformStatus, boolean>>): PlatformStatus => {
  const now = new Date().toISOString()
  return {
    google: { connected: Boolean(flags.google), linked: Boolean(flags.google), last_synced: now },
    ga4: { connected: Boolean(flags.ga4), linked: Boolean(flags.ga4), last_synced: now },
    meta: { connected: Boolean(flags.meta), linked: Boolean(flags.meta), last_synced: now },
    facebook_organic: {
      connected: Boolean(flags.facebook_organic),
      linked: Boolean(flags.facebook_organic),
      last_synced: now,
    },
    brevo: { connected: Boolean(flags.brevo), linked: Boolean(flags.brevo), last_synced: now },
    hubspot: { connected: Boolean(flags.hubspot), linked: Boolean(flags.hubspot), last_synced: now },
    mailchimp: { connected: Boolean(flags.mailchimp), linked: Boolean(flags.mailchimp), last_synced: now },
  }
}

const mapIntegrations = (integrations: WorkspaceIntegrations): PlatformStatus => {
  return buildPlatformStatus({
    google: integrations.googleAds,
    ga4: integrations.ga4,
    meta: integrations.metaAds,
    facebook_organic: integrations.facebookOrganic,
    brevo: integrations.brevo,
    hubspot: integrations.hubspot,
    mailchimp: integrations.mailchimp,
  })
}

const mapAccountToData = (account: Account): AccountData => ({
  id: account.id,
  name: account.name,
  google_ads_id: account.googleAdsId,
  ga4_property_id: account.ga4PropertyId,
  meta_ads_id: account.metaAdsId,
  facebook_page_id: account.facebookPageId,
  brevo_api_key: account.brevoApiKey,
  brevo_account_name: account.brevoAccountName,
  hubspot_portal_id: account.hubspotPortalId,
  mailchimp_account_id: account.mailchimpAccountId,
})

export function useIntegrationStatus(
  sessionId: string | null,
  selectedAccountId?: string | number,
  tenantId?: string
): IntegrationStatusResult {
  const mia = useMiaClient()
  const queryClient = useQueryClient()

  const queryKey = ['integration-status', sessionId, selectedAccountId, tenantId]

  const fetchStatus = async (): Promise<IntegrationStatusData> => {
    // Fetch account data
    const { accounts, ga4Properties } = await mia.accounts.list()

    let currentAccountData: AccountData | null = null
    const linkedGA4Properties: LinkedGA4Property[] = []

    if (accounts.length > 0) {
      const account = selectedAccountId
        ? accounts.find((acc) => acc.id === selectedAccountId)
        : accounts[0]

      if (account) {
        currentAccountData = mapAccountToData(account)
      }
    }

    // Determine platform status from account data
    let platformStatus = buildPlatformStatus({
      google: Boolean(currentAccountData?.google_ads_id),
      ga4: Boolean(currentAccountData?.ga4_property_id),
      meta: Boolean(currentAccountData?.meta_ads_id),
      facebook_organic: Boolean(currentAccountData?.facebook_page_id),
      brevo: Boolean(currentAccountData?.brevo_api_key),
      hubspot: Boolean(currentAccountData?.hubspot_portal_id),
      mailchimp: Boolean(currentAccountData?.mailchimp_account_id),
    })

    // If in tenant context, use tenant-level platform status
    if (tenantId) {
      try {
        const tenantIntegrations = await mia.workspaces.getIntegrations(tenantId)
        platformStatus = mapIntegrations(tenantIntegrations)
      } catch {
        // Fall back to account-level status
      }
    }

    return {
      platformStatus,
      currentAccountData,
      ga4Properties: ga4Properties.map((p) => ({
        property_id: p.propertyId,
        display_name: p.displayName,
      })),
      linkedGA4Properties,
    }
  }

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: fetchStatus,
    enabled: !!sessionId,
    // FEB 2026 FIX: Always refetch when component mounts
    refetchOnMount: 'always',
    staleTime: 30 * 1000,
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
