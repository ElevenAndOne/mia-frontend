import { useState, useEffect, useRef } from 'react'
import ChatLayout from '../components/chat-layout'
import { BackButton } from '../../../components/back-button'
import ChatEmptyState from '../components/chat-empty-state'
import ChatInput from '../components/chat-input'
import ChatMessage from '../components/chat-message'
import QuickActions from '../components/quick-actions'
import { RaceCampaignTracker } from '../../campaign/components/race-campaign-tracker'
import { IntegrationPromptModal } from '../../../components/integration-prompt-modal'
import { StorageKey } from '../../../constants/storage-keys'
import { setIntegrationHighlight } from '../../integrations/utils/integration-highlight'
import { useChatView } from '../hooks/use-chat-view.tsx'
import { useGoldInsights } from '../../insights/hooks/use-gold-insights'
import { useSession } from '../../../contexts/session-context'
import { trackEvent } from '../../../utils/tracking'

interface ChatViewProps {
  onIntegrationsClick?: () => void
  onCampaignsClick?: () => void
  onReportsClick?: () => void
  onHelpClick?: () => void
  onLogout?: () => void
  onWorkspaceSettings?: () => void
  onNewWorkspace?: () => void
}

export const ChatView = ({
  onIntegrationsClick,
  onCampaignsClick,
  onReportsClick,
  onHelpClick,
  onLogout,
  onWorkspaceSettings,
  onNewWorkspace,
}: ChatViewProps) => {
  const { sessionId } = useSession()
  const { data: goldData } = useGoldInsights(sessionId)

  // Only show "Ready" pulse if completed AND user hasn't viewed the report yet
  const strategiseSeenKey = goldData?.created_at
    ? `${StorageKey.STRATEGISE_SEEN_PREFIX}${goldData.created_at}`
    : null
  const strategiseReady =
    goldData?.status === 'completed' &&
    !!strategiseSeenKey &&
    localStorage.getItem(strategiseSeenKey) !== 'true'

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
    scrollContainerRef,
    lastUserMsgRef,
    handleNewChat,
    handleSubmit,
    handleQuickAction,
    handleConfirmAction,
    handleCancelAction,
    handleCancel,
    handleBack,
    integrationPrompt,
    loadConversation,
  } = useChatView()

  // Track page visit once
  const tracked = useRef(false)
  useEffect(() => {
    if (!tracked.current && sessionId) {
      tracked.current = true
      trackEvent(sessionId, 'page_visit', 'home')
    }
  }, [sessionId])

  const [promptDismissed, setPromptDismissed] = useState(false)

  // Throttle: only show the integration prompt every 5th chat page visit
  const [shouldShowPromptThisVisit] = useState(() => {
    const count =
      parseInt(localStorage.getItem(StorageKey.INTEGRATION_PROMPT_VISIT_COUNT) || '0', 10) + 1
    localStorage.setItem(StorageKey.INTEGRATION_PROMPT_VISIT_COUNT, String(count))
    return count % 5 === 1 // Show on 1st, 6th, 11th visit...
  })

  // Reset dismissal when missing platforms change
  const missingKey = integrationPrompt?.missingPlatformIds.join('|') ?? ''
  useEffect(() => {
    if (!integrationPrompt) return
    setPromptDismissed(false)
  }, [missingKey, integrationPrompt])

  const showIntegrationPrompt =
    Boolean(integrationPrompt) && !promptDismissed && shouldShowPromptThisVisit

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
      hasMessages={hasMessages}
      onIntegrationsClick={onIntegrationsClick}
      onCampaignsClick={onCampaignsClick}
      onReportsClick={onReportsClick}
      onHelpClick={onHelpClick}
      onNewChat={handleNewChat}
      onBack={handleBack}
      onLogout={onLogout}
      onWorkspaceSettings={onWorkspaceSettings}
      onNewWorkspace={onNewWorkspace}
      onLoadConversation={loadConversation}
    >
      <div className="flex-1 flex flex-col h-full min-h-0 pt-14 md:pt-0">
        {!hasMessages ? (
          <>
            <ChatEmptyState userName={userName}>
              <div className="w-full flex flex-col gap-3 pb-4">
                <QuickActions
                  onAction={handleQuickAction}
                  disabled={isLoading || !hasSelectedPlatforms}
                  strategiseReady={strategiseReady}
                />
                <div className="md:mt-3">
                  <RaceCampaignTracker disabled={isLoading} dateRange={dateRange} />
                </div>
              </div>
            </ChatEmptyState>

            <ChatInput
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
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
            {/* Desktop back button — sits above messages, no overlap with sidebar */}
            <div className="hidden md:flex items-center px-4 pt-3 pb-1 shrink-0">
              <BackButton onClick={handleBack} label="Back" variant="dark" />
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0">
              <div className="max-w-3xl mx-auto px-4 py-6">
                {(() => {
                  const visible = messages.filter((m) => !m.hidden)
                  const lastUserIdx = visible.reduce(
                    (acc, m, i) => (m.role === 'user' ? i : acc),
                    -1
                  )
                  return visible.map((message, idx) => (
                    <div key={message.id} ref={idx === lastUserIdx ? lastUserMsgRef : undefined}>
                      <ChatMessage
                        role={message.role}
                        content={message.content}
                        pendingAction={message.pendingAction}
                        actionStatus={message.actionStatus}
                        actionResult={message.actionResult}
                        onConfirmAction={
                          message.pendingAction
                            ? () => handleConfirmAction(message.id)
                            : undefined
                        }
                        onCancelAction={
                          message.pendingAction
                            ? () => handleCancelAction(message.id)
                            : undefined
                        }
                      />
                    </div>
                  ))
                })()}

                {isLoading && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-quaternary">
                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 bg-quaternary rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <div
                          className="w-2 h-2 bg-quaternary rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <div
                          className="w-2 h-2 bg-quaternary rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                      <span className="paragraph-sm">Thinking...</span>
                    </div>
                  </div>
                )}

                {streamingContent && (
                  <ChatMessage role="assistant" content={streamingContent} isStreaming />
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <ChatInput
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
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
