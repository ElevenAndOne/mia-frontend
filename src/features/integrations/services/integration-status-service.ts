import { apiFetch } from '../../../utils/api'
import type { AccountData, GA4Property, LinkedGA4Property, PlatformStatus } from '../types'
import { refreshGa4Properties } from './ga4-service'

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

const buildAccountFlags = (account: AccountData | null): Partial<Record<keyof PlatformStatus, boolean>> => ({
  google: Boolean(account?.google_ads_id),
  ga4: Boolean(account?.ga4_property_id) || Boolean(account?.linked_ga4_properties?.length),
  meta: Boolean(account?.meta_ads_id),
  facebook_organic: Boolean(account?.facebook_page_id),
  brevo: Boolean(account?.brevo_api_key),
  hubspot: Boolean(account?.hubspot_portal_id),
  mailchimp: Boolean(account?.mailchimp_account_id),
})

const applyAccountValidation = (
  platformStatus: PlatformStatus,
  accountFlags: Partial<Record<keyof PlatformStatus, boolean>>,
): PlatformStatus => ({
  google: {
    ...platformStatus.google,
    connected: platformStatus.google.connected && Boolean(accountFlags.google),
    linked: platformStatus.google.linked && Boolean(accountFlags.google),
  },
  ga4: {
    ...platformStatus.ga4,
    connected: platformStatus.ga4.connected && Boolean(accountFlags.ga4),
    linked: platformStatus.ga4.linked && Boolean(accountFlags.ga4),
  },
  meta: {
    ...platformStatus.meta,
    connected: platformStatus.meta.connected && Boolean(accountFlags.meta),
    linked: platformStatus.meta.linked && Boolean(accountFlags.meta),
  },
  facebook_organic: {
    ...platformStatus.facebook_organic,
    connected: platformStatus.facebook_organic.connected && Boolean(accountFlags.facebook_organic),
    linked: platformStatus.facebook_organic.linked && Boolean(accountFlags.facebook_organic),
  },
  brevo: {
    ...platformStatus.brevo,
    connected: platformStatus.brevo.connected && Boolean(accountFlags.brevo),
    linked: platformStatus.brevo.linked && Boolean(accountFlags.brevo),
  },
  hubspot: {
    ...platformStatus.hubspot,
    connected: platformStatus.hubspot.connected && Boolean(accountFlags.hubspot),
    linked: platformStatus.hubspot.linked && Boolean(accountFlags.hubspot),
  },
  mailchimp: {
    ...platformStatus.mailchimp,
    connected: platformStatus.mailchimp.connected && Boolean(accountFlags.mailchimp),
    linked: platformStatus.mailchimp.linked && Boolean(accountFlags.mailchimp),
  },
})

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

  if (ga4Properties.length === 0) {
    try {
      ga4Properties = await refreshGa4Properties(sessionId)
    } catch (error) {
      console.error('[INTEGRATIONS] GA4 refresh failed:', error)
    }
  }

  const accountFlags = buildAccountFlags(currentAccountData)
  const platformStatus = buildPlatformStatus(accountFlags)

  return { platformStatus, currentAccountData, ga4Properties, linkedGA4Properties }
}

export const fetchIntegrationStatus = async (
  sessionId: string,
  selectedAccountId?: string | number,
  tenantId?: string,
): Promise<IntegrationStatusData> => {
  // FEB 2026 FIX: Always fetch account data for linked_ga4_properties, ga4_property_id, etc.
  // The tenant endpoint only returns platform connection status, not the actual account-level data
  // needed to show which GA4 properties are linked, which Facebook page is selected, etc.
  const accountStatus = await fetchAccountIntegrationStatus(sessionId, selectedAccountId)
  const accountFlags = buildAccountFlags(accountStatus.currentAccountData)

  // If in tenant context, use tenant-level platform status (from TenantIntegration table)
  // but keep the account-level data for currentAccountData, ga4Properties, linkedGA4Properties
  if (tenantId) {
    const tenantStatus = await fetchTenantIntegrationStatus(sessionId, tenantId)
    if (tenantStatus) {
      return {
        platformStatus: applyAccountValidation(tenantStatus.platformStatus, accountFlags),
        // Keep account-level data from accountStatus
        currentAccountData: accountStatus.currentAccountData,
        ga4Properties: accountStatus.ga4Properties,
        linkedGA4Properties: accountStatus.linkedGA4Properties,
      }
    }
  }

  return {
    ...accountStatus,
    platformStatus: applyAccountValidation(accountStatus.platformStatus, accountFlags),
  }
}
