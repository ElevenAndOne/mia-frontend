import { apiFetch } from '../../../utils/api'

export class InviteEmailMismatchError extends Error {
  expectedEmail: string
  constructor(expectedEmail: string) {
    super(`This invite was sent to ${expectedEmail}`)
    this.expectedEmail = expectedEmail
  }
}

export const fetchInviteDetails = async (inviteId: string) => {
  const response = await apiFetch(`/api/tenants/invites/${inviteId}/details`)
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('This invite link is invalid or has expired.')
    }
    throw new Error('Failed to load invite details.')
  }
  return response.json()
}

export const acceptInvite = async (inviteId: string, sessionId: string) => {
  const response = await apiFetch(`/api/tenants/invites/${inviteId}/accept`, {
    method: 'POST',
    headers: {
      'X-Session-ID': sessionId,
    },
  })

  if (!response.ok) {
    const data = await response.json()
    const detail = data.detail
    if (typeof detail === 'object' && detail?.code === 'email_mismatch') {
      throw new InviteEmailMismatchError(detail.expected_email)
    }
    throw new Error(typeof detail === 'string' ? detail : 'Failed to accept invite')
  }

  return response.json()
}
