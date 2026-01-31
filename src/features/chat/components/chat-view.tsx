import ChatLayout from './chat-layout'
import ChatEmptyState from './chat-empty-state'
import ChatInput from './chat-input'
import ChatMessage from './chat-message'
import QuickActions from './quick-actions'
import { useChatView } from '../hooks/use-chat-view'

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
  } = useChatView()

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
    </ChatLayout>
  )
}

export default ChatView
