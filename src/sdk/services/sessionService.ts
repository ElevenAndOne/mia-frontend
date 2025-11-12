import { BaseService, SessionOptions } from './baseService'
import type { ApiSuccessResponse, SelectMccRequest, SessionValidationResponse } from '../types'

export class SessionService extends BaseService {
  validate(sessionId: string, options?: SessionOptions): Promise<SessionValidationResponse> {
    return this.client.get<SessionValidationResponse>('/api/session/validate', {
      sessionId: options?.sessionId,
      query: { session_id: sessionId }
    })
  }

  selectMcc(payload: SelectMccRequest, options?: SessionOptions): Promise<ApiSuccessResponse> {
    return this.client.post<ApiSuccessResponse>('/api/session/select-mcc', payload, {
      sessionId: options?.sessionId
    })
  }
}
