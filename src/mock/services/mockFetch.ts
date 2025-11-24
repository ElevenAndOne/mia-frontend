/**
 * Mock Fetch Function
 * Intercepts fetch requests and returns mock data when appropriate
 */

import { mockConfig, mockLog } from '../config/mockConfig'
import { 
  getMockGoogleAuthUrl, 
  getMockMetaAuthUrl,
  processMockGoogleAuth,
  processMockMetaAuth,
  getMockAuthStatus,
  getMockMetaAuthStatus
} from '../data/auth'
import { getMockAccountsForUser, getMockAccount } from '../data/accounts'
import { getMockCampaignsForAccount } from '../data/campaigns'
import { generateMockPerformanceData, mockInsightsSummary, generateInsightsByDimension } from '../data/insights'

export const createMockFetch = (originalFetch: typeof fetch = globalThis.fetch): typeof fetch => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!mockConfig.useMockData) {
      return originalFetch(input, init)
    }

    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = init?.method || 'GET'

    // Check if this request should be mocked
    if (!shouldMockRequest(url)) {
      return originalFetch(input, init)
    }

    mockLog(`Mock Fetch: ${method} ${url}`)

    // Simulate network delay
    if (mockConfig.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, mockConfig.delayMs))
    }

    // Simulate random failures
    if (mockConfig.simulateFailures && Math.random() < mockConfig.failureRate) {
      return new Response(
        JSON.stringify({ error: 'Mock network error', success: false }), 
        { 
          status: 500, 
          statusText: 'Internal Server Error',
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }

    try {
      const responseData = await routeMockRequest(url, method, init?.body)
      
      return new Response(JSON.stringify(responseData), {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID'
        }
      })
    } catch (error) {
      mockLog(`Mock fetch error: ${error}`)
      return new Response(
        JSON.stringify({ 
          error: 'Mock server error', 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { 
          status: 500, 
          statusText: 'Internal Server Error',
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
  }
}

function shouldMockRequest(url: string): boolean {
  const mockPatterns = [
    '/api/oauth/',
    '/api/auth/',
    '/api/accounts',
    '/api/campaigns',
    '/api/insights',
    '/api/google-ads',
    '/api/meta-ads',
    '/api/ga4',
    '/api/session'
  ]
  
  return mockPatterns.some(pattern => url.includes(pattern))
}

async function routeMockRequest(url: string, method: string, body?: BodyInit | null): Promise<any> {
  const urlObj = new URL(url)
  const path = urlObj.pathname
  
  // Parse request body if present
  let requestBody: any = null
  if (body) {
    try {
      requestBody = typeof body === 'string' ? JSON.parse(body) : body
    } catch (e) {
      // Body might not be JSON, that's ok
    }
  }

  // Authentication endpoints
  if (path.includes('/api/oauth/google/auth-url')) {
    return getMockGoogleAuthUrl()
  }
  
  if (path.includes('/api/oauth/meta/auth-url')) {
    return getMockMetaAuthUrl()
  }
  
  if (path.includes('/api/oauth/google/exchange') && method === 'POST') {
    return processMockGoogleAuth(requestBody?.code || 'mock_code')
  }
  
  if (path.includes('/api/oauth/meta/exchange') && method === 'POST') {
    return processMockMetaAuth(requestBody?.code || 'mock_code')
  }
  
  if (path.includes('/api/auth/status')) {
    // Extract session ID from headers (this would normally be done by the server)
    return getMockAuthStatus('mock_session_123')
  }
  
  if (path.includes('/api/oauth/meta/status')) {
    return getMockMetaAuthStatus('mock_session_123')
  }

  // Account endpoints
  if (path.includes('/api/accounts') && method === 'GET') {
    return { 
      success: true, 
      data: getMockAccountsForUser('google_12345')
    }
  }
  
  if (path.match(/\/api\/accounts?\/[^\/]+$/)) {
    const accountId = path.split('/').pop()
    return { 
      success: true, 
      data: getMockAccount(accountId) 
    }
  }

  // Campaign endpoints
  if (path.includes('/api/campaigns')) {
    const accountId = urlObj.searchParams.get('account_id') || 'acc_001'
    return { 
      success: true, 
      data: getMockCampaignsForAccount(accountId) 
    }
  }

  // Insights endpoints
  if (path.includes('/api/insights/performance')) {
    const days = parseInt(urlObj.searchParams.get('days') || '30')
    return { 
      success: true, 
      data: generateMockPerformanceData(days) 
    }
  }
  
  if (path.includes('/api/insights/summary')) {
    return { 
      success: true, 
      data: mockInsightsSummary 
    }
  }
  
  if (path.includes('/api/insights/dimension')) {
    const dimension = urlObj.searchParams.get('dimension') as any || 'device'
    return { 
      success: true, 
      data: generateInsightsByDimension(dimension) 
    }
  }

  // Google Ads endpoints
  if (path.includes('/api/google-ads')) {
    return {
      success: true,
      data: {
        campaigns: getMockCampaignsForAccount('acc_001').filter(c => c.platform === 'GOOGLE_ADS'),
        message: 'Mock Google Ads data'
      }
    }
  }

  // Meta Ads endpoints
  if (path.includes('/api/meta-ads')) {
    return {
      success: true,
      data: {
        campaigns: getMockCampaignsForAccount('acc_001').filter(c => c.platform === 'META_ADS'),
        message: 'Mock Meta Ads data'
      }
    }
  }

  // GA4 endpoints
  if (path.includes('/api/ga4')) {
    return {
      success: true,
      data: {
        metrics: generateMockPerformanceData(7),
        message: 'Mock GA4 data'
      }
    }
  }

  // Session endpoints
  if (path.includes('/api/session')) {
    return {
      success: true,
      data: {
        session_id: 'mock_session_123',
        user_id: 'google_12345',
        expires_at: Date.now() + 24 * 60 * 60 * 1000
      }
    }
  }

  // Default fallback
  return {
    success: true,
    message: `Mock endpoint: ${method} ${path}`,
    data: {},
    timestamp: new Date().toISOString()
  }
}
