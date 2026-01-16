import { apiGet, apiPost } from './api-client'
import { PlatformStatus } from '../types'

export const integrationService = {
  /**
   * Get integration status for all platforms
   */
  async getStatus(
    sessionId: string,
    accountId: string
  ): Promise<Record<string, PlatformStatus>> {
    const response = await apiGet<{ platforms: Record<string, PlatformStatus> }>(
      `/api/integrations/status?session_id=${sessionId}&account_id=${accountId}`
    )
    return response.platforms
  },

  /**
   * Link Google Ads account
   */
  async linkGoogleAds(
    sessionId: string,
    accountId: string,
    googleAdsId: string
  ): Promise<void> {
    await apiPost('/api/integrations/google-ads/link', {
      session_id: sessionId,
      account_id: accountId,
      google_ads_id: googleAdsId
    })
  },

  /**
   * Link GA4 property
   */
  async linkGA4(
    sessionId: string,
    accountId: string,
    propertyId: string
  ): Promise<void> {
    await apiPost('/api/integrations/ga4/link', {
      session_id: sessionId,
      account_id: accountId,
      property_id: propertyId
    })
  },

  /**
   * Link Meta Ads account
   */
  async linkMetaAds(
    sessionId: string,
    accountId: string,
    metaAdsId: string
  ): Promise<void> {
    await apiPost('/api/integrations/meta-ads/link', {
      session_id: sessionId,
      account_id: accountId,
      meta_ads_id: metaAdsId
    })
  },

  /**
   * Link Facebook page
   */
  async linkFacebookPage(
    sessionId: string,
    accountId: string,
    pageId: string
  ): Promise<void> {
    await apiPost('/api/integrations/facebook/link', {
      session_id: sessionId,
      account_id: accountId,
      page_id: pageId
    })
  },

  /**
   * Link Brevo account (with API key)
   */
  async linkBrevo(
    sessionId: string,
    accountId: string,
    apiKey: string
  ): Promise<void> {
    await apiPost('/api/integrations/brevo/link', {
      session_id: sessionId,
      account_id: accountId,
      api_key: apiKey
    })
  },

  /**
   * Link HubSpot account
   */
  async linkHubSpot(
    sessionId: string,
    accountId: string,
    portalId: string
  ): Promise<void> {
    await apiPost('/api/integrations/hubspot/link', {
      session_id: sessionId,
      account_id: accountId,
      portal_id: portalId
    })
  },

  /**
   * Link Mailchimp account
   */
  async linkMailchimp(
    sessionId: string,
    accountId: string,
    mailchimpAccountId: string
  ): Promise<void> {
    await apiPost('/api/integrations/mailchimp/link', {
      session_id: sessionId,
      account_id: accountId,
      mailchimp_account_id: mailchimpAccountId
    })
  }
}
