import { apiFetch } from '../../../utils/api'
import type { AccountData, GA4Property, LinkedGA4Property, PlatformStatus } from '../types'

export interface IntegrationStatusData {
  platformStatus: PlatformStatus
  currentAccountData: AccountData | null
  ga4Properties: GA4Property[]
  linkedGA4Properties: LinkedGA4Property[]
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

export const fetchTenantIntegrationStatus = async (
  sessionId: string,
  tenantId: string,
): Promise<IntegrationStatusData | null> => {
  const response = await apiFetch(`/api/tenants/${tenantId}/integrations`, {
    headers: { 'X-Session-ID': sessionId },
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  const flags = {
    google: data.platform_status?.google_ads,
    ga4: data.platform_status?.ga4,
    meta: data.platform_status?.meta_ads,
    facebook_organic: data.platform_status?.facebook_organic,
    brevo: data.platform_status?.brevo,
    hubspot: data.platform_status?.hubspot,
    mailchimp: data.platform_status?.mailchimp,
  }

  return {
    platformStatus: buildPlatformStatus(flags),
    currentAccountData: null,
    ga4Properties: [],
    linkedGA4Properties: [],
  }
}

export const fetchAccountIntegrationStatus = async (
  sessionId: string,
  selectedAccountId?: string | number,
): Promise<IntegrationStatusData> => {
  const accountsResponse = await apiFetch('/api/accounts/available', {
    headers: { 'X-Session-ID': sessionId },
  })

  let currentAccountData: AccountData | null = null
  let ga4Properties: GA4Property[] = []
  let linkedGA4Properties: LinkedGA4Property[] = []

  if (accountsResponse.ok) {
    const accountsData = await accountsResponse.json()
    if (accountsData.ga4_properties) {
      ga4Properties = accountsData.ga4_properties
    }

    if (accountsData.accounts?.length) {
      const account = selectedAccountId
        ? accountsData.accounts.find((acc: AccountData) => acc.id === selectedAccountId)
        : accountsData.accounts[0]

      if (account) {
        currentAccountData = account
        if (account.linked_ga4_properties) {
          linkedGA4Properties = account.linked_ga4_properties
        }
      }
    }
  }

  const platformStatus = buildPlatformStatus({
    google: Boolean(currentAccountData?.google_ads_id),
    ga4: Boolean(currentAccountData?.ga4_property_id),
    meta: Boolean(currentAccountData?.meta_ads_id),
    facebook_organic: Boolean(currentAccountData?.facebook_page_id),
    brevo: Boolean(currentAccountData?.brevo_api_key),
    hubspot: Boolean(currentAccountData?.hubspot_portal_id),
    mailchimp: Boolean(currentAccountData?.mailchimp_account_id),
  })

  return { platformStatus, currentAccountData, ga4Properties, linkedGA4Properties }
}

export const fetchIntegrationStatus = async (
  sessionId: string,
  selectedAccountId?: string | number,
  tenantId?: string,
): Promise<IntegrationStatusData> => {
  if (tenantId) {
    const tenantStatus = await fetchTenantIntegrationStatus(sessionId, tenantId)
    if (tenantStatus) return tenantStatus
  }

  return fetchAccountIntegrationStatus(sessionId, selectedAccountId)
}
