import { ApiClient, ApiClientConfig } from './client'
import { AuthService } from './services/authService'
import { MetaAuthService } from './services/metaAuthService'
import { SessionService } from './services/sessionService'
import { AccountService } from './services/accountService'
import { MetaAdsService } from './services/metaAdsService'
import { McpService } from './services/mcpService'
import { InsightsService } from './services/insightsService'
import { IntegrationsService } from './services/integrationsService'

export class MiaSDK {
  readonly client: ApiClient
  readonly auth: AuthService
  readonly metaAuth: MetaAuthService
  readonly session: SessionService
  readonly accounts: AccountService
  readonly metaAds: MetaAdsService
  readonly mcp: McpService
  readonly insights: InsightsService
  readonly integrations: IntegrationsService

  constructor(config: ApiClientConfig) {
    this.client = new ApiClient(config)
    this.auth = new AuthService(this.client)
    this.metaAuth = new MetaAuthService(this.client)
    this.session = new SessionService(this.client)
    this.accounts = new AccountService(this.client)
    this.metaAds = new MetaAdsService(this.client)
    this.mcp = new McpService(this.client)
    this.insights = new InsightsService(this.client)
    this.integrations = new IntegrationsService(this.client)
  }

  setSessionId(sessionId?: string): void {
    this.client.setSessionId(sessionId)
  }

  setApiKey(apiKey?: string): void {
    this.client.setApiKey(apiKey)
  }
}

export const createMiaSdk = (config: ApiClientConfig): MiaSDK => new MiaSDK(config)

export { ApiClient, ApiError } from './client'
export type { ApiClientConfig, ApiRequestOptions, QueryParams, QueryValue } from './client'

export { AuthService } from './services/authService'
export { MetaAuthService } from './services/metaAuthService'
export { SessionService } from './services/sessionService'
export { AccountService } from './services/accountService'
export { MetaAdsService } from './services/metaAdsService'
export { McpService } from './services/mcpService'
export { InsightsService } from './services/insightsService'
export { IntegrationsService } from './services/integrationsService'
export type { SessionOptions } from './services/baseService'

export * from './types'
