import React, { createContext, useContext, ReactNode } from 'react'
import { MiaSDK, ApiClientConfig } from '../sdk'
import { isMockEnabled } from '../mock/config/mockConfig'
import { createMockFetch } from '../mock/services/mockFetch'

// Get base URL from environment or smart defaults  
const getBaseUrl = (): string => {
  // Check if we're in browser environment
  if (typeof window === 'undefined') return 'http://localhost:8000'
  
  // Use Vite environment variable if available
  const viteApiUrl = (import.meta as any).env?.VITE_API_BASE_URL
  if (viteApiUrl) return viteApiUrl
  
  // Smart default based on hostname
  if (window.location.hostname.includes('ondigitalocean.app')) {
    return 'https://dolphin-app-b869e.ondigitalocean.app'
  }
  
  return 'http://localhost:8000'
}

// Create SDK configuration
const sdkConfig: ApiClientConfig = {
  baseUrl: getBaseUrl(),
  defaultHeaders: {
    'Content-Type': 'application/json'
  }
}

// Create SDK instance with optional mock fetch function
const createSdkInstance = (): MiaSDK => {
  const config = { ...sdkConfig }
  
  if (isMockEnabled()) {
    console.log('[MIA SDK] Using mock data for development')
    // Use mock fetch function to intercept API calls
    config.fetchFn = createMockFetch()
  }
  
  return new MiaSDK(config)
}

const sdk = createSdkInstance()

// Create context
const SdkContext = createContext<MiaSDK | null>(null)

// Provider component
interface SdkProviderProps {
  children: ReactNode
}

export const SdkProvider: React.FC<SdkProviderProps> = ({ children }) => {
  return (
    <SdkContext.Provider value={sdk}>
      {children}
    </SdkContext.Provider>
  )
}

// Hook to use SDK
export const useSdk = (): MiaSDK => {
  const context = useContext(SdkContext)
  if (!context) {
    throw new Error('useSdk must be used within an SdkProvider')
  }
  return context
}

// Export SDK instance for direct access if needed
export { sdk }
