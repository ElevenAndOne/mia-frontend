import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../../contexts/session-context'
import { apiFetch } from '../../../utils/api'
import { usePlatformPreferences } from '../../integrations/hooks/use-platform-preferences'
import ChatLayout from './chat-layout'
import ChatEmptyState from './chat-empty-state'
import ChatInput from './chat-input'
import ChatMessage from './chat-message'
import QuickActions from './quick-actions'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatViewProps {
  onIntegrationsClick?: () => void
  onLogout?: () => void
}

export const ChatView = ({ onIntegrationsClick, onLogout: _onLogout }: ChatViewProps) => {
  const navigate = useNavigate()
  const { user, sessionId, selectedAccount, activeWorkspace, refreshWorkspaces } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [dateRange, setDateRange] = useState('30_days')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Refresh workspaces on mount to get latest platform connections
  useEffect(() => {
    if (sessionId) {
      refreshWorkspaces().catch(err => console.error('[ChatView] Failed to refresh workspaces:', err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  // Platform configuration - maps to backend platform IDs
  const platformConfig = useMemo(() => [
    { id: 'google_ads', name: 'Google Ads', icon: '/icons/radio buttons/Google-ads.png' },
    { id: 'ga4', name: 'Google Analytics', icon: '/icons/radio buttons/Google-analytics.png' },
    { id: 'meta_ads', name: 'Meta Ads', icon: '/icons/radio buttons/Meta.png' },
    { id: 'facebook_organic', name: 'Facebook Organic', icon: '/icons/radio buttons/Facebook.png' },
    { id: 'brevo', name: 'Brevo', icon: '/icons/radio buttons/Brevo.png' },
    { id: 'mailchimp', name: 'Mailchimp', icon: '/icons/radio buttons/mailchimp.png' },
    { id: 'hubspot', name: 'HubSpot', icon: '/icons/radio buttons/Hubspot.png' },
  ], [])

  // Get connected platforms from workspace
  const connectedPlatforms = useMemo(() => {
    if (activeWorkspace?.connected_platforms) {
      return activeWorkspace.connected_platforms
    }
    return []
  }, [activeWorkspace])

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
    >
      <div className="flex-1 flex flex-col h-full pt-14 md:pt-0">
        {!hasMessages ? (
          <>
            <ChatEmptyState userName={user?.name?.split(' ')[0]} />

            {/* Quick action suggestions */}
            <div className="px-4 pb-4">
              <QuickActions
                onAction={handleQuickAction}
                disabled={isLoading || !hasSelectedPlatforms}
              />
            </div>

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
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm">Thinking...</span>
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
