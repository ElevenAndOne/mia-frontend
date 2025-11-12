import { BaseService, SessionOptions } from './baseService'
import type {
  AvailableAccountsResponse,
  GoogleAdAccountsResponse,
  LinkPlatformRequest,
  LinkPlatformResponse,
  SelectAccountRequest,
  SelectAccountResponse
} from '../types'

export class AccountService extends BaseService {
  getAvailable(options?: SessionOptions): Promise<AvailableAccountsResponse> {
    return this.client.get<AvailableAccountsResponse>('/api/accounts/available', {
      sessionId: options?.sessionId
    })
  }

  selectAccount(payload: SelectAccountRequest, options?: SessionOptions): Promise<SelectAccountResponse> {
    return this.client.post<SelectAccountResponse>('/api/accounts/select', payload, {
      sessionId: options?.sessionId
    })
  }

  linkPlatform(payload: LinkPlatformRequest, options?: SessionOptions): Promise<LinkPlatformResponse> {
    return this.client.post<LinkPlatformResponse>('/api/accounts/link-platform', payload, {
      sessionId: options?.sessionId
    })
  }

  getGoogleAdAccounts(userId?: string, options?: SessionOptions): Promise<GoogleAdAccountsResponse> {
    return this.client.get<GoogleAdAccountsResponse>('/api/oauth/google/ad-accounts', {
      sessionId: options?.sessionId,
      query: userId ? { user_id: userId } : undefined
    })
  }
}
