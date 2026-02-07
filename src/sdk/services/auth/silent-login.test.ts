import { describe, expect, it, vi } from 'vitest'

import type { StorageAdapter } from '../../internal/storage'
import type { Transport } from '../../internal/transport'
import { GoogleAuthService } from './google'
import { MetaAuthService } from './meta'

const createStorage = (): StorageAdapter & {
  setSessionId: ReturnType<typeof vi.fn>
  setUserId: ReturnType<typeof vi.fn>
} => {
  let sessionId: string | null = null
  let userId: string | null = null

  const setSessionId = vi.fn((next: string) => {
    sessionId = next
  })
  const setUserId = vi.fn((next: string) => {
    userId = next
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

describe('silent oauth login services', () => {
  it('google silent login stores session and user on success', async () => {
    const storage = createStorage()
    const request = vi.fn().mockResolvedValue({
      success: true,
      requires_oauth: false,
      session_id: 'sess_google_1',
      user: { id: 'user_google_1', name: 'Google User', email: 'g@example.com' },
    })

    const transport = { request } as unknown as Transport
    const service = new GoogleAuthService(transport, storage)

    const result = await service.loginWithStoredCredentials({ lastUserId: 'user_google_1' })

    expect(result.success).toBe(true)
    expect(result.requiresOAuth).toBe(false)
    expect(storage.setSessionId).toHaveBeenCalledWith('sess_google_1')
    expect(storage.setUserId).toHaveBeenCalledWith('user_google_1')
    expect(request).toHaveBeenCalledWith('/api/oauth/google/login', {
      method: 'POST',
      skipAuth: true,
      body: {
        last_user_id: 'user_google_1',
        allow_recent_fallback: false,
      },
    })
  })

  it('meta silent login maps requires_oauth response', async () => {
    const storage = createStorage()
    const request = vi.fn().mockResolvedValue({
      success: false,
      requires_oauth: true,
    })

    const transport = { request } as unknown as Transport
    const service = new MetaAuthService(transport, storage)

    const result = await service.loginWithStoredCredentials({})

    expect(result.success).toBe(false)
    expect(result.requiresOAuth).toBe(true)
    expect(storage.setSessionId).not.toHaveBeenCalled()
    expect(storage.setUserId).not.toHaveBeenCalled()
  })
})
