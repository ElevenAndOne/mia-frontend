import { BaseService, SessionOptions } from './baseService'
import type { ApiSuccessResponse, AuthUrlResponse, GoogleAuthStatusResponse, OAuthCompleteRequest } from '../types'

export class AuthService extends BaseService {
  getAuthUrl(options?: SessionOptions): Promise<AuthUrlResponse> {
    return this.client.get<AuthUrlResponse>('/api/oauth/google/auth-url', {
      sessionId: options?.sessionId,
      query: options?.sessionId ? { session_id: options.sessionId } : undefined
    })
  }

  checkStatus(options?: SessionOptions): Promise<GoogleAuthStatusResponse> {
    return this.client.get<GoogleAuthStatusResponse>('/api/oauth/google/status', {
      sessionId: options?.sessionId
    })
  }

  complete(payload: OAuthCompleteRequest, options?: SessionOptions): Promise<ApiSuccessResponse> {
    return this.client.post<ApiSuccessResponse>('/api/oauth/google/complete', payload, {
      sessionId: options?.sessionId
    })
  }

  logout(options?: SessionOptions): Promise<ApiSuccessResponse> {
    return this.client.post<ApiSuccessResponse>('/api/oauth/google/logout', undefined, {
      sessionId: options?.sessionId
    })
  }

  forceLogout(options?: SessionOptions): Promise<ApiSuccessResponse> {
    return this.client.post<ApiSuccessResponse>('/api/oauth/google/force-logout', undefined, {
      sessionId: options?.sessionId
    })
  }

  /**
   * Helper for local testing flows that need to bypass OAuth.
   */
  bypassLogin(options?: SessionOptions): Promise<ApiSuccessResponse> {
    return this.client.post<ApiSuccessResponse>('/api/oauth/bypass-login', undefined, {
      sessionId: options?.sessionId
    })
  }
}
