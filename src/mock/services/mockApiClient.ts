/**
 * Mock API Client
 * Intercepts API calls and returns mock data instead of making real requests
 */

import { ApiClient, ApiClientConfig, ApiRequestOptions, ApiError } from '../../sdk/client'
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

export class MockApiClient extends ApiClient {
  constructor(config: ApiClientConfig) {
    super(config)
  }

  async request<T = unknown>(options: ApiRequestOptions): Promise<T> {
    if (!mockConfig.useMockData) {
      // If mock is disabled, use real API client
      return super.request<T>(options)
    }

    mockLog(`Mock API Request: ${options.method || 'GET'} ${options.path}`, options)

    // Simulate network delay
    if (mockConfig.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, mockConfig.delayMs))
    }

    // Simulate random failures if enabled
    if (mockConfig.simulateFailures && Math.random() < mockConfig.failureRate) {
      throw new ApiError(
        'Mock API Error: Simulated failure',
        500,
        { error: 'Simulated network error' },
        options,
        new Response('', { status: 500 })
      )
    }

    // Route to appropriate mock handler
    return this.routeMockRequest<T>(options)
  }

  private async routeMockRequest<T>(options: ApiRequestOptions): Promise<T> {
    const { path, method = 'GET', body } = options
    
    // Authentication endpoints
    if (path.includes('/api/oauth/google/auth-url')) {
      return getMockGoogleAuthUrl() as T
    }
    
    if (path.includes('/api/oauth/meta/auth-url')) {
      return getMockMetaAuthUrl() as T
    }
    
    if (path.includes('/api/oauth/google/exchange') && method === 'POST') {
      const requestBody = typeof body === 'string' ? JSON.parse(body) : body as any
      return processMockGoogleAuth(requestBody?.code || 'mock_code') as T
    }
    
    if (path.includes('/api/oauth/meta/exchange') && method === 'POST') {
      const requestBody = typeof body === 'string' ? JSON.parse(body) : body as any
      return processMockMetaAuth(requestBody?.code || 'mock_code') as T
    }
    
    if (path.includes('/api/auth/status')) {
      return getMockAuthStatus(options.sessionId) as T
    }
    
    if (path.includes('/api/oauth/meta/status')) {
      return getMockMetaAuthStatus(options.sessionId) as T
    }

    // Account endpoints
    if (path.includes('/api/accounts')) {
      const userId = 'google_12345' // Mock user ID
      return getMockAccountsForUser(userId) as T
    }
    
    if (path.match(/\/api\/account\/[^\/]+$/)) {
      const accountId = path.split('/').pop()
      return getMockAccount(accountId) as T
    }

    // Campaign endpoints
    if (path.includes('/api/campaigns')) {
      const accountId = extractAccountIdFromPath(path) || 'acc_001'
      return getMockCampaignsForAccount(accountId) as T
    }

    // Insights endpoints
    if (path.includes('/api/insights/performance')) {
      const days = extractQueryParam(path, 'days') || 30
      return generateMockPerformanceData(Number(days)) as T
    }
    
    if (path.includes('/api/insights/summary')) {
      return mockInsightsSummary as T
    }
    
    if (path.includes('/api/insights/dimension')) {
      const dimension = extractQueryParam(path, 'dimension') as 'device' | 'age_group' | 'gender' | 'location'
      return generateInsightsByDimension(dimension || 'device') as T
    }

    // Google Ads specific endpoints
    if (path.includes('/api/google-ads')) {
      return this.handleGoogleAdsEndpoint<T>(path, options)
    }

    // Meta Ads specific endpoints
    if (path.includes('/api/meta-ads')) {
      return this.handleMetaAdsEndpoint<T>(path, options)
    }

    // GA4 specific endpoints
    if (path.includes('/api/ga4')) {
      return this.handleGA4Endpoint<T>(path, options)
    }

    // Default fallback
    mockLog(`Unhandled mock endpoint: ${path}`)
    return {
      success: true,
      message: 'Mock response',
      data: {}
    } as T
  }

  private handleGoogleAdsEndpoint<T>(path: string, options: ApiRequestOptions): T {
    // Mock Google Ads API responses
    return {
      success: true,
      data: {
        campaigns: getMockCampaignsForAccount('acc_001').filter(c => c.platform === 'GOOGLE_ADS')
      }
    } as T
  }

  private handleMetaAdsEndpoint<T>(path: string, options: ApiRequestOptions): T {
    // Mock Meta Ads API responses
    return {
      success: true,
      data: {
        campaigns: getMockCampaignsForAccount('acc_001').filter(c => c.platform === 'META_ADS')
      }
    } as T
  }

  private handleGA4Endpoint<T>(path: string, options: ApiRequestOptions): T {
    // Mock GA4 API responses
    return {
      success: true,
      data: {
        metrics: generateMockPerformanceData(7)
      }
    } as T
  }
}

// Utility functions
function extractAccountIdFromPath(path: string): string | null {
  const match = path.match(/account[\/=]([^\/&]+)/)
  return match ? match[1] : null
}

function extractQueryParam(path: string, param: string): string | null {
  const url = new URL(path, 'http://localhost')
  return url.searchParams.get(param)
}
