/**
 * React Hook for MIA SDK
 * 
 * Provides easy access to SDK services with React integration.
 * Handles loading states, errors, and provides convenient methods.
 */

import { useState, useCallback } from 'react'
import { getGlobalSDK } from '../sdk'
import type { APIResponse, MarketingAccount } from '../sdk/types'

export interface SDKHookState {
  isLoading: boolean
  error: string | null
}

export function useMiaSDK() {
  const [state, setState] = useState<SDKHookState>({
    isLoading: false,
    error: null
  })

  const sdk = getGlobalSDK()

  // Helper to handle API calls with loading states
  const withLoading = useCallback(async <T>(
    apiCall: () => Promise<APIResponse<T>>,
    onSuccess?: (data: T) => void,
    onError?: (error: string) => void
  ): Promise<APIResponse<T>> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await apiCall()

      if (result.success && result.data) {
        onSuccess?.(result.data)
      } else {
        const error = result.error || 'Operation failed'
        setState(prev => ({ ...prev, error }))
        onError?.(error)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(errorMessage)
      
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Session helpers
  const sessionHelpers = {
    login: () => withLoading(() => sdk.session.loginGoogleWithPopup()),
    loginMeta: () => withLoading(() => sdk.session.loginMetaWithPopup()),
    logout: () => withLoading(() => sdk.session.logoutGoogle()),
    logoutMeta: () => withLoading(() => sdk.session.logoutMeta()),
    getAccounts: () => withLoading(() => sdk.session.getAvailableAccounts()),
    selectAccount: (accountId: string, businessType?: string, industry?: string) =>
      withLoading(() => sdk.session.selectAccount(accountId, businessType, industry)),
    selectMCC: (mccId: string, mccName?: string) => withLoading(() => sdk.session.selectMCC(mccId, mccName)),
    getAuthURL: (platform: string) => withLoading(() => sdk.session.getAuthURL(platform)),
    completeOAuth: (platform: string, authCode?: string) => withLoading(() => sdk.session.completeOAuth(platform, authCode)),
    bypassLogin: (userId: string) => withLoading(() => sdk.session.bypassLogin(userId)),
    metaBypassLogin: () => withLoading(() => sdk.session.metaBypassLogin())
  }

  // HubSpot helpers
  const hubspotHelpers = {
    getAccounts: () => withLoading(() => sdk.hubspot.getAccounts()),
    selectAccount: (hubspotId: number) => withLoading(() => sdk.hubspot.selectAccount(hubspotId)),
    disconnectAccount: (hubspotId: number) => withLoading(() => sdk.hubspot.disconnectAccount(hubspotId)),
    getAuthStatus: () => withLoading(() => sdk.hubspot.getAuthStatus())
  }

  // Brevo helpers
  const brevoHelpers = {
    getAccounts: () => withLoading(() => sdk.brevo.getAccounts()),
    selectAccount: (brevoId: number, accountId?: string) => withLoading(() => sdk.brevo.selectAccount(brevoId, accountId)),
    disconnectAccount: (brevoId?: number) => withLoading(() => sdk.brevo.disconnectAccount(brevoId)),
    saveApiKey: (apiKey: string, accountId?: string) => withLoading(() => sdk.brevo.saveApiKey(apiKey, accountId))
  }

  // Facebook/Meta helpers
  const facebookHelpers = {
    getPages: () => withLoading(() => sdk.facebook.getPages()),
    linkPage: (pageId: string | null, accountId?: string) => withLoading(() => sdk.facebook.linkPage(pageId, accountId)),
    getMetaAccounts: () => withLoading(() => sdk.facebook.getMetaAccounts()),
    linkMetaAccount: (metaAccountId: string | null, accountId?: string) => 
      withLoading(() => sdk.facebook.linkMetaAccount(metaAccountId, accountId)),
    getCredentialsStatus: () => withLoading(() => sdk.facebook.getCredentialsStatus())
  }

  // Platform helpers
  const platformHelpers = {
    getAvailableAccounts: () => withLoading(() => sdk.platform.getAvailableAccounts()),
    validateAccountSetup: (accountId?: string) => withLoading(() => sdk.platform.validateAccountSetup(accountId)),
    getIndustries: () => withLoading(() => sdk.platform.getIndustries()),
    getGoogleAdAccounts: () => withLoading(() => sdk.platform.getGoogleAdAccounts()),
    selectMCC: (mccId: string, businessType: string, industry?: string) => 
      withLoading(() => sdk.platform.selectMCC(mccId, businessType, industry)),
    linkGA4Properties: (propertyIds: string[], accountId: string) => withLoading(() => sdk.platform.linkGA4Properties(propertyIds, accountId)),
    getHubSpotAuthStatus: () => withLoading(() => sdk.platform.getHubSpotAuthStatus()),
    getBrevoAuthStatus: () => withLoading(() => sdk.platform.getBrevoAuthStatus()),
    getMetaCredentialsStatus: () => withLoading(() => sdk.platform.getMetaCredentialsStatus()),
    getPlatformStatus: () => withLoading(() => sdk.platform.getPlatformStatus())
  }

  // Creative helpers
  const creativeHelpers = {
    analyzeCreative: (question: string, options?: {
      imageUrls?: string[]
      creativeIds?: string[]
      startDate?: string
      endDate?: string
    }) => withLoading(() => sdk.creative.analyzeCreativeWithSession(question, options)),
    generateGrowthInsights: (question: string, options?: {
      user?: string
      selectedAccount?: MarketingAccount
      dateRange?: string
      startDate?: string
      endDate?: string
    }) => 
      withLoading(() => sdk.creative.generateInsights('grow', question, options)),
    generateOptimizeInsights: (question: string, options?: {
      user?: string
      selectedAccount?: MarketingAccount
      dateRange?: string
      startDate?: string
      endDate?: string
    }) =>
      withLoading(() => sdk.creative.generateInsights('optimize', question, options)),
    generateProtectInsights: (question: string, options?: {
      user?: string
      selectedAccount?: MarketingAccount
      dateRange?: string
      startDate?: string
      endDate?: string
    }) =>
      withLoading(() => sdk.creative.generateInsights('protect', question, options))
  }

  // Chat helpers
  const chatHelpers = {
    sendMessage: (message: string, options?: {
      userId?: string
      context?: string
      selectedAccount?: MarketingAccount
    }) => withLoading(() => sdk.chat.chat(message, options)),
    getConversations: () => withLoading(() => sdk.chat.getConversations()),
    createConversation: (title?: string) => withLoading(() => sdk.chat.createConversation(title))
  }

  return {
    // SDK instance (for advanced usage)
    sdk,
    
    // State
    ...state,
    clearError,
    
    // Helper method for custom API calls
    withLoading,
    
    // Service helpers
    session: sessionHelpers,
    hubspot: hubspotHelpers,
    brevo: brevoHelpers,
    facebook: facebookHelpers,
    platform: platformHelpers,
    creative: creativeHelpers,
    chat: chatHelpers
  }
}

// Convenience hook for specific services  
export const useSessionSDK = () => {
  const { session, ...state } = useMiaSDK()
  return { ...session, ...state }
}

export const useHubSpot = () => {
  const { hubspot, ...state } = useMiaSDK()
  return { ...hubspot, ...state }
}

export const useBrevo = () => {
  const { brevo, ...state } = useMiaSDK()
  return { ...brevo, ...state }
}

export const useFacebook = () => {
  const { facebook, ...state } = useMiaSDK()
  return { ...facebook, ...state }
}

export const usePlatform = () => {
  const { platform, ...state } = useMiaSDK()
  return { ...platform, ...state }
}

export const useCreative = () => {
  const { creative, ...state } = useMiaSDK()
  return { ...creative, ...state }
}

export const useChat = () => {
  const { chat, ...state } = useMiaSDK()
  return { ...chat, ...state }
}
