/**
 * Mock Server
 * Provides a lightweight HTTP server for development with mock endpoints
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

export interface MockServerConfig {
  port: number
  host: string
  enableCors: boolean
  logRequests: boolean
}

export class MockServer {
  private config: MockServerConfig
  private isRunning = false

  constructor(config: Partial<MockServerConfig> = {}) {
    this.config = {
      port: 3001,
      host: 'localhost',
      enableCors: true,
      logRequests: true,
      ...config
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      mockLog('Mock server is already running')
      return
    }

    mockLog(`Starting mock server at http://${this.config.host}:${this.config.port}`)
    
    // Since we're in a browser environment, we can't actually start a real server
    // Instead, we'll intercept fetch requests using Service Worker or provide mock data directly
    this.setupFetchInterceptor()
    this.isRunning = true
    
    mockLog('Mock server started successfully')
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return
    
    mockLog('Stopping mock server')
    this.isRunning = false
  }

  private setupFetchInterceptor(): void {
    // Intercept fetch requests to mock API endpoints
    const originalFetch = window.fetch
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      
      // Check if this is a request we should mock
      if (this.shouldMockRequest(url)) {
        return this.handleMockRequest(url, init)
      }
      
      // For non-mock requests, use original fetch
      return originalFetch(input, init)
    }
  }

  private shouldMockRequest(url: string): boolean {
    if (!mockConfig.useMockData) return false
    
    const mockPatterns = [
      '/api/oauth/',
      '/api/auth/',
      '/api/accounts',
      '/api/campaigns',
      '/api/insights',
      '/api/google-ads',
      '/api/meta-ads',
      '/api/ga4',
      mockConfig.baseUrl
    ]
    
    return mockPatterns.some(pattern => url.includes(pattern))
  }

  private async handleMockRequest(url: string, init?: RequestInit): Promise<Response> {
    const method = init?.method || 'GET'
    
    mockLog(`Mock Request: ${method} ${url}`)
    
    // Simulate network delay
    if (mockConfig.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, mockConfig.delayMs))
    }
    
    // Simulate random failures
    if (mockConfig.simulateFailures && Math.random() < mockConfig.failureRate) {
      return new Response(
        JSON.stringify({ error: 'Mock server error', success: false }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    try {
      const responseData = await this.routeRequest(url, method, init?.body)
      
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.enableCors ? {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          } : {})
        }
      })
    } catch (error) {
      mockLog(`Mock request error: ${error}`)
      return new Response(
        JSON.stringify({ error: 'Internal server error', success: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  private async routeRequest(url: string, method: string, body?: BodyInit | null): Promise<any> {
    const urlObj = new URL(url, 'http://localhost')
    const path = urlObj.pathname
    
    // Authentication endpoints
    if (path.includes('/oauth/google/auth-url')) {
      return getMockGoogleAuthUrl()
    }
    
    if (path.includes('/oauth/meta/auth-url')) {
      return getMockMetaAuthUrl()
    }
    
    if (path.includes('/oauth/google/exchange') && method === 'POST') {
      const requestBody = body ? JSON.parse(body.toString()) : {}
      return processMockGoogleAuth(requestBody?.code || 'mock_code')
    }
    
    if (path.includes('/oauth/meta/exchange') && method === 'POST') {
      const requestBody = body ? JSON.parse(body.toString()) : {}
      return processMockMetaAuth(requestBody?.code || 'mock_code')
    }
    
    if (path.includes('/auth/status')) {
      return getMockAuthStatus()
    }
    
    if (path.includes('/oauth/meta/status')) {
      return getMockMetaAuthStatus()
    }

    // Account endpoints
    if (path.includes('/accounts') && method === 'GET') {
      return { success: true, data: getMockAccountsForUser('google_12345') }
    }
    
    if (path.match(/\/account\/[^\/]+$/)) {
      const accountId = path.split('/').pop()
      return { success: true, data: getMockAccount(accountId) }
    }

    // Campaign endpoints
    if (path.includes('/campaigns')) {
      const accountId = urlObj.searchParams.get('account_id') || 'acc_001'
      return { success: true, data: getMockCampaignsForAccount(accountId) }
    }

    // Insights endpoints
    if (path.includes('/insights/performance')) {
      const days = parseInt(urlObj.searchParams.get('days') || '30')
      return { success: true, data: generateMockPerformanceData(days) }
    }
    
    if (path.includes('/insights/summary')) {
      return { success: true, data: mockInsightsSummary }
    }
    
    if (path.includes('/insights/dimension')) {
      const dimension = urlObj.searchParams.get('dimension') as any || 'device'
      return { success: true, data: generateInsightsByDimension(dimension) }
    }

    // Default response
    return {
      success: true,
      message: 'Mock endpoint',
      data: {},
      timestamp: new Date().toISOString()
    }
  }
}

// Global mock server instance
export const mockServer = new MockServer()

// Auto-start mock server in development
if (mockConfig.enabled && typeof window !== 'undefined') {
  mockServer.start().catch(console.error)
}
