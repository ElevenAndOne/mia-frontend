import { describe, expect, it, vi } from 'vitest'
import type { StorageAdapter } from '../internal/storage'
import type { Transport } from '../internal/transport'
import { SessionService } from './session'
import type { RawSessionValidationResponse } from '../types/session'

const createStorage = (initialSessionId: string): StorageAdapter & {
  setSessionId: ReturnType<typeof vi.fn>
  setUserId: ReturnType<typeof vi.fn>
} => {
  let sessionId: string | null = initialSessionId
  let userId: string | null = null

  const setSessionId = vi.fn((nextId: string) => {
    sessionId = nextId
  })
  const setUserId = vi.fn((nextUserId: string) => {
    userId = nextUserId
  })

  return {
    getSessionId: () => sessionId,
    setSessionId,
    clearSession: () => {
      sessionId = null
      userId = null
    },
    getUserId: () => userId,
    setUserId,
  }
}

const createTransport = (response: RawSessionValidationResponse) => {
  const request = vi.fn().mockResolvedValue(response)
  return {
    request,
  } as unknown as Transport & { request: ReturnType<typeof vi.fn> }
}

describe('SessionService bootstrap regression', () => {
  it('maps backend next_action and invite_context during restore', async () => {
    const storage = createStorage('sess_bootstrap_1')
    const transport = createTransport({
      valid: true,
      session_version: '2026-02-bootstrap-v1',
      next_action: 'ACCEPT_INVITE',
      requires_account_selection: false,
      active_tenant_id: null,
      user: {
        user_id: 'user_1',
        name: 'Test User',
        email: 'test@example.com',
        onboarding_completed: false,
      },
      user_authenticated: {
        google: true,
        meta: false,
      },
      platforms: {
        google: false,
        ga4: false,
        meta: false,
        brevo: false,
        hubspot: false,
        mailchimp: false,
      },
      invite_context: {
        pending_invites_count: 1,
        pending_invites: [{
          invite_id: 'inv_1',
          tenant_id: 'tenant_1',
          tenant_name: 'Workspace',
          role: 'viewer',
          expires_at: '2099-01-01T00:00:00Z',
        }],
      },
      memberships: [],
    })
    const service = new SessionService(transport, storage)

    const result = await service.restore()

    expect(transport.request).toHaveBeenCalledWith(
      '/api/session/bootstrap?session_id=sess_bootstrap_1',
      { skipAuth: true }
    )
    expect(result.success).toBe(true)
    expect(result.session?.nextAction).toBe('ACCEPT_INVITE')
    expect(result.session?.inviteContext?.pendingInvitesCount).toBe(1)
    expect(result.session?.inviteContext?.pendingInvites[0]?.inviteId).toBe('inv_1')
    expect(storage.setUserId).toHaveBeenCalledWith('user_1')
  })

  it('falls back to AUTH_REQUIRED when bootstrap response is invalid', async () => {
    const storage = createStorage('sess_invalid_1')
    const transport = createTransport({
      valid: false,
      message: 'Session not found or expired',
      next_action: 'AUTH_REQUIRED',
      session_version: '2026-02-bootstrap-v1',
    })
    const service = new SessionService(transport, storage)

    const result = await service.restore()

    expect(result.success).toBe(true)
    expect(result.isNewSession).toBe(true)
    expect(result.session?.nextAction).toBe('AUTH_REQUIRED')
    expect(result.session?.inviteContext).toBeNull()
  })
})
