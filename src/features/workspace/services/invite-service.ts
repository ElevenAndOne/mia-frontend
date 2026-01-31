import { apiFetch } from '../../../utils/api'

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
    throw new Error(data.detail || 'Failed to accept invite')
  }

  return response.json()
}
