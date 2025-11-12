import { BaseService, SessionOptions } from './baseService'
import type {
  AuthUrlResponse,
  BrevoApiKeySaveRequest,
  BrevoConnectRequest,
  BrevoCredentialsRequest,
  BrevoResponse
} from '../types'

export class IntegrationsService extends BaseService {
  saveBrevoCredentials(payload: BrevoCredentialsRequest, options?: SessionOptions): Promise<BrevoResponse> {
    return this.client.post<BrevoResponse>('/brevo-oauth/save-credentials', payload, {
      sessionId: options?.sessionId
    })
  }

  connectBrevo(payload: BrevoConnectRequest, options?: SessionOptions): Promise<BrevoResponse> {
    return this.client.post<BrevoResponse>('/api/brevo/connect', payload, {
      sessionId: options?.sessionId
    })
  }

  saveBrevoApiKey(payload: BrevoApiKeySaveRequest, options?: SessionOptions): Promise<BrevoResponse> {
    return this.client.post<BrevoResponse>('/api/oauth/brevo/save-api-key', payload, {
      sessionId: options?.sessionId
    })
  }

  getHubspotAuthUrl(options?: SessionOptions): Promise<AuthUrlResponse> {
    return this.client.get<AuthUrlResponse>('/api/oauth/hubspot/auth-url', {
      sessionId: options?.sessionId,
      query: options?.sessionId ? { session_id: options.sessionId } : undefined
    })
  }
}
