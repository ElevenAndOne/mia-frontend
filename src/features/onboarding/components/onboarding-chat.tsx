import { useEffect, useRef } from 'react'
import { useOnboardingChat } from '../hooks/use-onboarding-chat'
import MetaAccountSelector from '../../integrations/selectors/meta-account-selector'
import GoogleAccountLinkSelector from '../../integrations/selectors/google-account-link-selector'
import { ChatHeader } from './chat-header'
import { ChatMessageList } from './chat-message-list'

interface OnboardingChatProps {
  onComplete: () => void
  onConnectPlatform: (platformId: string) => void
}

const OnboardingChat = ({ onComplete, onConnectPlatform }: OnboardingChatProps) => {
  const {
    displayedMessages,
    isTyping,
    isStreaming,
    currentProgress,
    showMetaSelector,
    showGoogleSelector,
    setShowMetaSelector,
    setShowGoogleSelector,
    handleChoice,
    handleGoToIntegrations,
    handleMetaAccountLinked,
    handleGoogleAccountLinked,
    selectedAccountName
  } = useOnboardingChat({ onComplete, onConnectPlatform })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayedMessages, isTyping, isStreaming])

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <ChatHeader current={currentProgress} total={4} onManageIntegrations={handleGoToIntegrations} />

      <ChatMessageList
        messages={displayedMessages}
        isTyping={isTyping}
        isStreaming={isStreaming}
        onChoiceSelect={handleChoice}
        endRef={messagesEndRef}
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
