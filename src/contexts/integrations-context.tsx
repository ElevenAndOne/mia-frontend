import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { getGlobalSDK } from '../sdk'
import { useSession } from './session-context'

export interface PlatformStatus {
  connected: boolean
  linked: boolean
  last_synced?: string
}

export interface IntegrationsState {
  google: PlatformStatus
  meta: PlatformStatus
  brevo: PlatformStatus
  hubspot: PlatformStatus
  ga4: PlatformStatus
}

export interface Integration {
  id: string
  name: string
  description: string
  icon: string
  connected: boolean
  dataPoints?: number
  lastSync?: string
  autoSync?: boolean
}

interface IntegrationsContextType {
  // State
  platforms: IntegrationsState
  integrations: Integration[]
  isLoading: boolean
  error: string | null

  // Actions
  refreshIntegrations: () => Promise<void>
  connectPlatform: (platformId: string) => Promise<boolean>
  disconnectPlatform: (platformId: string) => Promise<boolean>
  getPlatformStatus: (platformId: keyof IntegrationsState) => PlatformStatus
  isConnected: (platformId: keyof IntegrationsState) => boolean
  isLinked: (platformId: keyof IntegrationsState) => boolean
}

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useIntegrations = () => {
  const context = useContext(IntegrationsContext)
  if (!context) {
    throw new Error('useIntegrations must be used within an IntegrationsProvider')
  }
  return context
}

interface IntegrationsProviderProps {
  children: ReactNode
}

const defaultPlatformStatus: PlatformStatus = {
  connected: false,
  linked: false
}

const initialState: IntegrationsState = {
  google: defaultPlatformStatus,
  meta: defaultPlatformStatus,
  brevo: defaultPlatformStatus,
  hubspot: defaultPlatformStatus,
  ga4: defaultPlatformStatus
}

export const IntegrationsProvider: React.FC<IntegrationsProviderProps> = ({ children }) => {
  const { sessionId, selectedAccount } = useSession()
  const [platforms, setPlatforms] = useState<IntegrationsState>(initialState)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshIntegrations = useCallback(async (): Promise<void> => {
    if (!sessionId || !selectedAccount) {
      setError('Missing session or account')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const sdk = getGlobalSDK()
      const result = await sdk.platform.getPlatformStatus()

      if (!result.success || !result.data) {
        throw new Error('Failed to fetch platform status')
      }

      const statusData = result.data

      // Update platforms state
      setPlatforms({
        google: statusData.google || defaultPlatformStatus,
        meta: statusData.meta || defaultPlatformStatus,
        brevo: statusData.brevo || defaultPlatformStatus,
        hubspot: statusData.hubspot || defaultPlatformStatus,
        ga4: statusData.ga4 || defaultPlatformStatus
      })

      // Build integrations list
      const integrationsMap: Integration[] = [
        {
          id: 'google-ads',
          name: 'Google Ads',
          description: 'Advertising platform',
          icon: '/icons/google.png',
          connected: statusData.google?.connected || false,
          lastSync: statusData.google?.last_synced
        },
        {
          id: 'meta-ads',
          name: 'Meta Ads',
          description: 'Facebook & Instagram ads',
          icon: '/icons/meta.png',
          connected: statusData.meta?.connected || false,
          lastSync: statusData.meta?.last_synced
        },
        {
          id: 'brevo',
          name: 'Brevo',
          description: 'Email marketing',
          icon: '/icons/brevo.png',
          connected: statusData.brevo?.connected || false,
          lastSync: statusData.brevo?.last_synced
        },
        {
          id: 'hubspot',
          name: 'HubSpot',
          description: 'CRM & marketing',
          icon: '/icons/hubspot.png',
          connected: statusData.hubspot?.connected || false,
          lastSync: statusData.hubspot?.last_synced
        },
        {
          id: 'ga4',
          name: 'Google Analytics 4',
          description: 'Website analytics',
          icon: '/icons/ga4.png',
          connected: statusData.ga4?.connected || false,
          lastSync: statusData.ga4?.last_synced
        }
      ]

      setIntegrations(integrationsMap)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh integrations'
      setError(errorMessage)
      console.error('[INTEGRATIONS] Error refreshing:', err)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, selectedAccount])

  const connectPlatform = useCallback(async (platformId: string): Promise<boolean> => {
    if (!sessionId || !selectedAccount) {
      setError('Missing session or account')
      return false
    }

    try {
      const sdk = getGlobalSDK()
      const result = await sdk.platform.connectPlatform(platformId, selectedAccount.id)

      if (!result.success) {
        throw new Error(`Failed to connect ${platformId}`)
      }

      await refreshIntegrations()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to connect ${platformId}`
      setError(errorMessage)
      console.error('[INTEGRATIONS] Connection error:', err)
      return false
    }
  }, [sessionId, selectedAccount, refreshIntegrations])

  const disconnectPlatform = useCallback(async (platformId: string): Promise<boolean> => {
    if (!sessionId || !selectedAccount) {
      setError('Missing session or account')
      return false
    }

    try {
      const sdk = getGlobalSDK()
      const result = await sdk.platform.disconnectPlatform(platformId, selectedAccount.id)

      if (!result.success) {
        throw new Error(`Failed to disconnect ${platformId}`)
      }

      await refreshIntegrations()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to disconnect ${platformId}`
      setError(errorMessage)
      console.error('[INTEGRATIONS] Disconnection error:', err)
      return false
    }
  }, [sessionId, selectedAccount, refreshIntegrations])

  const getPlatformStatus = useCallback((platformId: keyof IntegrationsState): PlatformStatus => {
    return platforms[platformId]
  }, [platforms])

  const isConnected = useCallback((platformId: keyof IntegrationsState): boolean => {
    return platforms[platformId]?.connected || false
  }, [platforms])

  const isLinked = useCallback((platformId: keyof IntegrationsState): boolean => {
    return platforms[platformId]?.linked || false
  }, [platforms])

  return (
    <IntegrationsContext.Provider
      value={{
        platforms,
        integrations,
        isLoading,
        error,
        refreshIntegrations,
        connectPlatform,
        disconnectPlatform,
        getPlatformStatus,
        isConnected,
        isLinked
      }}
    >
      {children}
    </IntegrationsContext.Provider>
  )
}
