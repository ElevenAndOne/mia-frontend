import { useEffect, type MutableRefObject } from 'react'
import type { ChatMessageInput } from '../onboarding-chat-types'
import { buildWelcomeMessages, buildWorkspacePrompt, getPrimaryProvider } from '../utils/onboarding-inline-messages'

interface UseOnboardingInitializationArgs {
  sessionId: string | null
  hasInitializedRef: MutableRefObject<boolean>
  activeWorkspaceName?: string
  selectedAccountId?: string
  isAuthenticated: boolean
  isMetaAuthenticated: boolean
  loadOnboardingStatus: () => Promise<string | null>
  queueMessages: (messages: ChatMessageInput[]) => void
  setHeaderTitle: (title: string) => void
  queuePlatformPrompt: (provider: 'google' | 'meta') => void
  startBronzeAndSilverFlow: () => Promise<void>
}

export const useOnboardingInitialization = ({
  sessionId,
  hasInitializedRef,
  activeWorkspaceName,
  selectedAccountId,
  isAuthenticated,
  isMetaAuthenticated,
  loadOnboardingStatus,
  queueMessages,
  setHeaderTitle,
  queuePlatformPrompt,
  startBronzeAndSilverFlow
}: UseOnboardingInitializationArgs) => {
  useEffect(() => {
    if (!sessionId || hasInitializedRef.current) {
      return
    }

    hasInitializedRef.current = true
    void loadOnboardingStatus()
    queueMessages(buildWelcomeMessages())

    const provider = getPrimaryProvider(isAuthenticated, isMetaAuthenticated)
    if (selectedAccountId) {
      void startBronzeAndSilverFlow()
      return
    }

    if (!activeWorkspaceName) {
      setHeaderTitle('Create Workspace')
      queueMessages(buildWorkspacePrompt())
      return
    }

    queuePlatformPrompt(provider)
  }, [
    activeWorkspaceName,
    hasInitializedRef,
    isAuthenticated,
    isMetaAuthenticated,
    loadOnboardingStatus,
    queueMessages,
    queuePlatformPrompt,
    selectedAccountId,
    sessionId,
    setHeaderTitle,
    startBronzeAndSilverFlow
  ])
}
