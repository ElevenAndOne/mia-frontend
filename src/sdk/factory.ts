/**
 * SDK Factory
 * 
 * Creates a unified SDK instance with all services
 */

import { APIClient } from './client'
import { SDKConfig } from './types'
import {
  AuthService,
  MetaAuthService,
  MetaAdsService,
  AccountsService,
  AnalyticsService,
  IntegrationsService,
  MCPService
} from './services'

export interface MiaSDK {
  client: APIClient
  auth: AuthService
  metaAuth: MetaAuthService
  metaAds: MetaAdsService
  accounts: AccountsService
  analytics: AnalyticsService
  integrations: IntegrationsService
  mcp: MCPService
}

/**
 * Create a new MIA SDK instance
 * 
 * @param config - Optional SDK configuration
 * @returns Configured SDK instance with all services
 * 
 * @example
 * ```ts
 * import { createMiaSDK } from '@/sdk'
 * 
 * const sdk = createMiaSDK({ debug: true })
 * 
 * // Use auth service
 * const result = await sdk.auth.checkStatus()
 * 
 * // Use analytics service
 * const insights = await sdk.analytics.getSummaryInsights({
 *   session_id: sdk.client.getSessionId()!,
 *   date_range: '7d'
 * })
 * ```
 */
export function createMiaSDK(config: SDKConfig = {}): MiaSDK {
  const client = new APIClient(config)

  return {
    client,
    auth: new AuthService(client),
    metaAuth: new MetaAuthService(client),
    metaAds: new MetaAdsService(client),
    accounts: new AccountsService(client),
    analytics: new AnalyticsService(client),
    integrations: new IntegrationsService(client),
    mcp: new MCPService(client)
  }
}

/**
 * Create a global SDK singleton
 */
let globalSDK: MiaSDK | null = null

export function getGlobalSDK(): MiaSDK {
  if (!globalSDK) {
    globalSDK = createMiaSDK()
  }
  return globalSDK
}

export function setGlobalSDK(sdk: MiaSDK): void {
  globalSDK = sdk
}
