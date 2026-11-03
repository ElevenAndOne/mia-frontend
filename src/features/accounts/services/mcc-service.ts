import { apiFetch } from '../../../utils/api'
import { withWorkspace } from '../../integrations/utils/with-workspace'

export interface MccAccount {
  customer_id: string
  descriptive_name: string
  account_count: number
  manager: boolean
  sub_account_ids?: string[]
}

export const fetchMccAccounts = async (
  userId: string,
  tenantId?: string | null
): Promise<MccAccount[]> => {
  const url = withWorkspace(
    `/api/oauth/google/ad-accounts?user_id=${encodeURIComponent(userId)}`,
    tenantId
  )
  const response = await apiFetch(url, { method: 'GET' })
  if (!response.ok) {
    throw new Error('Failed to fetch accounts')
  }
  const data = await response.json()
  return data.mcc_accounts || []
}

export const selectMccAccount = async (
  sessionId: string,
  mccId: string,
  // The workspace on screen: this rewrites that workspace's Google Ads MCC routing.
  tenantId?: string | null
) => {
  const response = await apiFetch('/api/session/select-mcc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, mcc_id: mccId, tenant_id: tenantId || null }),
  })

  if (!response.ok) {
    throw new Error('Failed to store MCC selection')
  }
}
