/**
 * SDK Instance Helper
 * 
 * Provides a global SDK instance for the application
 */

import { createMiaSDK, type MiaSDK } from '../sdk'

// Get API base URL from environment variable with smart defaults
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('ondigitalocean.app')
    ? 'https://dolphin-app-b869e.ondigitalocean.app'
    : 'http://localhost:8000')

let sdkInstance: MiaSDK | null = null

/**
 * Get or create the global SDK instance
 */
export function getSDK(): MiaSDK {
  if (!sdkInstance) {
    // Get session ID from localStorage for consistency with existing auth
    const sessionId = typeof localStorage !== 'undefined' 
      ? localStorage.getItem('mia_session_id') || undefined 
      : undefined

    sdkInstance = createMiaSDK({
      baseURL: API_BASE_URL,
      sessionId,
      debug: import.meta.env.DEV
    })
  }
  
  return sdkInstance
}

/**
 * Update the SDK session ID (call when session changes)
 */
export function updateSDKSession(sessionId: string): void {
  if (sdkInstance) {
    // Update the client's session ID
    sdkInstance.client.setSessionId(sessionId)
  }
}

/**
 * Clear the SDK instance (for logout/cleanup)
 */
export function clearSDK(): void {
  sdkInstance = null
}
