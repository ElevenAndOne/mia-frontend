import { useEffect, useRef } from 'react'
import { useInlineOnboardingChat } from '../hooks/use-inline-onboarding-chat'
import { OnboardingAccountSelector } from './onboarding-account-selector'
import MetaAccountSelector from '../../integrations/selectors/meta-account-selector'
import GoogleAccountLinkSelector from '../../integrations/selectors/google-account-link-selector'
import { ChatHeader } from './chat-header'
import { ChatMessageList } from './chat-message-list'

interface OnboardingChatProps {
  onComplete: () => void
}

const OnboardingChat = ({ onComplete }: OnboardingChatProps) => {
  const {
    displayedMessages,
    isTyping,
    isStreaming,
    currentProgress,
    showMetaSelector,
    showGoogleSelector,
    showPrimarySelector,
    primarySelectorProvider,
    headerTitle,
    isWorkspaceSubmitting,
    setShowMetaSelector,
    setShowGoogleSelector,
    setShowPrimarySelector,
    handleChoice,
    handleWorkspaceSubmit,
    handleMetaAccountLinked,
    handleGoogleAccountLinked,
    handlePrimaryAccountSelected,
    handleSkipOnboarding,
    selectedAccountName
  } = useInlineOnboardingChat({ onComplete })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayedMessages, isTyping, isStreaming])

  return (
    <div className="flex flex-col h-full bg-primary">
      <ChatHeader current={currentProgress} total={4} title={headerTitle} onSkip={handleSkipOnboarding} />

      <ChatMessageList
        messages={displayedMessages}
        isTyping={isTyping}
        isStreaming={isStreaming}
        onChoiceSelect={handleChoice}
        onInputSubmit={handleWorkspaceSubmit}
        isInputSubmitting={isWorkspaceSubmitting}
        endRef={messagesEndRef}
      />

      <OnboardingAccountSelector
        isOpen={showPrimarySelector}
        provider={primarySelectorProvider}
        onClose={() => setShowPrimarySelector(false)}
        onSuccess={handlePrimaryAccountSelected}
      />

      <MetaAccountSelector
        isOpen={showMetaSelector}
        onClose={() => setShowMetaSelector(false)}
        onSuccess={handleMetaAccountLinked}
        currentGoogleAccountName={selectedAccountName}
      />

      <GoogleAccountLinkSelector
        isOpen={showGoogleSelector}
        onClose={() => setShowGoogleSelector(false)}
        onSuccess={handleGoogleAccountLinked}
      />
    </div>
  )
}

export default OnboardingChat
