/**
 * Onboarding Chat - Mia-guided chat experience for new users
 *
 * Flow (per CTO document):
 * 1. Welcome + Bronze fact from first platform
 * 2. Binary choice: "Yes, show me" / "Later"
 * 3. Follow-up Bronze fact + Grow insights loading in background
 * 4. Prompt to connect second platform
 * 5. Second Bronze fact after connection
 * 6. Intelligence Snapshot unlocked
 *
 * Features:
 * - Chat bubbles with Mia avatar
 * - Binary choice buttons
 * - Bronze fact cards
 * - Progress bar
 * - Micro-celebrations
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../contexts/SessionContext'
import { useOnboarding, BronzeFact, ONBOARDING_STEPS } from '../contexts/OnboardingContext'
import { useOnboardingStreaming } from '../hooks/useOnboardingStreaming'
import OnboardingProgressBar from './OnboardingProgressBar'
import BronzeFactCard from './BronzeFactCard'
import MicroCelebration from './MicroCelebration'
import MetaAccountSelector from './MetaAccountSelector'
import GoogleAccountLinkSelector from './GoogleAccountLinkSelector'
import TypingMessage from './TypingMessage'

interface OnboardingChatProps {
  onComplete: () => void
  onSkip: () => void
  onConnectPlatform: (platformId: string) => void
}

type MessageType = 'mia' | 'user' | 'bronze-fact' | 'loading' | 'platform-options'

interface ChatMessage {
  id: string
  type: MessageType
  content: string
  timestamp: Date
  choices?: { label: string; action: string }[]
  bronzeFact?: BronzeFact
  platforms?: any[]
}

const OnboardingChat: React.FC<OnboardingChatProps> = ({
  onComplete,
  onSkip,
  onConnectPlatform,
}) => {
  const { selectedAccount, sessionId, login, loginMeta, refreshAccounts } = useSession()
  const {
    step,
    platformsConnected,
    platformCount,
    fullAccess,
    fetchBronzeHighlight,
    fetchBronzeFollowup,
    checkGrowInsightsStatus,
    advanceStep,
    completeOnboarding,
    skipOnboarding,
    getAvailablePlatforms,
    growInsightsReady,
    loadOnboardingStatus,
    growTaskId,
    growInsightsSummary,
  } = useOnboarding()

  // Streaming hook for Grow summary
  const {
    streamedText,
    isStreaming,
    isComplete: streamComplete,
    error: streamError,
    startStreaming,
    reset: resetStreaming
  } = useOnboardingStreaming()

  // Track which messages have completed typing animation (to skip on re-render)
  // Defined early so we can populate it during message restoration
  const typedMessageIdsRef = useRef<Set<string>>(new Set())

  // Restore messages from localStorage if available (survives mobile OAuth redirects)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('mia_onboarding_messages')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Convert timestamp strings back to Date objects
        // Also mark ALL restored messages as already typed (skip animation)
        const restoredMessages = parsed.map((msg: any) => {
          typedMessageIdsRef.current.add(msg.id)  // Skip typing animation
          return {
            ...msg,
            timestamp: new Date(msg.timestamp)
          }
        })
        console.log('[ONBOARDING] Restored', restoredMessages.length, 'messages, marked as typed')
        return restoredMessages
      } catch (e) {
        console.error('[ONBOARDING] Failed to parse saved messages:', e)
        return []
      }
    }
    return []
  })
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationType, setCelebrationType] = useState<'success' | 'milestone' | 'complete'>('success')
  const [isTyping, setIsTyping] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Meta Account Selector modal state
  const [showMetaSelector, setShowMetaSelector] = useState(false)
  // Google Account Link Selector modal state (for Meta-first flow)
  const [showGoogleSelector, setShowGoogleSelector] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  // Track if we're streaming combined insights (after Meta linked) vs single platform
  const [isStreamingCombined, setIsStreamingCombined] = useState(false)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Persist messages to localStorage (survives mobile OAuth redirects)
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('mia_onboarding_messages', JSON.stringify(messages))
    }
  }, [messages])

  // Track if we're in Google link mobile redirect flow (use ref for synchronous check)
  const isGoogleLinkFlowRef = useRef(false)

  // Initialize onboarding chat (only once when account is selected)
  // Check for Google link flow SYNCHRONOUSLY before deciding to init
  const hasInitialized = useRef(false)
  useEffect(() => {
    // Check localStorage DIRECTLY here to avoid state timing issues
    const shouldShowGoogleSelector = localStorage.getItem('mia_show_google_selector')
    if (shouldShowGoogleSelector) {
      console.log('[ONBOARDING] Google link mobile redirect detected - showing selector, continuing existing chat')
      console.log('[ONBOARDING] Restored messages count:', messages.length)
      localStorage.removeItem('mia_show_google_selector')
      isGoogleLinkFlowRef.current = true
      hasInitialized.current = true  // Prevent future init
      setShowGoogleSelector(true)
      return  // Skip initializeChat - we have messages from before redirect
    }

    // Only initialize if we have NO messages (fresh start, not returning from redirect)
    if (!hasInitialized.current && messages.length === 0 && selectedAccount) {
      hasInitialized.current = true
      initializeChat()
    } else if (messages.length > 0) {
      // We have restored messages - mark as initialized
      hasInitialized.current = true
      console.log('[ONBOARDING] Restored', messages.length, 'messages from localStorage')
    }
  }, [selectedAccount, messages.length])

  // Cleanup polling interval on unmount (legacy, no longer used)
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // STATE 2 — Mia Begins Chat Onboarding (per CTO doc)
  const initializeChat = async () => {
    const accountName = selectedAccount?.name || 'your account'

    // IMPORTANT: Load onboarding status first to get growTaskId
    // The backend starts Grow insights on account select and stores task_id on session
    await loadOnboardingStatus()

    // Fetch Bronze fact first
    setIsTyping(true)
    const bronzeFact = await fetchBronzeHighlight()
    setIsTyping(false)

    if (bronzeFact) {
      // CTO doc STATE 2: Welcome + First Win
      await addMiaMessage(`Great — I've connected to ${accountName}.\nHere's something interesting already:`)
      await delay(300)
      addBronzeFactMessage(bronzeFact)

      // Micro celebration for first win
      setCelebrationType('success')
      setShowCelebration(true)

      await delay(1000)

      // CTO doc: "Want to see how many of those people actually clicked?"
      addMiaMessage(
        "Want to see how many of those people actually clicked?",
        [
          { label: "Yes, show me", action: "show_more" },
          { label: "Later", action: "skip_details" }
        ]
      )

      // Grow insights started by backend on account select - no need to poll
      // The streaming endpoint fetches fresh data when user clicks "Yes" to see insights

      await advanceStep()
    } else {
      // No Bronze data available - fallback
      await addMiaMessage(`Great — I've connected to ${accountName}.`)
      addMiaMessage(
        "I'm connecting to your data. Would you like to connect another platform for deeper insights?",
        [
          { label: "Yes, connect more", action: "connect_second" },
          { label: "Skip for now", action: "skip" }
        ]
      )
    }
  }

  const handleChoice = async (action: string) => {
    // Record user choice
    const choiceLabels: Record<string, string> = {
      'show_more': 'Yes, show me',
      'skip_details': 'Later',
      'connect_second': 'Connect another platform',
      'connect_meta_ads': 'Connect Meta',
      'connect_google_ads': 'Connect Google Ads',
      'skip': 'Skip for now',
      'show_snapshot': 'Show me my Intelligence Snapshot',
      'explore': 'Explore on my own',
      'wait_for_grow': 'Yes',
      'skip_grow': 'Later',
      'show_grow': 'Yes',
      'show_unlock_preview': 'Show me what this unlocks',
      'explore_grow': 'Explore Grow Insights',
      'explore_optimise': 'Explore Optimise Insights',
      'explore_protect': 'Explore Protect Insights',
      'connect_more': 'Connect more platforms',
      'weekly_reports': 'Receive weekly Intelligence Reports',
      'show_meta_followup': 'Yes',
      'show_google_followup': 'Yes',
      'finish_onboarding': 'Later',
    }

    addUserMessage(choiceLabels[action] || action)

    switch (action) {
      case 'show_more':
        await handleShowMore()
        break

      case 'skip_details':
        await handleSkipDetails()
        break

      case 'connect_second':
        await handleConnectSecond()
        break

      case 'skip':
        await handleSkip()
        break

      case 'show_snapshot':
        await handleShowSnapshot()
        break

      case 'explore':
        await handleExplore()
        break

      case 'wait_for_grow':
        await handleWaitForGrow()
        break

      case 'skip_grow':
        await handleSkipGrow()
        break

      case 'show_grow':
        await handleShowGrowInsights()
        break

      case 'show_unlock_preview':
        await handleShowUnlockPreview()
        break

      case 'explore_grow':
        await handleExploreGrow()
        break

      case 'explore_optimise':
        await handleExploreOptimise()
        break

      case 'explore_protect':
        await handleExploreProtect()
        break

      case 'connect_more':
        await handleConnectSecond()
        break

      case 'weekly_reports':
        await handleWeeklyReports()
        break

      case 'connect_meta_ads':
        await handleConnectMeta()
        break

      case 'connect_google_ads':
        await handleConnectGoogle()
        break

      case 'show_meta_followup':
        await handleShowMetaFollowup()
        break

      case 'show_google_followup':
        await handleShowGoogleFollowup()
        break

      case 'finish_onboarding':
        await handleOnboardingComplete()
        break

      default:
        // Check if it's a platform connection
        if (action.startsWith('connect_')) {
          const platformId = action.replace('connect_', '')
          onConnectPlatform(platformId)
        }
    }
  }

  // STATE 3 — Follow-Up Bronze Data (per CTO doc)
  const handleShowMore = async () => {
    setIsTyping(true)
    const followupFact = await fetchBronzeFollowup()
    setIsTyping(false)

    if (followupFact) {
      // Show Bronze #2 (clicks/CTR)
      addBronzeFactMessage(followupFact)

      // Micro-celebration per CTO doc
      setCelebrationType('success')
      setShowCelebration(true)

      await delay(500)
    }

    // CTO doc STATE 3: "While you look at this, I'm preparing your Grow Insights..."
    addMiaMessage(
      "While you look at this, I'm preparing your Grow Insights in the background.\nWant me to notify you as soon as they're ready?",
      [
        { label: "Yes", action: "wait_for_grow" },
        { label: "Later", action: "skip_grow" }
      ]
    )

    await advanceStep()
  }

  const handleSkipDetails = async () => {
    addMiaMessage(
      "No problem! Would you like to connect another platform to unlock cross-platform insights?",
      [
        { label: "Yes, connect more", action: "connect_second" },
        { label: "Skip for now", action: "skip" }
      ]
    )
  }

  const handleConnectSecond = async () => {
    setIsTyping(true)
    const platforms = await getAvailablePlatforms()
    setIsTyping(false)

    const unconnectedPlatforms = platforms.filter(p => !p.connected)

    if (unconnectedPlatforms.length === 0) {
      addMiaMessage("You've connected all available platforms! Let's explore your insights.")
      await handleOnboardingComplete()
      return
    }

    addMiaMessage("Here are the platforms you can connect:")

    // Show platform options
    addMessage({
      id: generateId(),
      type: 'platform-options',
      content: '',
      timestamp: new Date(),
      platforms: unconnectedPlatforms,
    })
  }

  const handleSkip = async () => {
    await skipOnboarding()

    addMiaMessage(
      "No problem! You can connect more platforms anytime from the Integrations page. For now, let's explore what I can show you with your current data.",
      [
        { label: "Show me around", action: "explore" }
      ]
    )
  }

  const handleShowSnapshot = async () => {
    localStorage.removeItem('mia_onboarding_messages')
    onComplete()
  }

  const handleExplore = async () => {
    localStorage.removeItem('mia_onboarding_messages')
    onComplete()
  }

  // STATE 4 — Grow Insights Ready (per CTO doc)
  // OPTIMIZED: Skip polling - background task pre-caches data, but streaming endpoint
  // fetches fresh data anyway. Just show a brief "preparing" state then proceed.
  const handleWaitForGrow = async () => {
    setIsTyping(true)

    // Brief delay to let background task cache data (if running)
    // The streaming endpoint will work regardless - this just improves UX
    await delay(2000)

    setIsTyping(false)
    setCelebrationType('milestone')
    setShowCelebration(true)

    // CTO doc STATE 4: "Your Grow Insights are ready..."
    addMiaMessage(
      "Your Grow Insights are ready —\nthey highlight the biggest opportunities in your data right now.\nWant to see them?",
      [
        { label: "Yes", action: "show_grow" },
        { label: "Later", action: "skip_grow" }
      ]
    )
  }

  const handleSkipGrow = async () => {
    // User chose "Later" - skip to second platform prompt
    await promptForSecondPlatform()
  }

  // STATE 5 — Show Grow Insights Summary (per CTO doc) - NOW WITH STREAMING
  const handleShowGrowInsights = async () => {
    // Claude's response already provides a natural intro ("Hey! Great job connecting...")
    // No need for additional hardcoded intro message - go straight to streaming

    // Create a placeholder message for streaming
    const streamMsgId = generateId()
    setStreamingMessageId(streamMsgId)

    // Start streaming the Grow summary
    if (sessionId) {
      startStreaming(sessionId, platformsConnected)
    } else {
      // Fallback if no session - use static summary
      if (growInsightsSummary) {
        addMiaMessage(growInsightsSummary)
      } else {
        addMiaMessage(
          "I'm still analyzing your data to find growth opportunities. You can check back on the Grow page for detailed insights."
        )
      }
      await delay(1500)
      await advanceStep()
      await promptForSecondPlatform()
    }
  }

  // Handle streaming completion - different flow for single vs combined
  useEffect(() => {
    console.log('[ONBOARDING] Stream useEffect - streamComplete:', streamComplete, 'streamingMessageId:', streamingMessageId)
    if (streamComplete && streamingMessageId) {
      console.log('[ONBOARDING] Stream completed! Processing...')
      const handleStreamComplete = async () => {
        // Add the streamed text as a permanent message
        // Pre-generate ID and mark as already typed (user saw it streaming live)
        if (streamedText) {
          const msgId = generateId()
          typedMessageIdsRef.current.add(msgId)  // Skip animation - user already saw streaming
          addMessage({
            id: msgId,
            type: 'mia',
            content: streamedText,
            timestamp: new Date(),
          })
        }

        const wasCombined = isStreamingCombined
        setStreamingMessageId(null)
        setIsStreamingCombined(false)
        resetStreaming()

        // Continue the flow based on phase - properly await async calls
        await advanceStep()
        if (wasCombined) {
          // After combined streaming (Meta linked), go to completion
          await handleOnboardingComplete()
        } else {
          // After single-platform streaming (Google only), prompt for second platform
          await promptForSecondPlatform()
        }
      }
      handleStreamComplete()
    }
  }, [streamComplete, streamingMessageId])

  // STATE 6.1 — Meta OAuth (INLINE) per CTO doc
  // Opens OAuth popup, then MetaAccountSelector - NO navigation away
  const handleConnectMeta = async () => {
    try {
      // First, trigger Meta OAuth popup
      const success = await loginMeta()
      if (success) {
        // OAuth successful - open account selector modal
        setShowMetaSelector(true)
      } else {
        addMiaMessage(
          "Meta connection was cancelled. Would you like to try again or connect a different platform?",
          [
            { label: "Try Meta again", action: "connect_meta_ads" },
            { label: "Connect another platform", action: "connect_second" },
            { label: "Skip for now", action: "skip" }
          ]
        )
      }
    } catch (error) {
      console.error('Meta OAuth error:', error)
      addMiaMessage(
        "There was an issue connecting to Meta. Would you like to try again?",
        [
          { label: "Try again", action: "connect_meta_ads" },
          { label: "Skip for now", action: "skip" }
        ]
      )
    }
  }

  // Helper to detect mobile
  const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  // STATE 6.1-ALT — Google OAuth for Meta-first users (INLINE)
  // Opens Google OAuth popup - for users who started with Meta and want to add Google
  const handleConnectGoogle = async () => {
    console.log('[ONBOARDING] handleConnectGoogle called - starting Google OAuth')
    try {
      // For mobile: Store flag so we know to show Google selector after OAuth redirect
      if (isMobile()) {
        console.log('[ONBOARDING] Mobile detected - storing pending Google link flag')
        localStorage.setItem('mia_onboarding_google_link_pending', 'true')
      }

      // Trigger Google OAuth popup (or redirect on mobile)
      console.log('[ONBOARDING] Calling login() for Google OAuth...')
      const success = await login()
      console.log('[ONBOARDING] login() returned:', success)

      // On mobile, login() returns true immediately but redirects away
      // The selector will be shown after redirect back (handled in App.tsx)
      if (isMobile()) {
        console.log('[ONBOARDING] Mobile - page will redirect, not showing selector yet')
        return
      }

      if (success) {
        // OAuth successful - show Google Ads account selector
        // User needs to select which Google Ads account to link to their Meta account
        console.log('[ONBOARDING] Setting showGoogleSelector to true')
        setShowGoogleSelector(true)
      } else {
        addMiaMessage(
          "Google connection was cancelled. Would you like to try again or connect a different platform?",
          [
            { label: "Try Google again", action: "connect_google_ads" },
            { label: "Connect another platform", action: "connect_second" },
            { label: "Skip for now", action: "skip" }
          ]
        )
      }
    } catch (error) {
      console.error('Google OAuth error:', error)
      addMiaMessage(
        "There was an issue connecting to Google. Would you like to try again?",
        [
          { label: "Try again", action: "connect_google_ads" },
          { label: "Skip for now", action: "skip" }
        ]
      )
    }
  }

  // When Google account is linked (for Meta-first users)
  // linkedGoogleId is passed from GoogleAccountLinkSelector but we don't need it
  // since the backend already linked the account
  const handleGoogleAccountLinked = async (_linkedGoogleId?: string) => {
    console.log('[ONBOARDING] handleGoogleAccountLinked called with:', _linkedGoogleId)
    console.log('[ONBOARDING] isGoogleLinkFlowRef:', isGoogleLinkFlowRef.current, 'messages.length:', messages.length)

    // Close the Google account selector modal
    setShowGoogleSelector(false)

    // Clear the Google link flow flag
    isGoogleLinkFlowRef.current = false

    // Refresh accounts to get updated data
    console.log('[ONBOARDING] Refreshing accounts after Google link...')
    await refreshAccounts()

    // Reload onboarding status (will have new combined task_id)
    await loadOnboardingStatus()

    // Show success and Google Bronze facts
    // Messages are now persisted, so this continues the existing conversation
    await addMiaMessage("Perfect - Google Ads is now connected!")

    setIsTyping(true)
    // Request Google Bronze data
    const bronzeFact = await fetchBronzeHighlight('google_ads')
    setIsTyping(false)

    if (bronzeFact) {
      addBronzeFactMessage(bronzeFact)
      setCelebrationType('success')
      setShowCelebration(true)

      await delay(500)

      // Ask about clicks/CTR
      addMiaMessage(
        "Want to see how many clicked through?",
        [
          { label: "Yes", action: "show_google_followup" },
          { label: "Later", action: "finish_onboarding" }
        ]
      )
    } else {
      // No Google Bronze available (maybe no campaigns yet)
      // Still proceed to combined insights since we have Meta data
      addMiaMessage("I'm now analyzing both platforms together...")

      if (sessionId) {
        const streamMsgId = generateId()
        setStreamingMessageId(streamMsgId)
        setIsStreamingCombined(true)
        startStreaming(sessionId, ['google_ads', 'meta_ads'])
      } else {
        await handleOnboardingComplete()
      }
    }
  }

  // Show Google Bronze followup (clicks/CTR) - for Meta-first users
  const handleShowGoogleFollowup = async () => {
    setIsTyping(true)
    // Explicitly request Google followup
    const followupFact = await fetchBronzeFollowup('google_ads')
    setIsTyping(false)

    if (followupFact) {
      addBronzeFactMessage(followupFact)
      setCelebrationType('success')
      setShowCelebration(true)
    }

    await delay(500)

    // Now show combined insights (streaming)
    addMiaMessage("I'm now analyzing both platforms together...")

    // Start streaming combined insights if we have session
    if (sessionId) {
      const streamMsgId = generateId()
      setStreamingMessageId(streamMsgId)
      setIsStreamingCombined(true)  // Mark as combined for completion handler
      startStreaming(sessionId, ['google_ads', 'meta_ads'])
    } else {
      await handleOnboardingComplete()
    }
  }

  // STATE 6.2-6.4 — When Meta account is selected and linked
  const handleMetaAccountLinked = async () => {
    setShowMetaSelector(false)

    // Refresh accounts to get updated data
    await refreshAccounts()

    // Reload onboarding status (will have new combined task_id)
    await loadOnboardingStatus()

    // Show success and Meta Bronze facts
    addMiaMessage("Perfect - Meta is now connected!")

    setIsTyping(true)
    // Explicitly request Meta Bronze (skip cache which has Google data)
    const bronzeFact = await fetchBronzeHighlight('meta_ads')
    setIsTyping(false)

    if (bronzeFact) {
      addBronzeFactMessage(bronzeFact)
      setCelebrationType('success')
      setShowCelebration(true)

      await delay(500)

      // Ask about clicks/CTR
      addMiaMessage(
        "Want to see how many clicked through?",
        [
          { label: "Yes", action: "show_meta_followup" },
          { label: "Later", action: "finish_onboarding" }
        ]
      )
    } else {
      // No Bronze available, skip to completion
      await handleOnboardingComplete()
    }
  }

  // Show Meta Bronze followup (clicks/CTR)
  const handleShowMetaFollowup = async () => {
    setIsTyping(true)
    // Explicitly request Meta followup
    const followupFact = await fetchBronzeFollowup('meta_ads')
    setIsTyping(false)

    if (followupFact) {
      addBronzeFactMessage(followupFact)
      setCelebrationType('success')
      setShowCelebration(true)
    }

    await delay(500)

    // Now show combined insights (streaming)
    addMiaMessage("I'm now analyzing both platforms together...")

    // Start streaming combined insights if we have session
    if (sessionId) {
      const streamMsgId = generateId()
      setStreamingMessageId(streamMsgId)
      setIsStreamingCombined(true)  // Mark as combined for completion handler
      startStreaming(sessionId, ['google_ads', 'meta_ads'])
    } else {
      await handleOnboardingComplete()
    }
  }

  // CTO doc: "At This Point We Request the Second Integration"
  // Claude's response now includes platform connection encouragement, so we only show action buttons
  const promptForSecondPlatform = async () => {
    if (platformCount >= 2) {
      await handleOnboardingComplete()
      return
    }

    // Determine which platform to suggest based on what's already connected
    // Meta-first users should see "Connect Google", Google-first users should see "Connect Meta"
    // Note: Backend returns 'meta' for meta_ads_id, not 'meta_ads'
    const hasMetaConnected = platformsConnected.includes('meta') || platformsConnected.includes('meta_ads') || platformsConnected.includes('facebook')
    const hasGoogleConnected = platformsConnected.includes('google_ads')

    console.log('[ONBOARDING-CHAT] promptForSecondPlatform:', {
      platformsConnected,
      hasMetaConnected,
      hasGoogleConnected
    })

    // Build the primary connection option based on what's missing
    const primaryOption = hasMetaConnected && !hasGoogleConnected
      ? { label: "Connect Google Ads", action: "connect_google_ads" }
      : { label: "Connect Meta", action: "connect_meta_ads" }

    // Only show action buttons - Claude's streamed response already encourages connecting more platforms
    addMiaMessage(
      "",
      [
        primaryOption,
        { label: "Connect another platform", action: "connect_second" },
        { label: "Show me what this unlocks", action: "show_unlock_preview" },
        { label: "Skip for now", action: "skip" }
      ]
    )
  }

  // CTO doc: "Show me what this unlocks"
  const handleShowUnlockPreview = async () => {
    // Determine which platform to suggest based on what's already connected
    // Note: Backend returns 'meta' for meta_ads_id, not 'meta_ads'
    const hasMetaConnected = platformsConnected.includes('meta') || platformsConnected.includes('meta_ads') || platformsConnected.includes('facebook')
    const hasGoogleConnected = platformsConnected.includes('google_ads')

    const primaryOption = hasMetaConnected && !hasGoogleConnected
      ? { label: "Connect Google Ads", action: "connect_google_ads" }
      : { label: "Connect Meta", action: "connect_meta_ads" }

    addMiaMessage(
      "With two platforms connected, I can:\n\n" +
      "- Cross-reference your Google Ads and Meta Ads audiences\n" +
      "- Identify which platform performs better for different goals\n" +
      "- Spot where you're wasting budget across channels\n" +
      "- Generate unified Grow, Optimise, and Protect insights\n\n" +
      "Ready to unlock these capabilities?",
      [
        primaryOption,
        { label: "Connect another platform", action: "connect_second" },
        { label: "Skip for now", action: "skip" }
      ]
    )
  }

  // FINAL STATE handlers
  const handleExploreGrow = async () => {
    addMiaMessage("Taking you to Grow Insights...")
    await delay(500)
    onComplete()
  }

  const handleExploreOptimise = async () => {
    addMiaMessage("Taking you to Optimise Insights...")
    await delay(500)
    onComplete()
  }

  const handleExploreProtect = async () => {
    addMiaMessage("Taking you to Protect Insights...")
    await delay(500)
    onComplete()
  }

  const handleWeeklyReports = async () => {
    addMiaMessage(
      "I'll send you weekly Intelligence Reports with your key metrics and opportunities. You can adjust this in Settings anytime."
    )
    await delay(1000)
    onComplete()
  }

  // CTO doc FINAL STATE — User Completes Onboarding
  const handleOnboardingComplete = async () => {
    console.log('[ONBOARDING] handleOnboardingComplete called - completing onboarding')
    console.trace('[ONBOARDING] Stack trace for handleOnboardingComplete')
    await completeOnboarding()

    // Clear persisted messages since onboarding is done
    localStorage.removeItem('mia_onboarding_messages')

    setCelebrationType('complete')
    setShowCelebration(true)

    await delay(500)

    // CTO doc: Mini progress bar [####] Setup complete
    // "Perfect — you're fully set up! With two platforms connected..."
    addMiaMessage(
      "Perfect — you're fully set up!\nWith two platforms connected, your intelligence is now significantly more accurate.\nI've unlocked your Intelligence Snapshot.\n\nWould you like a guided overview or do you want to explore on your own?",
      [
        { label: "Show me my Intelligence Snapshot", action: "show_snapshot" },
        { label: "Explore Grow Insights", action: "explore_grow" },
        { label: "Explore Optimise Insights", action: "explore_optimise" },
        { label: "Explore Protect Insights", action: "explore_protect" },
        { label: "Connect more platforms", action: "connect_more" },
        { label: "Receive weekly Intelligence Reports", action: "weekly_reports" }
      ]
    )
  }

  const addGrowInsightsReadyMessage = async () => {
    addMiaMessage(
      "Your Grow Insights are ready! They highlight the biggest opportunities in your data right now."
    )

    setCelebrationType('milestone')
    setShowCelebration(true)
  }

  // Called when second platform is connected (from parent component)
  const handleSecondPlatformConnected = async (platformName: string) => {
    addMiaMessage(`Great - I've connected to ${platformName}!`)

    setIsTyping(true)
    const bronzeFact = await fetchBronzeFollowup()
    setIsTyping(false)

    if (bronzeFact) {
      addBronzeFactMessage(bronzeFact)
      setCelebrationType('success')
      setShowCelebration(true)
    }

    await delay(1000)
    await handleOnboardingComplete()
  }

  // Helper functions
  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }

  const addMiaMessage = async (
    content: string,
    choices?: { label: string; action: string }[]
  ) => {
    addMessage({
      id: generateId(),
      type: 'mia',
      content,
      timestamp: new Date(),
      choices,
    })
    await delay(100)
  }

  const addUserMessage = (content: string) => {
    addMessage({
      id: generateId(),
      type: 'user',
      content,
      timestamp: new Date(),
    })
  }

  const addBronzeFactMessage = (fact: BronzeFact) => {
    addMessage({
      id: generateId(),
      type: 'bronze-fact',
      content: '',
      timestamp: new Date(),
      bronzeFact: fact,
    })
  }

  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Progress bar */}
      <OnboardingProgressBar step={Math.min(step + 1, 4)} totalSteps={4} />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onChoiceSelect={handleChoice}
              onPlatformSelect={(platformId) => onConnectPlatform(platformId)}
              hasTyped={typedMessageIdsRef.current.has(message.id)}
              onTypingComplete={(id) => typedMessageIdsRef.current.add(id)}
            />
          ))}
        </AnimatePresence>

        {/* Streaming message - displays while streaming */}
        {isStreaming && streamingMessageId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <div className="flex-1">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[85%]">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {streamedText}
                  <span className="animate-pulse ml-0.5">|</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-gray-500"
          >
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Micro celebration overlay */}
      <MicroCelebration
        show={showCelebration}
        type={celebrationType}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Meta Account Selector Modal - Opens inline, not navigation away */}
      <MetaAccountSelector
        isOpen={showMetaSelector}
        onClose={() => setShowMetaSelector(false)}
        onSuccess={handleMetaAccountLinked}
        currentGoogleAccountName={selectedAccount?.name}
      />

      {/* Google Account Link Selector Modal - For Meta-first users linking Google */}
      <GoogleAccountLinkSelector
        isOpen={showGoogleSelector}
        onClose={() => setShowGoogleSelector(false)}
        onSuccess={handleGoogleAccountLinked}
      />
    </div>
  )
}

// Message Bubble Component
interface MessageBubbleProps {
  message: ChatMessage
  onChoiceSelect: (action: string) => void
  onPlatformSelect: (platformId: string) => void
  hasTyped: boolean  // True if this message has already been displayed (skip animation)
  onTypingComplete: (messageId: string) => void
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onChoiceSelect,
  onPlatformSelect,
  hasTyped,
  onTypingComplete,
}) => {
  if (message.type === 'bronze-fact' && message.bronzeFact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ml-10"
      >
        <BronzeFactCard
          platform={message.bronzeFact.platform}
          headline={message.bronzeFact.headline}
          detail={message.bronzeFact.detail}
          metricValue={message.bronzeFact.metric_value}
          metricName={message.bronzeFact.metric_name}
        />
      </motion.div>
    )
  }

  if (message.type === 'platform-options' && message.platforms) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ml-10 space-y-2"
      >
        {message.platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => onPlatformSelect(platform.id)}
            className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-sm font-bold text-gray-600">
                {platform.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{platform.name}</p>
              <p className="text-sm text-gray-500">{platform.description}</p>
            </div>
          </button>
        ))}
      </motion.div>
    )
  }

  if (message.type === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="bg-black text-white px-4 py-2 rounded-2xl rounded-br-sm max-w-[80%]">
          <p className="text-sm">{message.content}</p>
        </div>
      </motion.div>
    )
  }

  // Mia message - use TypingMessage for streaming effect
  return (
    <TypingMessage
      content={message.content}
      choices={message.choices}
      onChoiceSelect={onChoiceSelect}
      onTypingComplete={() => onTypingComplete(message.id)}
      skipAnimation={hasTyped}
    />
  )
}

export default OnboardingChat
