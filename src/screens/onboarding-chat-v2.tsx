/**
 * OnboardingChatV2 - Redesigned Mia-guided onboarding chat
 *
 * Key changes from V1:
 * - Bottom-up layout (flex-col-reverse) - new messages appear at bottom
 * - Message queue system - no SSE streaming
 * - Typing dots animation between messages
 * - New Bronze card styling (large numbers, platform colors)
 * - Grow/Optimise/Protect explainer boxes
 * - Styled insights output card
 * - Casual tone with emojis
 */

import React, { useState, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useSession } from '../contexts/session-context-shim'
import { useOnboarding, BronzeFact } from '../contexts/onboarding-context'
import { useOnboardingStreaming } from '../features/onboarding/hooks/use-onboarding-streaming'
import MetaAccountSelector from '../features/integrations/components/meta-account-selector'
import GoogleAccountLinkSelector from '../features/integrations/components/google-account-link-selector'
import { useMessageQueue, usePlatformConnection, useOnboardingFlow } from '../features/onboarding/hooks'
import { TypingIndicator, MessageBubble, ProgressDots } from '../features/onboarding/components'

interface OnboardingChatV2Props {
  onComplete: () => void
  onSkip: () => void
  onConnectPlatform: (platformId: string) => void
}

// All UI components and types are now imported from feature modules

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const OnboardingChatV2: React.FC<OnboardingChatV2Props> = ({
  onComplete,
  onConnectPlatform,
}) => {
  const { selectedAccount, sessionId, login, loginMeta, refreshAccounts } = useSession()
  const {
    platformsConnected,
    fetchBronzeHighlight,
    fetchBronzeFollowup,
    advanceStep,
    completeOnboarding,
    skipOnboarding,
    loadOnboardingStatus,
  } = useOnboarding()

  // Streaming hook for real insights from backend
  const {
    streamedText,
    isStreaming,
    isComplete: streamComplete,
    startStreaming,
    reset: resetStreaming
  } = useOnboardingStreaming()

  // Message queue hook
  const {
    messages: displayedMessages,
    isTyping,
    currentStep: currentProgress,
    enqueueMessages: queueMessages,
    addImmediateMessage,
    setCurrentStep: setCurrentProgress
  } = useMessageQueue()

  // Platform connection hook
  const {
    showMetaSelector,
    showGoogleSelector,
    openMetaSelector,
    openGoogleSelector,
    closeMetaSelector,
    closeGoogleSelector
  } = usePlatformConnection()

  // Streaming state
  const [isStreamingInsight, setIsStreamingInsight] = useState(false)
  const [isStreamingCombined, setIsStreamingCombined] = useState(false)
  const [, setSelectedInsightType] = useState<'grow' | 'optimise' | 'protect'>('grow')
  const [initialBronzeFact, setInitialBronzeFact] = useState<BronzeFact | null>(null)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Onboarding flow hook - handles initialization and streaming completion
  useOnboardingFlow({
    selectedAccount,
    streamComplete,
    streamedText,
    isStreamingInsight,
    isStreamingCombined,
    platformsConnected,
    fetchBronzeHighlight,
    loadOnboardingStatus,
    advanceStep,
    resetStreaming,
    queueMessages,
    addImmediateMessage,
    setIsStreamingInsight,
    setIsStreamingCombined,
    setInitialBronzeFact,
  })

  // Debug: Log component mount/unmount
  useEffect(() => {
    console.log('[ONBOARDING] Component MOUNTED')
    return () => {
      console.log('[ONBOARDING] Component UNMOUNTED')
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayedMessages, isTyping])

  // Handle user choices
  const handleChoice = async (action: string) => {
    // Map action to user-friendly label
    const choiceLabels: Record<string, string> = {
      show_clicks: "Yes, show me!",
      skip_clicks: "Later",
      show_explainers: "Yes!",
      skip: "Skip",
      grow: "Grow",
      optimise: "Optimise",
      protect: "Protect",
      connect_meta: "Connect Meta",
      connect_google: "Connect Google Ads",
      skip_connect: "Skip for now",
      finish: "Let's go!",
      go_integrations: "Manage Integrations",
      continue_anyway: "Continue anyway",
    }

    // Add user message
    addImmediateMessage({ type: 'user', content: choiceLabels[action] || action })

    switch (action) {
      case 'show_clicks':
        await handleShowClicks()
        break
      case 'skip_clicks':
        await handleSkipToExplainers()
        break
      case 'show_explainers':
      case 'continue_anyway':
        await showExplainerBoxes()
        break
      case 'grow':
      case 'optimise':
      case 'protect':
        await handleInsightChoice(action as 'grow' | 'optimise' | 'protect')
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
        // Skip onboarding and go to integrations
        await skipOnboarding()
        onConnectPlatform('integrations')
        break
    }
  }

  // Show clicks Bronze card
  const handleShowClicks = async () => {
    // Fetch follow-up Bronze fact (clicks/CTR)
    const followupFact = await fetchBronzeFollowup()

    if (followupFact) {
      // Build dynamic reaction message based on actual metric values
      const clickValue = followupFact.metric_value || 0
      const reachValue = initialBronzeFact?.metric_value || 0
      const formattedClicks = clickValue.toLocaleString()
      const formattedReach = reachValue.toLocaleString()

      // Extract CTR from the followup fact's detail field (e.g., "With 2.03% click-through rate")
      // This is the actual CTR calculated from clicks/impressions, not clicks/reach
      const ctrMatch = followupFact.detail?.match(/(\d+\.?\d*)%/)
      const actualCTR = ctrMatch ? ctrMatch[1] : null

      let reactionMessage = ""
      let followupMessage = ""

      if (clickValue === 0) {
        reactionMessage = "Hmm, looks like there weren't many clicks in this period."
        followupMessage = "No worries though - I can help you figure out how to change that! 🤔"
      } else if (clickValue < 100) {
        reactionMessage = `${formattedClicks} clicks - let's see how we can boost that!`
        followupMessage = actualCTR
          ? `That's a ${actualCTR}% click-through rate. I can help you improve it! 🤔`
          : "I can help you improve those numbers! 🤔"
      } else if (clickValue < 1000) {
        reactionMessage = `Nice! ${formattedClicks} clicks from ${formattedReach} reach.`
        followupMessage = actualCTR
          ? `That's a ${actualCTR}% click-through rate - solid foundation to build on! 🤔`
          : "Solid foundation to build on! 🤔"
      } else {
        reactionMessage = `🔥 ${formattedClicks} clicks! That's impressive engagement.`
        followupMessage = actualCTR
          ? `With a ${actualCTR}% CTR, you're doing great. But what's next? 🤔`
          : `From ${formattedReach} reach, that's great performance. But what's next? 🤔`
      }

      queueMessages([
        { type: 'bronze-card', bronzeFact: followupFact },
        { type: 'mia', content: reactionMessage },
        { type: 'mia', content: followupMessage },
        {
          type: 'mia',
          content: "Don't stress, I got you. I specialise in taking your stats and comparing them against each other. We can look into three areas:"
        },
      ])
    } else {
      // No followup data available
      queueMessages([
        { type: 'mia', content: "I couldn't find click data for this period. Let me show you what else I can help with:" },
      ])
    }

    // Show explainer boxes after a brief pause
    setTimeout(() => showExplainerBoxes(), 500)
  }

  const handleSkipToExplainers = async () => {
    queueMessages([
      { type: 'mia', content: "No problem! Let me show you what I can help with:" },
    ])
    setTimeout(() => showExplainerBoxes(), 500)
  }

  // Show the three explainer boxes
  const showExplainerBoxes = async () => {
    setCurrentProgress(2)

    queueMessages([
      { type: 'explainer-box', explainerType: 'grow' },
      { type: 'explainer-box', explainerType: 'optimise' },
      { type: 'explainer-box', explainerType: 'protect' },
      { type: 'mia', content: "We're going to explore one of these but don't worry, you can always explore the others later." },
      {
        type: 'mia',
        content: "Which would you like to look at first?",
        choices: [
          { label: "Grow", action: "grow", variant: 'secondary' },
          { label: "Optimise", action: "optimise", variant: 'secondary' },
          { label: "Protect", action: "protect", variant: 'secondary' }
        ]
      }
    ])
  }

  // Handle insight type selection - uses real streaming from backend
  const handleInsightChoice = async (type: 'grow' | 'optimise' | 'protect') => {
    setCurrentProgress(3)
    setSelectedInsightType(type)

    queueMessages([
      { type: 'mia', content: "Cool! I'm doing my magic and analysing your info." },
    ])

    // Brief delay for UX, then start streaming real insights
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Start streaming real insights from backend
    if (sessionId) {
      setIsStreamingInsight(true)
      setIsStreamingCombined(false)
      startStreaming(sessionId, platformsConnected)
      // The streaming completion handler (useEffect) will handle the rest
    } else {
      // Fallback if no session - show static message
      queueMessages([
        { type: 'mia', content: "I'm still analyzing your data. You can check the Grow page for detailed insights." },
      ])

      // Prompt for second platform
      const hasMetaConnected = platformsConnected.includes('meta') ||
                               platformsConnected.includes('meta_ads') ||
                               platformsConnected.includes('facebook')
      const hasGoogleConnected = platformsConnected.includes('google_ads')

      const connectAction = hasMetaConnected && !hasGoogleConnected ? 'connect_google' : 'connect_meta'
      const connectLabel = hasMetaConnected && !hasGoogleConnected ? 'Connect Google Ads' : 'Connect Meta'

      setTimeout(() => {
        queueMessages([
          {
            type: 'choice-buttons',
            choices: [
              { label: connectLabel, action: connectAction, variant: 'primary' },
              { label: "Skip for now", action: "skip_connect", variant: 'secondary' }
            ]
          }
        ])
      }, 1000)
    }
  }

  // Connect Meta
  const handleConnectMeta = async () => {
    try {
      const success = await loginMeta()
      if (success) {
        openMetaSelector()
      } else {
        queueMessages([
          { type: 'mia', content: "Meta connection was cancelled. Would you like to try again?" },
          {
            type: 'choice-buttons',
            choices: [
              { label: "Try again", action: "connect_meta", variant: 'primary' },
              { label: "Skip for now", action: "skip_connect", variant: 'secondary' }
            ]
          }
        ])
      }
    } catch (error) {
      console.error('Meta OAuth error:', error)
      queueMessages([
        { type: 'mia', content: "There was an issue connecting to Meta. Would you like to try again?" },
        {
          type: 'choice-buttons',
          choices: [
            { label: "Try again", action: "connect_meta", variant: 'primary' },
            { label: "Skip for now", action: "skip_connect", variant: 'secondary' }
          ]
        }
      ])
    }
  }

  // Connect Google (for Meta-first users)
  const handleConnectGoogle = async () => {
    console.log('[ONBOARDING] handleConnectGoogle called')
    try {
      console.log('[ONBOARDING] Calling login()...')
      const success = await login()
      console.log('[ONBOARDING] login() returned:', success)
      if (success) {
        console.log('[ONBOARDING] Setting showGoogleSelector to true')
        openGoogleSelector()
      } else {
        queueMessages([
          { type: 'mia', content: "Google connection was cancelled. Would you like to try again?" },
          {
            type: 'choice-buttons',
            choices: [
              { label: "Try again", action: "connect_google", variant: 'primary' },
              { label: "Skip for now", action: "skip_connect", variant: 'secondary' }
            ]
          }
        ])
      }
    } catch (error) {
      console.error('Google OAuth error:', error)
    }
  }

  // Handle Meta account linked - shows combined insights before completion
  const handleMetaAccountLinked = async () => {
    closeMetaSelector()
    await refreshAccounts()
    await loadOnboardingStatus()
    setCurrentProgress(4)

    queueMessages([
      { type: 'mia', content: "Perfect - Meta is now connected!" },
      { type: 'mia', content: "I'm now analyzing both platforms together..." },
    ])

    // Brief delay then start combined insights streaming
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (sessionId) {
      setIsStreamingInsight(false)
      setIsStreamingCombined(true)
      startStreaming(sessionId, ['google_ads', 'meta_ads'])
      // The streaming completion handler will show the "Let's go!" button
    } else {
      // Fallback if no session
      queueMessages([
        { type: 'mia', content: "You're all set with cross-platform insights!" },
        {
          type: 'choice-buttons',
          choices: [
            { label: "Let's go!", action: "finish", variant: 'primary' }
          ]
        }
      ])
    }
  }

  // Handle Google account linked (for Meta-first users) - shows combined insights before completion
  const handleGoogleAccountLinked = async () => {
    closeGoogleSelector()
    await refreshAccounts()
    await loadOnboardingStatus()
    setCurrentProgress(4)

    queueMessages([
      { type: 'mia', content: "Perfect - Google Ads is now connected!" },
      { type: 'mia', content: "I'm now analyzing both platforms together..." },
    ])

    // Brief delay then start combined insights streaming
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (sessionId) {
      setIsStreamingInsight(false)
      setIsStreamingCombined(true)
      startStreaming(sessionId, ['google_ads', 'meta_ads'])
      // The streaming completion handler will show the "Let's go!" button
    } else {
      // Fallback if no session
      queueMessages([
        { type: 'mia', content: "You're all set with cross-platform insights!" },
        {
          type: 'choice-buttons',
          choices: [
            { label: "Let's go!", action: "finish", variant: 'primary' }
          ]
        }
      ])
    }
  }

  // Skip connecting second platform
  const handleSkip = async () => {
    await skipOnboarding()

    queueMessages([
      { type: 'mia', content: "No problem! You can connect more platforms anytime from Settings." },
      { type: 'mia', content: "For now, let's explore what I can show you with your current data." },
      {
        type: 'choice-buttons',
        choices: [
          { label: "Let's go!", action: "finish", variant: 'primary' }
        ]
      }
    ])
  }

  // Finish onboarding
  const handleFinish = async () => {
    await completeOnboarding()
    onComplete()
  }

  // Handle going to integrations from header
  const handleGoToIntegrations = async () => {
    await skipOnboarding()
    onConnectPlatform('integrations')
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with progress dots and settings button */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <ProgressDots current={currentProgress} total={4} />
        {/* Settings/Integrations button - always visible */}
        <button
          onClick={handleGoToIntegrations}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          title="Manage Integrations"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Messages area - auto-scroll to bottom */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex flex-col gap-3 min-h-full justify-end">
          <AnimatePresence>
            {displayedMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onChoiceSelect={handleChoice}
              />
            ))}
          </AnimatePresence>

          {/* Typing indicator (at bottom when visible) - shows during message queue AND streaming */}
          <AnimatePresence>
            {(isTyping || isStreaming) && <TypingIndicator />}
          </AnimatePresence>

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Meta Account Selector Modal */}
      <MetaAccountSelector
        isOpen={showMetaSelector}
        onClose={closeMetaSelector}
        onSuccess={handleMetaAccountLinked}
        currentGoogleAccountName={selectedAccount?.name}
      />

      {/* Google Account Link Selector Modal */}
      <GoogleAccountLinkSelector
        isOpen={showGoogleSelector}
        onClose={closeGoogleSelector}
        onSuccess={handleGoogleAccountLinked}
      />
    </div>
  )
}

export default OnboardingChatV2
