/**
 * MIA Frontend SDK
 * 
 * Unified SDK for all API interactions with consistent:
 * - Error handling
 * - Session management
 * - Type safety
 * - Request/response patterns
 */

export * from './client'
export * from './types'
export * from './services'
export { createMiaSDK, getGlobalSDK, setGlobalSDK, type MiaSDK } from './factory'
