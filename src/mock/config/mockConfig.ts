/**
 * Mock Configuration
 * Controls behavior of mock data system based on environment variables
 */

export interface MockConfig {
  enabled: boolean
  useMockAuth: boolean
  useMockData: boolean
  enableLogs: boolean
  baseUrl: string
  delayMs: number
  simulateFailures: boolean
  failureRate: number
}

export const mockConfig: MockConfig = {
  enabled: (import.meta as any).env?.VITE_ENVIRONMENT === 'development',
  useMockAuth: (import.meta as any).env?.VITE_USE_MOCK_AUTH === 'true',
  useMockData: (import.meta as any).env?.VITE_USE_MOCK_DATA === 'true', 
  enableLogs: (import.meta as any).env?.VITE_SHOW_API_LOGS === 'true',
  baseUrl: (import.meta as any).env?.VITE_MOCK_AUTH_URL || 'http://localhost:3001/mock',
  delayMs: parseInt((import.meta as any).env?.VITE_MOCK_DELAY_MS || '500'),
  simulateFailures: (import.meta as any).env?.VITE_SIMULATE_FAILURES === 'true',
  failureRate: 0.05 // 5% failure rate when enabled
}

export const isMockEnabled = (): boolean => {
  return mockConfig.enabled && mockConfig.useMockData
}

export const shouldUseMockAuth = (): boolean => {
  return mockConfig.enabled && mockConfig.useMockAuth
}

export const mockLog = (message: string, data?: any): void => {
  if (mockConfig.enableLogs) {
    console.log(`[MOCK] ${message}`, data || '')
  }
}
