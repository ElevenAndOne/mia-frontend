import { BaseService, SessionOptions } from './baseService'
import type {
  ApiSuccessResponse,
  AuthUrlResponse,
  MetaAuthStatusResponse,
  MetaExchangeRequest,
  MetaExchangeResponse,
  OAuthCompleteRequest
} from '../types'

export class MetaAuthService extends BaseService {
  getAuthUrl(options?: SessionOptions): Promise<AuthUrlResponse> {
    return this.client.get<AuthUrlResponse>('/api/oauth/meta/auth-url', {
      sessionId: options?.sessionId,
      query: options?.sessionId ? { session_id: options.sessionId } : undefined
    })
  }

  exchangeCode(payload: MetaExchangeRequest, options?: SessionOptions): Promise<MetaExchangeResponse> {
    return this.client.post<MetaExchangeResponse>('/api/oauth/meta/exchange-token', payload, {
      sessionId: options?.sessionId
    })
  }

  getUserInfo(options?: SessionOptions): Promise<MetaAuthStatusResponse> {
    return this.client.get<MetaAuthStatusResponse>('/api/oauth/meta/user-info', {
      sessionId: options?.sessionId
    })
  }

  checkStatus(options?: SessionOptions): Promise<MetaAuthStatusResponse> {
    return this.client.get<MetaAuthStatusResponse>('/api/oauth/meta/status', {
      sessionId: options?.sessionId
    })
  }

  complete(payload: OAuthCompleteRequest, options?: SessionOptions): Promise<ApiSuccessResponse> {
    return this.client.post<ApiSuccessResponse>('/api/oauth/meta/complete', payload, {
      sessionId: options?.sessionId
    })
  }

  logout(options?: SessionOptions): Promise<ApiSuccessResponse> {
    return this.client.post<ApiSuccessResponse>('/api/oauth/meta/logout', undefined, {
      sessionId: options?.sessionId
    })
  }

  bypassLogin(options?: SessionOptions): Promise<ApiSuccessResponse> {
    return this.client.post<ApiSuccessResponse>('/api/oauth/meta/bypass-login', undefined, {
      sessionId: options?.sessionId
    })
  }
}
