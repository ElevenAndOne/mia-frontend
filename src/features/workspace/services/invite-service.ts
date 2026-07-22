import { apiFetch } from '../../../utils/api'

// FastAPI `detail` can be a string OR a structured object/array (e.g. the
// email_mismatch payload, or 422 validation errors). Rendering an object
// directly produces "[object Object]" — always reduce to a readable string.
const detailToMessage = (detail: unknown, fallback: string): string => {
  if (typeof detail === 'string' && detail) return detail
  if (detail && typeof detail === 'object') {
    const d = detail as Record<string, unknown>
    if (d.code === 'email_mismatch' && typeof d.expected_email === 'string') {
      return (
        `This invite was sent to ${d.expected_email}, but you're signed in with a different ` +
        `email. Sign in with ${d.expected_email}, or ask the workspace admin to send a new ` +
        `invite to the email you use.`
      )
    }
    try {
      return JSON.stringify(detail)
    } catch {
      return fallback
    }
  }
  return fallback
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
    const data = await response.json().catch(() => null)
    throw new Error(detailToMessage(data?.detail, 'Failed to accept invite'))
  }

  return response.json()
}
