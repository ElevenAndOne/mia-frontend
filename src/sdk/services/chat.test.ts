import { describe, expect, it, vi } from 'vitest'

import type { StorageAdapter } from '../internal/storage'
import type { Transport } from '../internal/transport'
import { ChatService } from './chat'
import { createSSEStream } from '../internal/sse'

vi.mock('../internal/sse', () => ({
  createSSEStream: vi.fn(),
}))

const createStorage = (): StorageAdapter => ({
  getSessionId: () => 'sess_1',
  setSessionId: () => {},
  clearSession: () => {},
  getUserId: () => 'user_1',
  setUserId: () => {},
})

describe('ChatService.stream', () => {
  it('calls createSSEStream with chat stream endpoint and payload', () => {
    const transport = {
      getBaseUrl: () => 'http://localhost:8000',
    } as unknown as Transport

    const storage = createStorage()
    const service = new ChatService(transport, storage)

    const mockedStream = (async function* () {
      yield { type: 'done' as const }
    })()
    vi.mocked(createSSEStream).mockReturnValue(mockedStream)

    const stream = service.stream({
      message: 'How is performance?',
      dateRange: '30_days',
      platforms: ['google_ads', 'meta_ads'],
      googleAdsId: '123',
      ga4PropertyId: 'properties/1',
      metaAdsId: 'act_1',
    })

    expect(stream).toBe(mockedStream)
    expect(createSSEStream).toHaveBeenCalledWith(
      {
        baseUrl: 'http://localhost:8000',
        storage,
        timeout: 120000,
      },
      '/api/chat/stream',
      {
        message: 'How is performance?',
        user_id: 'user_1',
        date_range: '30_days',
        selected_platforms: ['google_ads', 'meta_ads'],
        google_ads_id: '123',
        ga4_property_id: 'properties/1',
        meta_ads_id: 'act_1',
      }
    )
  })
})
