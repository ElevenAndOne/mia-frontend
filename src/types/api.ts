import { UserProfile, AccountMapping } from './account'
import { Workspace } from './workspace'

export interface ApiError {
  message: string
  code?: string
  status?: number
}

export interface ApiResponse<T> {
  data: T
  error?: ApiError
}

// Specific API response types
export interface AccountsResponse {
  accounts: AccountMapping[]
}

export interface WorkspacesResponse {
  tenants: Workspace[]
}

export interface SessionResponse {
  session_id: string
  user: UserProfile
}
