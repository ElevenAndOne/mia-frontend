import { useState, useEffect } from 'react'
import ChatLayout from '../components/chat-layout'
import ChatEmptyState from '../components/chat-empty-state'
import ChatInput from '../components/chat-input'
import ChatMessage from '../components/chat-message'
import QuickActions from '../components/quick-actions'
import { IntegrationPromptModal } from '../../../components/integration-prompt-modal'
import { setIntegrationHighlight } from '../../integrations/utils/integration-highlight'
import { useChatView } from '../hooks/use-chat-view.tsx'

interface ChatViewProps {
  onIntegrationsClick?: () => void
  onHelpClick?: () => void
  onLogout?: () => void
  onWorkspaceSettings?: () => void
}

export const ChatView = ({ onIntegrationsClick, onHelpClick, onLogout, onWorkspaceSettings }: ChatViewProps) => {
  const {
    userName,
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
    integrationPrompt,
  } = useChatView()

  const [promptDismissed, setPromptDismissed] = useState(false)

  // Reset dismissal when missing platforms change
  const missingKey = integrationPrompt?.missingPlatformIds.join('|') ?? ''
  useEffect(() => {
    if (!integrationPrompt) return
    setPromptDismissed(false)
  }, [missingKey, integrationPrompt])

  const showIntegrationPrompt = Boolean(integrationPrompt) && !promptDismissed

  const handleIntegrationPromptAction = () => {
    if (integrationPrompt) {
      setIntegrationHighlight(integrationPrompt.missingPlatformIds)
    }
    setPromptDismissed(true)
    onIntegrationsClick?.()
  }

  const handleIntegrationPromptClose = () => {
    setPromptDismissed(true)
  }

  return (
    <ChatLayout
      onIntegrationsClick={onIntegrationsClick}
      onHelpClick={onHelpClick}
      onNewChat={handleNewChat}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
    >
      <div className="flex-1 flex flex-col h-full pt-14 md:pt-0">
        {!hasMessages ? (
          <>
            <ChatEmptyState userName={userName}>
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
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-6">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                  />
                ))}

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

      {integrationPrompt && (
        <IntegrationPromptModal
          isOpen={showIntegrationPrompt}
          title={integrationPrompt.title}
          message={integrationPrompt.message}
          missing={integrationPrompt.missing}
          primaryActionLabel={integrationPrompt.primaryActionLabel}
          onPrimaryAction={handleIntegrationPromptAction}
          onClose={handleIntegrationPromptClose}
        />
      )}
    </ChatLayout>
  )
}

export default ChatView
