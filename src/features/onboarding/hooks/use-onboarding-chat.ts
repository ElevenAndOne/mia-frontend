import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { useOnboarding } from '../onboarding-context'
import type { BronzeFact } from '../onboarding-context'
import { useOnboardingStreaming } from '../use-onboarding-streaming'
import type { ExplainerType } from '../onboarding-chat-types'
import {
  WELCOME_MESSAGES,
  buildBronzeNoReachMessages,
  buildBronzeReachMessages,
  buildClickMessages,
  buildCombinedFallbackMessages,
  buildConnectErrorMessages,
  buildConnectRetryMessages,
  buildExplainerMessages,
  buildInsightFallbackChoices,
  buildInsightLoadingMessages,
  buildNoBronzeMessages,
  buildNoClickMessages,
  buildPlatformLinkedMessages,
  buildSkipMessages,
  buildStreamCompleteMessages,
  getChoiceLabel
} from '../onboarding-chat-messages'
import { useMessageQueue } from './use-message-queue'

interface UseOnboardingChatArgs {
  onComplete: () => void
  onConnectPlatform: (platformId: string) => void
}

interface OnboardingChatState {
  displayedMessages: ReturnType<typeof useMessageQueue>['displayedMessages']
  isTyping: boolean
  isStreaming: boolean
  currentProgress: number
  showMetaSelector: boolean
  showGoogleSelector: boolean
  setShowMetaSelector: (open: boolean) => void
  setShowGoogleSelector: (open: boolean) => void
  handleChoice: (action: string) => void
  handleGoToIntegrations: () => void
  handleMetaAccountLinked: () => void
  handleGoogleAccountLinked: () => void
  selectedAccountName?: string
}

export const useOnboardingChat = ({ onComplete, onConnectPlatform }: UseOnboardingChatArgs): OnboardingChatState => {
  const { selectedAccount, sessionId, login, loginMeta, refreshAccounts } = useSession()
  const {
    platformsConnected,
    fetchBronzeHighlight,
    fetchBronzeFollowup,
    advanceStep,
    completeOnboarding,
    skipOnboarding,
    loadOnboardingStatus
  } = useOnboarding()

  const {
    streamedText,
    isStreaming,
    isComplete: streamComplete,
    startStreaming,
    reset: resetStreaming
  } = useOnboardingStreaming()

  const { displayedMessages, isTyping, queueMessages, addImmediateMessage } = useMessageQueue()

  const [currentProgress, setCurrentProgress] = useState(1)
  const [showMetaSelector, setShowMetaSelector] = useState(false)
  const [showGoogleSelector, setShowGoogleSelector] = useState(false)
  const [isStreamingInsight, setIsStreamingInsight] = useState(false)
  const [isStreamingCombined, setIsStreamingCombined] = useState(false)
  const [initialBronzeFact, setInitialBronzeFact] = useState<BronzeFact | null>(null)

  const hasInitialized = useRef(false)

  const showExplainerBoxes = useCallback(() => {
    setCurrentProgress(2)
    queueMessages(buildExplainerMessages())
  }, [queueMessages])

  const handleSkipToExplainers = useCallback(() => {
    queueMessages([{ type: 'mia', content: 'No problem! Let me show you what I can help with:' }])
    window.setTimeout(() => showExplainerBoxes(), 500)
  }, [queueMessages, showExplainerBoxes])

  const handleShowClicks = useCallback(async () => {
    const followupFact = await fetchBronzeFollowup()
    queueMessages(followupFact ? buildClickMessages(followupFact, initialBronzeFact) : buildNoClickMessages())
    window.setTimeout(() => showExplainerBoxes(), 500)
  }, [fetchBronzeFollowup, initialBronzeFact, queueMessages, showExplainerBoxes])

  const handleInsightChoice = useCallback(
    async (type: ExplainerType) => {
      setCurrentProgress(3)
      queueMessages(buildInsightLoadingMessages(type))

      await new Promise((resolve) => setTimeout(resolve, 1500))

      if (sessionId) {
        setIsStreamingInsight(true)
        setIsStreamingCombined(false)
        startStreaming(sessionId, platformsConnected)
      } else {
        queueMessages([
          { type: 'mia', content: "I'm still analyzing your data. You can check the Grow page for detailed insights." }
        ])

        window.setTimeout(() => {
          queueMessages(buildInsightFallbackChoices(platformsConnected))
        }, 1000)
      }
    },
    [platformsConnected, queueMessages, sessionId, startStreaming]
  )

  const handleConnectMeta = useCallback(async () => {
    try {
      const success = await loginMeta()
      if (success) {
        setShowMetaSelector(true)
      } else {
        queueMessages(buildConnectRetryMessages('meta'))
      }
    } catch (error) {
      console.error('Meta OAuth error:', error)
      queueMessages(buildConnectErrorMessages('meta'))
    }
  }, [loginMeta, queueMessages])

  const handleConnectGoogle = useCallback(async () => {
    try {
      const success = await login()
      if (success) {
        setShowGoogleSelector(true)
      } else {
        queueMessages(buildConnectRetryMessages('google'))
      }
    } catch (error) {
      console.error('Google OAuth error:', error)
      queueMessages(buildConnectErrorMessages('google'))
    }
  }, [login, queueMessages])

  const handleMetaAccountLinked = useCallback(async () => {
    setShowMetaSelector(false)
    await refreshAccounts()
    await loadOnboardingStatus()
    setCurrentProgress(4)

    queueMessages(buildPlatformLinkedMessages('Meta'))
    await new Promise((resolve) => setTimeout(resolve, 1500))

    if (sessionId) {
      setIsStreamingInsight(false)
      setIsStreamingCombined(true)
      // FEB 2026 FIX: Build combined platforms dynamically instead of hardcoding
      // Meta was just connected, combine with existing platforms
      const combinedPlatforms = [...new Set([...platformsConnected, 'meta_ads'])]
      startStreaming(sessionId, combinedPlatforms)
    } else {
      queueMessages(buildCombinedFallbackMessages())
    }
  }, [loadOnboardingStatus, platformsConnected, queueMessages, refreshAccounts, sessionId, startStreaming])

  const handleGoogleAccountLinked = useCallback(async () => {
    setShowGoogleSelector(false)
    await refreshAccounts()
    await loadOnboardingStatus()
    setCurrentProgress(4)

    queueMessages(buildPlatformLinkedMessages('Google Ads'))
    await new Promise((resolve) => setTimeout(resolve, 1500))

    if (sessionId) {
      setIsStreamingInsight(false)
      setIsStreamingCombined(true)
      // FEB 2026 FIX: Build combined platforms dynamically instead of hardcoding
      // Google was just connected, combine with existing platforms
      const combinedPlatforms = [...new Set([...platformsConnected, 'google_ads'])]
      startStreaming(sessionId, combinedPlatforms)
    } else {
      queueMessages(buildCombinedFallbackMessages())
    }
  }, [loadOnboardingStatus, platformsConnected, queueMessages, refreshAccounts, sessionId, startStreaming])

  const handleSkip = useCallback(async () => {
    await skipOnboarding()
    queueMessages(buildSkipMessages())
  }, [queueMessages, skipOnboarding])

  const handleFinish = useCallback(async () => {
    await completeOnboarding()
    onComplete()
  }, [completeOnboarding, onComplete])

  const handleGoToIntegrations = useCallback(async () => {
    await skipOnboarding()
    onConnectPlatform('integrations')
  }, [onConnectPlatform, skipOnboarding])

  const handleChoice = useCallback(
    async (action: string) => {
      addImmediateMessage({ type: 'user', content: getChoiceLabel(action) })

      switch (action) {
        case 'show_clicks':
          await handleShowClicks()
          break
        case 'skip_clicks':
          handleSkipToExplainers()
          break
        case 'show_explainers':
        case 'continue_anyway':
          showExplainerBoxes()
          break
        case 'grow':
        case 'optimize':
        case 'protect':
          await handleInsightChoice(action)
          break
        case 'connect_meta':
          await handleConnectMeta()
          break
        case 'connect_google':
          await handleConnectGoogle()
          break
        case 'skip_connect':
        case 'skip':
          await handleSkip()
          break
        case 'finish':
          await handleFinish()
          break
        case 'go_integrations':
          await handleGoToIntegrations()
          break
        default:
          break
      }
    },
    [
      addImmediateMessage,
      handleConnectGoogle,
      handleConnectMeta,
      handleFinish,
      handleGoToIntegrations,
      handleInsightChoice,
      handleShowClicks,
      handleSkip,
      handleSkipToExplainers,
      showExplainerBoxes
    ]
  )

  const initializeChat = useCallback(async () => {
    await loadOnboardingStatus()
    queueMessages(WELCOME_MESSAGES)

    const bronzeFact = await fetchBronzeHighlight()

    if (bronzeFact) {
      setInitialBronzeFact(bronzeFact)
      const reachValue = bronzeFact.metric_value ?? 0

      queueMessages(reachValue === 0 ? buildBronzeNoReachMessages(bronzeFact) : buildBronzeReachMessages(bronzeFact))
    } else {
      queueMessages(buildNoBronzeMessages())
    }

    await advanceStep()
  }, [advanceStep, fetchBronzeHighlight, loadOnboardingStatus, queueMessages])

  useEffect(() => {
    if (!hasInitialized.current && selectedAccount) {
      hasInitialized.current = true
      void initializeChat()
    }
  }, [initializeChat, selectedAccount])

  useEffect(() => {
    if (!streamComplete || (!isStreamingInsight && !isStreamingCombined)) return

    const finalizeStream = async () => {
      if (streamedText) {
        addImmediateMessage({ type: 'mia', content: streamedText })
      }

      const wasCombined = isStreamingCombined

      setIsStreamingInsight(false)
      setIsStreamingCombined(false)
      resetStreaming()
      await advanceStep()

      queueMessages(buildStreamCompleteMessages(wasCombined, platformsConnected))
    }

    void finalizeStream()
  }, [
    addImmediateMessage,
    advanceStep,
    isStreamingCombined,
    isStreamingInsight,
    platformsConnected,
    queueMessages,
    resetStreaming,
    streamComplete,
    streamedText
  ])

  return {
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
    selectedAccountName: selectedAccount?.name
  }
}
