import { ApiClient } from '../client'

export interface SessionOptions {
  sessionId?: string
}

export abstract class BaseService {
  protected constructor(protected readonly client: ApiClient) {}
}
