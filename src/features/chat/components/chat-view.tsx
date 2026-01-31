import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { apiFetch } from '../../../utils/api'
import { usePlatformPreferences } from '../../integrations/hooks/use-platform-preferences'
import { useIntegrationStatus } from '../../integrations/hooks/use-integration-status'
import ChatLayout from './chat-layout'
import ChatEmptyState from './chat-empty-state'
import ChatInput from './chat-input'
import ChatMessage from './chat-message'
import QuickActions from './quick-actions'
import { Logo } from '../../../components/logo'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatViewProps {
  onIntegrationsClick?: () => void
  onLogout?: () => void
  onWorkspaceSettings?: () => void
}

export const ChatView = ({ onIntegrationsClick, onLogout, onWorkspaceSettings }: ChatViewProps) => {
  const navigate = useNavigate()
  const { user, sessionId, selectedAccount, activeWorkspace } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [dateRange, setDateRange] = useState('30_days')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use the same integration status hook as the integrations page
  // This ensures consistent platform connection status across the app
  const { platformStatus, isLoading: isLoadingStatus } = useIntegrationStatus(
    sessionId,
    selectedAccount?.id,
    activeWorkspace?.tenant_id
  )

  // Debug logging for platform status
  useEffect(() => {
    console.log('[ChatView] ========================================')
    console.log('[ChatView] sessionId:', sessionId)
    console.log('[ChatView] selectedAccount?.id:', selectedAccount?.id)
    console.log('[ChatView] activeWorkspace?.tenant_id:', activeWorkspace?.tenant_id)
    console.log('[ChatView] isLoadingStatus:', isLoadingStatus)
    console.log('[ChatView] platformStatus:', platformStatus)
    if (platformStatus) {
      console.log('[ChatView] google.connected:', platformStatus.google?.connected)
      console.log('[ChatView] ga4.connected:', platformStatus.ga4?.connected)
      console.log('[ChatView] meta.connected:', platformStatus.meta?.connected)
    }
    console.log('[ChatView] ========================================')
  }, [sessionId, selectedAccount?.id, activeWorkspace?.tenant_id, platformStatus, isLoadingStatus])

  // Platform configuration - maps to backend platform IDs
  // Note: platformStatus uses 'google' and 'meta' keys, but we use 'google_ads' and 'meta_ads' for consistency
  const platformConfig = useMemo(() => [
    { id: 'google_ads', name: 'Google Ads', icon: <Logo.google_ads />, statusKey: 'google' },
    { id: 'ga4', name: 'Google Analytics', icon: <Logo.google_analytics />, statusKey: 'ga4' },
    { id: 'meta_ads', name: 'Meta Ads', icon: <Logo.meta />, statusKey: 'meta' },
    { id: 'facebook_organic', name: 'Facebook Organic', icon: <Logo.facebook />, statusKey: 'facebook_organic' },
    { id: 'brevo', name: 'Brevo', icon: <Logo.brevo />, statusKey: 'brevo' },
    { id: 'mailchimp', name: 'Mailchimp', icon: <Logo.mailchimp />, statusKey: 'mailchimp' },
    { id: 'hubspot', name: 'HubSpot', icon: <Logo.hubspot />, statusKey: 'hubspot' },
  ], [])

  // Get connected platforms from platformStatus (same source as integrations page)
  const connectedPlatforms = useMemo(() => {
    if (!platformStatus) {
      console.log('[ChatView] connectedPlatforms: platformStatus is null, returning []')
      return []
    }

    const connected = platformConfig
      .filter(p => {
        const status = platformStatus[p.statusKey as keyof typeof platformStatus]
        return status?.connected
      })
      .map(p => p.id)

    console.log('[ChatView] connectedPlatforms:', connected)
    return connected
  }, [platformStatus, platformConfig])

  // Platform preferences with caching and debounced saves
  const { selectedPlatforms, togglePlatform } = usePlatformPreferences({
    sessionId,
    selectedAccountId: selectedAccount?.id,
    connectedPlatforms
  })

  // Build platforms array for ChatInput
  const platforms = useMemo(() => {
    return platformConfig.map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      connected: connectedPlatforms.includes(p.id)
    }))
  }, [platformConfig, connectedPlatforms])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  const handleNewChat = () => {
    setMessages([])
    setStreamingContent('')
  }

  const handleSubmit = useCallback(async (message: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setStreamingContent('')

    try {
      const response = await apiFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default',
        },
        body: JSON.stringify({
          message: message,
          session_id: sessionId,
          user_id: user?.google_user_id || '',
          google_ads_id: selectedAccount?.google_ads_id,
          ga4_property_id: selectedAccount?.ga4_property_id,
          selected_platforms: selectedPlatforms,
          date_range: dateRange
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.success && result.claude_response
          ? result.claude_response
          : 'Sorry, I had trouble processing your question. Please try again.'
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('[CHAT] Error:', error)
      const errorMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Connection error. Please check your connection and try again.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, selectedAccount, user, selectedPlatforms, dateRange])

  // Handle quick actions - navigate to insights pages with selected platforms
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

  const hasMessages = messages.length > 0
  const hasSelectedPlatforms = selectedPlatforms.length > 0

  return (
    <ChatLayout
      onIntegrationsClick={onIntegrationsClick}
      onNewChat={handleNewChat}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
    >
      <div className="flex-1 flex flex-col h-full pt-14 md:pt-0">
        {!hasMessages ? (
          <>
            <ChatEmptyState userName={user?.name?.split(' ')[0]}>
              <QuickActions
                onAction={handleQuickAction}
                disabled={isLoading || !hasSelectedPlatforms}
              />
            </ChatEmptyState>

            <ChatInput
              onSubmit={handleSubmit}
              disabled={isLoading}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              platforms={platforms}
              selectedPlatforms={selectedPlatforms}
              onPlatformToggle={togglePlatform}
              hasSelectedPlatforms={hasSelectedPlatforms}
            />
          </>
        ) : (
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-6">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                  />
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-quaternary">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-quaternary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="paragraph-sm">Thinking...</span>
                    </div>
                  </div>
                )}

                {/* Streaming content */}
                {streamingContent && (
                  <ChatMessage
                    role="assistant"
                    content={streamingContent}
                    isStreaming
                  />
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input at bottom */}
            <ChatInput
              onSubmit={handleSubmit}
              disabled={isLoading}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              platforms={platforms}
              selectedPlatforms={selectedPlatforms}
              onPlatformToggle={togglePlatform}
              hasSelectedPlatforms={hasSelectedPlatforms}
            />
          </>
        )}
      </div>
    </ChatLayout>
  )
}

export default ChatView
