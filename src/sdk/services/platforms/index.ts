/**
 * Platforms Service
 * mia.platforms - Platform connection management
 */

import type { Transport } from '../../internal/transport';
import type {
  PlatformId,
  PlatformStatus,
  AllPlatformStatuses,
} from '../../types/platforms';
import { BrevoService } from './brevo';
import { HubSpotService } from './hubspot';
import { MailchimpService } from './mailchimp';

export class PlatformsService {
  private transport: Transport;
  readonly brevo: BrevoService;
  readonly hubspot: HubSpotService;
  readonly mailchimp: MailchimpService;

  constructor(transport: Transport) {
    this.transport = transport;
    this.brevo = new BrevoService(transport);
    this.hubspot = new HubSpotService(transport);
    this.mailchimp = new MailchimpService(transport);
  }

  /**
   * Disconnect a platform
   *
   * @example
   * ```typescript
   * try {
   *   await mia.platforms.disconnect('meta');
   *   refreshIntegrationStatus();
   * } catch (error) {
   *   if (isMiaSDKError(error)) {
   *     toast.error('Failed to disconnect platform');
   *   }
   * }
   * ```
   */
  async disconnect(platformId: PlatformId): Promise<void> {
    await this.transport.request(`/api/platform/${platformId}/disconnect`, {
      method: 'POST',
    });
  }

  /**
   * Refresh platform connection/data
   */
  async refresh(platformId: PlatformId): Promise<void> {
    await this.transport.request(`/api/platform/${platformId}/refresh`, {
      method: 'POST',
    });
  }

  /**
   * Get platform connection status
   */
  async getStatus(platformId: PlatformId): Promise<PlatformStatus> {
    return this.transport.request(`/api/platform/${platformId}/status`);
  }

  /**
   * Get all connected platforms
   */
  async getAllStatuses(): Promise<AllPlatformStatuses> {
    const response = await this.transport.request<{
      platforms: Record<string, boolean>;
    }>('/api/auth/platforms');

    const now = new Date().toISOString();
    const defaultStatus: PlatformStatus = {
      connected: false,
      linked: false,
      lastSynced: now,
    };

    const platforms = response.platforms || {};

    return {
      google: platforms.google
        ? { connected: true, linked: true, lastSynced: now }
        : { ...defaultStatus },
      ga4: platforms.ga4
        ? { connected: true, linked: true, lastSynced: now }
        : { ...defaultStatus },
      meta: platforms.meta
        ? { connected: true, linked: true, lastSynced: now }
        : { ...defaultStatus },
      facebookOrganic: platforms.facebook_organic
        ? { connected: true, linked: true, lastSynced: now }
        : { ...defaultStatus },
      brevo: platforms.brevo
        ? { connected: true, linked: true, lastSynced: now }
        : { ...defaultStatus },
      hubspot: platforms.hubspot
        ? { connected: true, linked: true, lastSynced: now }
        : { ...defaultStatus },
      mailchimp: platforms.mailchimp
        ? { connected: true, linked: true, lastSynced: now }
        : { ...defaultStatus },
    };
  }
}

// Re-export sub-services for type access
export { BrevoService } from './brevo';
export { HubSpotService } from './hubspot';
export { MailchimpService } from './mailchimp';
