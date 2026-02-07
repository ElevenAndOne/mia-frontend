import { useCallback, useRef, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { useOnboarding } from '../onboarding-context'
import { useOnboardingStreaming } from '../use-onboarding-streaming'
import type { ExplainerType } from '../onboarding-chat-types'
import { useMessageQueue } from './use-message-queue'
import { useOnboardingStreamCompletion } from './use-onboarding-stream-completion'
import { useOnboardingInitialization } from './use-onboarding-initialization'
import { useOnboardingSessionError } from './use-onboarding-session-error'
import {
  buildBronzeMessages,
  buildPrimaryConnectPrompt,
  buildSilverLoadingMessage,
  buildSilverPromptMessages,
  buildWorkspacePrompt,
  getPrimaryProvider
} from '../utils/onboarding-inline-messages'
type Provider = 'google' | 'meta'
interface UseInlineOnboardingChatArgs { onComplete: () => void }
export const useInlineOnboardingChat = ({ onComplete }: UseInlineOnboardingChatArgs) => {
  const {
    selectedAccount,
    sessionId,
    login,
    loginMeta,
    refreshAccounts,
    createWorkspace,
    activeWorkspace,
    isAuthenticated,
    isMetaAuthenticated,
    error: sessionError
  } = useSession()
  const { platformsConnected, fetchBronzeHighlight, loadOnboardingStatus, completeOnboarding, skipOnboarding } = useOnboarding()
  const { displayedMessages, isTyping, queueMessages, addImmediateMessage } = useMessageQueue()
  const { streamedText, isStreaming, isComplete, startStreaming, reset } = useOnboardingStreaming()
  const [showPrimarySelector, setShowPrimarySelector] = useState(false)
  const [showMetaSelector, setShowMetaSelector] = useState(false)
  const [showGoogleSelector, setShowGoogleSelector] = useState(false)
  const [primarySelectorProvider, setPrimarySelectorProvider] = useState<Provider>('google')
  const [primaryProvider, setPrimaryProvider] = useState<Provider>('google')
  const [currentProgress, setCurrentProgress] = useState(1)
  const [headerTitle, setHeaderTitle] = useState('Welcome')
  const [isWorkspaceSubmitting, setIsWorkspaceSubmitting] = useState(false)
  const [isStreamingInsight, setIsStreamingInsight] = useState(false)
  const [isStreamingCombined, setIsStreamingCombined] = useState(false)
  const hasInitialized = useRef(false)
  const queuePlatformPrompt = useCallback((provider: Provider) => {
    setPrimaryProvider(provider)
    setHeaderTitle('Connect Platform')
    setCurrentProgress(2)
    queueMessages(buildPrimaryConnectPrompt(provider))
  }, [queueMessages])
  const startBronzeAndSilverFlow = useCallback(async () => {
    setHeaderTitle('Quick Insights')
    setCurrentProgress(3)
    queueMessages([{ type: 'mia', content: 'Fetching your first insights...' }])
    const bronzeFact = await fetchBronzeHighlight()
    queueMessages(buildBronzeMessages(bronzeFact))
    queueMessages(buildSilverPromptMessages())
  }, [fetchBronzeHighlight, queueMessages])
  useOnboardingInitialization({
    sessionId,
    hasInitializedRef: hasInitialized,
    activeWorkspaceName: activeWorkspace?.name,
    selectedAccountId: selectedAccount?.id,
    isAuthenticated,
    isMetaAuthenticated,
    loadOnboardingStatus,
    queueMessages,
    setHeaderTitle,
    queuePlatformPrompt,
    startBronzeAndSilverFlow
  })
  useOnboardingSessionError({
    sessionError,
    hasSelectedAccount: Boolean(selectedAccount?.id),
    queueMessages
  })
  const handleWorkspaceSubmit = useCallback(async (value: string) => {
    setIsWorkspaceSubmitting(true)
    addImmediateMessage({ type: 'user', content: value })
    const workspace = await createWorkspace(value)
    setIsWorkspaceSubmitting(false)
    if (!workspace) {
      queueMessages([{ type: 'mia', content: 'I could not create this workspace yet. Please try again.' }, ...buildWorkspacePrompt()])
      return
    }
    queueMessages([{ type: 'mia', content: `Great, ${workspace.name} is ready.` }])
    queuePlatformPrompt(getPrimaryProvider(isAuthenticated, isMetaAuthenticated))
  }, [addImmediateMessage, createWorkspace, isAuthenticated, isMetaAuthenticated, queueMessages, queuePlatformPrompt])
  const handlePrimaryConnect = useCallback(async (provider: Provider) => {
    addImmediateMessage({ type: 'user', content: `Connect ${provider === 'google' ? 'Google Ads' : 'Meta Ads'}` })
    queueMessages([{ type: 'mia', content: `Connecting ${provider === 'google' ? 'Google Ads' : 'Meta Ads'}...` }])
    const success = provider === 'google' ? await login() : await loginMeta()
    if (!success) return
    setPrimarySelectorProvider(provider)
    setShowPrimarySelector(true)
  }, [addImmediateMessage, login, loginMeta, queueMessages])
  const handlePrimaryAccountSelected = useCallback(async () => {
    setShowPrimarySelector(false)
    await refreshAccounts()
    await loadOnboardingStatus()
    await startBronzeAndSilverFlow()
  }, [loadOnboardingStatus, refreshAccounts, startBronzeAndSilverFlow])

  const handleInsightChoice = useCallback(async (type: ExplainerType) => {
    addImmediateMessage({ type: 'user', content: type.charAt(0).toUpperCase() + type.slice(1) })
    setHeaderTitle('Actionable Insights')
    queueMessages(buildSilverLoadingMessage(type))
    if (sessionId) {
      setIsStreamingInsight(true)
      startStreaming(sessionId, platformsConnected)
    }
  }, [addImmediateMessage, platformsConnected, queueMessages, sessionId, startStreaming])

  const handleFinish = useCallback(async () => {
    await completeOnboarding()
    onComplete()
  }, [completeOnboarding, onComplete])

  const handleSkipOnboarding = useCallback(async () => {
    await skipOnboarding()
    onComplete()
  }, [onComplete, skipOnboarding])

  const handleChoice = useCallback(async (action: string) => {
    if (action === 'connect_primary_google') return handlePrimaryConnect('google')
    if (action === 'connect_primary_meta') return handlePrimaryConnect('meta')
    if (action === 'grow' || action === 'optimize' || action === 'protect') return handleInsightChoice(action)
    if (action === 'connect_meta') {
      const success = await loginMeta()
      if (success) setShowMetaSelector(true); return
    }
    if (action === 'connect_google') {
      const success = await login()
      if (success) setShowGoogleSelector(true); return
    }
    if (action === 'finish') return handleFinish()
    if (action === 'skip') return handleSkipOnboarding()
  }, [handleFinish, handleInsightChoice, handlePrimaryConnect, handleSkipOnboarding, login, loginMeta])

  const handleLinkedPlatform = useCallback(async (platformId: 'google_ads' | 'meta_ads') => {
    if (platformId === 'meta_ads') {
      setShowMetaSelector(false)
    } else {
      setShowGoogleSelector(false)
    }
    await refreshAccounts()
    await loadOnboardingStatus()
    setIsStreamingInsight(false)
    setIsStreamingCombined(true)
    if (sessionId) {
      startStreaming(sessionId, [...new Set([...platformsConnected, platformId])])
    }
  }, [loadOnboardingStatus, platformsConnected, refreshAccounts, sessionId, startStreaming])

  useOnboardingStreamCompletion({
    isComplete,
    streamedText,
    isStreamingInsight,
    isStreamingCombined,
    primaryProvider,
    addImmediateMessage,
    queueMessages,
    onCombinedComplete: () => {
      setHeaderTitle('Ready')
      setCurrentProgress(4)
    },
    onDone: () => {
      setIsStreamingInsight(false)
      setIsStreamingCombined(false)
      reset()
    }
  })

  return {
    displayedMessages,
    isTyping,
    isStreaming,
    currentProgress,
    headerTitle,
    showMetaSelector,
    showGoogleSelector,
    showPrimarySelector,
    primarySelectorProvider,
    isWorkspaceSubmitting,
    setShowMetaSelector,
    setShowGoogleSelector,
    setShowPrimarySelector,
    handleChoice,
    handleWorkspaceSubmit,
    handleMetaAccountLinked: () => handleLinkedPlatform('meta_ads'),
    handleGoogleAccountLinked: () => handleLinkedPlatform('google_ads'),
    handlePrimaryAccountSelected,
    handleSkipOnboarding,
    selectedAccountName: selectedAccount?.name
  }
}
