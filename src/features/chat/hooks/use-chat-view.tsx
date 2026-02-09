import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { Logo } from '../../../components/logo'
import { useIntegrationStatus } from '../../integrations/hooks/use-integration-status'
import { usePlatformPreferences } from '../../integrations/hooks/use-platform-preferences'
import { useMiaClient, isMiaSDKError, ErrorCodes } from '../../../sdk'

interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const CHAT_PLATFORM_CONFIG = [
  { id: 'google_ads', name: 'Google Ads', icon: <Logo.google_ads />, statusKey: 'google' },
  { id: 'ga4', name: 'Google Analytics', icon: <Logo.google_analytics />, statusKey: 'ga4' },
  { id: 'meta_ads', name: 'Meta Ads', icon: <Logo.meta />, statusKey: 'meta' },
  { id: 'facebook_organic', name: 'Facebook Organic', icon: <Logo.facebook />, statusKey: 'facebook_organic' },
  { id: 'brevo', name: 'Brevo', icon: <Logo.brevo />, statusKey: 'brevo' },
  { id: 'mailchimp', name: 'Mailchimp', icon: <Logo.mailchimp />, statusKey: 'mailchimp' },
  { id: 'hubspot', name: 'HubSpot', icon: <Logo.hubspot />, statusKey: 'hubspot' },
]

export const useChatView = () => {
  const navigate = useNavigate()
  const { user, sessionId, selectedAccount, activeWorkspace } = useSession()
  const mia = useMiaClient()
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [dateRange, setDateRange] = useState('30_days')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { platformStatus } = useIntegrationStatus(
    sessionId,
    selectedAccount?.id,
    activeWorkspace?.tenant_id,
  )

  const connectedPlatforms = useMemo(() => {
    if (!platformStatus) return []

    return CHAT_PLATFORM_CONFIG
      .filter((platform) => {
        const status = platformStatus[platform.statusKey as keyof typeof platformStatus]
        return status?.connected
      })
      .map((platform) => platform.id)
  }, [platformStatus])

  const { selectedPlatforms, togglePlatform } = usePlatformPreferences({
    sessionId,
    selectedAccountId: selectedAccount?.id,
    connectedPlatforms,
  })

  const platforms = useMemo(() => {
    return CHAT_PLATFORM_CONFIG.map((platform) => ({
      id: platform.id,
      name: platform.name,
      icon: platform.icon,
      connected: connectedPlatforms.includes(platform.id),
    }))
  }, [connectedPlatforms])

  const hasSelectedPlatforms = selectedPlatforms.length > 0
  const hasMessages = messages.length > 0

  // FEB 2026: Show guidance when platforms need additional configuration
  // GA4 and Facebook Organic share auth with Google Ads and Meta Ads respectively,
  // but require property/page selection in Integrations
  const configurationGuidance = useMemo(() => {
    const needsConfig: string[] = []

    // Google Ads connected but GA4 property not selected
    if (connectedPlatforms.includes('google_ads') && !selectedAccount?.ga4_property_id) {
      needsConfig.push('Google Analytics property')
    }

    // Meta Ads connected but Facebook Page not selected
    if (connectedPlatforms.includes('meta_ads') && !selectedAccount?.facebook_page_id) {
      needsConfig.push('Facebook Page')
    }

    if (needsConfig.length === 0) return null

    return `Select your ${needsConfig.join(' and ')} in Integrations to unlock more insights`
  }, [connectedPlatforms, selectedAccount?.ga4_property_id, selectedAccount?.facebook_page_id])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setStreamingContent('')
  }, [])

  const handleSubmit = useCallback(async (message: string) => {
    const userMessage: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setStreamingContent('')

    try {
      let streamedResponse = ''
      for await (const chunk of mia.chat.stream({
        message,
        dateRange,
        platforms: selectedPlatforms,
        googleAdsId: selectedAccount?.google_ads_id,
        ga4PropertyId: selectedAccount?.ga4_property_id,
      })) {
        if (chunk.type === 'text' && chunk.text) {
          streamedResponse += chunk.text
          setStreamingContent(streamedResponse)
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error || 'Streaming failed')
        }
      }

      const finalContent = streamedResponse.trim()
      if (!finalContent) {
        throw new Error('Empty streaming response')
      }

      setMessages((prev) => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: finalContent,
      }])
      setStreamingContent('')
    } catch (streamError) {
      console.error('[CHAT] Streaming error, falling back to sync request:', streamError)

      try {
        const result = await mia.chat.send({
          message,
          dateRange,
          platforms: selectedPlatforms,
          googleAdsId: selectedAccount?.google_ads_id,
          ga4PropertyId: selectedAccount?.ga4_property_id,
        })

        const assistantMessage: ChatMessageItem = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.success && result.claudeResponse
            ? result.claudeResponse
            : 'Sorry, I had trouble processing your question. Please try again.',
        }

        setMessages((prev) => [...prev, assistantMessage])
      } catch (error) {
        console.error('[CHAT] Fallback error:', error)
        let errorContent = 'Connection error. Please check your connection and try again.'
        if (isMiaSDKError(error)) {
          switch (error.code) {
            case ErrorCodes.SESSION_EXPIRED:
            case ErrorCodes.NO_SESSION:
              errorContent = 'Your session has expired. Please refresh the page to continue.'
              break
            case ErrorCodes.RATE_LIMITED:
              errorContent = 'Too many requests. Please wait a moment and try again.'
              break
            case ErrorCodes.SERVER_ERROR:
              errorContent = 'The server encountered an error. Please try again in a few moments.'
              break
            case ErrorCodes.TIMEOUT:
              errorContent = 'The request timed out. Please try again.'
              break
            case ErrorCodes.FORBIDDEN:
              errorContent = 'You don\'t have permission to perform this action.'
              break
            default:
              errorContent = error.message || errorContent
          }
        }
        const errorMessage: ChatMessageItem = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: errorContent,
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setStreamingContent('')
      }
    } finally {
      setIsLoading(false)
    }
  }, [mia, selectedAccount?.google_ads_id, selectedAccount?.ga4_property_id, dateRange, selectedPlatforms])

  const handleQuickAction = useCallback((actionId: string) => {
    const params = new URLSearchParams()
    if (selectedPlatforms.length > 0) {
      params.set('platforms', selectedPlatforms.join(','))
    }
    params.set('range', dateRange)

    switch (actionId) {
      case 'grow':
        navigate(`/insights/grow?${params.toString()}`)
        break
      case 'optimize':
        navigate(`/insights/optimize?${params.toString()}`)
        break
      case 'protect':
        navigate(`/insights/protect?${params.toString()}`)
        break
    }
  }, [navigate, selectedPlatforms, dateRange])

  return {
    userName: user?.name?.split(' ')[0],
    messages,
    isLoading,
    streamingContent,
    dateRange,
    setDateRange,
    platforms,
    selectedPlatforms,
    togglePlatform,
    hasSelectedPlatforms,
    hasMessages,
    messagesEndRef,
    handleNewChat,
    handleSubmit,
    handleQuickAction,
    configurationGuidance,
  }
}
