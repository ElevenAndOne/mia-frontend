/**
 * Account API service
 */
import { apiFetch } from '../../../utils/api'
import type { AccountMapping } from '../types'

export interface AccountsResponse {
  accounts: AccountMapping[]
}

export interface SelectAccountResponse {
  success: boolean
}

/**
 * Fetch available accounts for the current user
 */
export const fetchAccounts = async (sessionId: string): Promise<AccountMapping[]> => {
  const response = await apiFetch('/api/accounts/available', {
    headers: {
      'X-Session-ID': sessionId
    }
  })

  if (!response.ok) {
    throw new Error(`Accounts API failed: ${response.status}`)
  }

  const data: AccountsResponse = await response.json()
  return data.accounts || []
}

/**
 * Select an account for the current session
 */
export const selectAccount = async (
  sessionId: string,
  accountId: string,
  industry?: string
): Promise<SelectAccountResponse> => {
  const requestBody: { account_id: string; session_id: string; industry?: string } = {
    account_id: accountId,
    session_id: sessionId
  }

  if (industry) {
    requestBody.industry = industry
  }

  const response = await apiFetch('/api/accounts/select', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    throw new Error('Failed to select account')
  }

  return response.json()
}
