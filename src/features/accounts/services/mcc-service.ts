import { apiFetch } from '../../../utils/api'

export interface MccAccount {
  customer_id: string
  descriptive_name: string
  account_count: number
  manager: boolean
  sub_account_ids?: string[]
}

export const fetchMccAccounts = async (userId: string): Promise<MccAccount[]> => {
  const url = `/api/oauth/google/ad-accounts?user_id=${encodeURIComponent(userId)}`
  const response = await apiFetch(url, { method: 'GET' })
  if (!response.ok) {
    throw new Error('Failed to fetch accounts')
  }
  const data = await response.json()
  return data.mcc_accounts || []
}

export const selectMccAccount = async (sessionId: string, mccId: string) => {
  const response = await apiFetch('/api/session/select-mcc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, mcc_id: mccId }),
  })

  if (!response.ok) {
    throw new Error('Failed to store MCC selection')
  }
}
