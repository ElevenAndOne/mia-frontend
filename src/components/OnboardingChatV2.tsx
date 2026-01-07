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

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from '../contexts/SessionContext'
import { useOnboarding, BronzeFact } from '../contexts/OnboardingContext'
import { useOnboardingStreaming } from '../hooks/useOnboardingStreaming'
import MetaAccountSelector from './MetaAccountSelector'
import GoogleAccountLinkSelector from './GoogleAccountLinkSelector'

interface OnboardingChatV2Props {
  onComplete: () => void
  onSkip: () => void
  onConnectPlatform: (platformId: string) => void
}

// Message types for the chat
type MessageType = 'mia' | 'user' | 'bronze-card' | 'explainer-box' | 'insight-card' | 'choice-buttons'

interface ChatMessage {
  id: string
  type: MessageType
  content?: string
  bronzeFact?: BronzeFact
  explainerType?: 'grow' | 'optimise' | 'protect'
  insightData?: InsightData
  choices?: { label: string; action: string; variant?: 'primary' | 'secondary' }[]
}

interface InsightData {
  type: 'grow' | 'optimise' | 'protect'
  platform: string
  title: string
  metrics: { value: string; label: string; badge?: string }[]
  description: string
}

// =============================================================================
// TYPING INDICATOR COMPONENT
// =============================================================================
const TypingIndicator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex items-center gap-1 px-4 py-3 bg-gray-100 rounded-2xl w-fit"
  >
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </motion.div>
)

// =============================================================================
// BRONZE CARD V2 COMPONENT (New styling with large numbers)
// =============================================================================
interface BronzeCardV2Props {
  platform: string
  headline: string
  metricValue: number | string
  metricLabel: string
  secondaryMetric?: { value: string; label: string }
  variant?: 'primary' | 'secondary' // primary = reach (teal), secondary = clicks (blue)
}

const BronzeCardV2: React.FC<BronzeCardV2Props> = ({
  platform,
  headline,
  metricValue,
  metricLabel,
  secondaryMetric,
  variant = 'primary'
}) => {
  // Platform-specific styling
  const platformStyles: Record<string, { icon: string; iconBg: string }> = {
    google_ads: { icon: '/icons/google-ads.svg', iconBg: 'bg-white' },
    meta_ads: { icon: '/icons/meta.svg', iconBg: 'bg-white' },
    ga4: { icon: '/icons/ga4.svg', iconBg: 'bg-white' },
  }

  const config = platformStyles[platform] || platformStyles.google_ads

  // Variant colors - primary (teal/green for reach), secondary (blue for clicks)
  const variantStyles = {
    primary: {
      bg: 'bg-gradient-to-br from-teal-50 to-green-100',
      border: 'border-teal-200',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-700'
    },
    secondary: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      border: 'border-blue-200',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700'
    }
  }

  const styles = variantStyles[variant]

  // Format the metric value
  const formattedValue = typeof metricValue === 'number'
    ? metricValue.toLocaleString()
    : metricValue

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`${styles.bg} ${styles.border} border rounded-2xl p-4 max-w-[90%]`}
    >
      <div className="flex items-start gap-3">
        {/* Platform Icon */}
        <div className={`${config.iconBg} w-10 h-10 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0`}>
          {platform === 'google_ads' ? (
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#FBBC04" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
            </svg>
          ) : platform === 'meta_ads' ? (
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#0866FF" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          ) : (
            <span className="text-sm font-bold text-gray-600">G</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-gray-600 text-sm">{headline}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formattedValue}
          </p>
          <p className="text-gray-600 text-sm">{metricLabel}</p>

          {/* Secondary metric badge */}
          {secondaryMetric && (
            <div className={`${styles.badgeBg} ${styles.badgeText} inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs mt-2`}>
              <span className="font-semibold">With {secondaryMetric.value}</span>
              <span>{secondaryMetric.label}</span>
            </div>
          )}
        </div>

        {/* Bookmark icon */}
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

// =============================================================================
// EXPLAINER BOX COMPONENT
// =============================================================================
interface ExplainerBoxProps {
  type: 'grow' | 'optimise' | 'protect'
}

const ExplainerBox: React.FC<ExplainerBoxProps> = ({ type }) => {
  const config = {
    grow: {
      icon: '🌱',
      title: 'Grow',
      description: "I'll find new ways to reach more of the right people and ",
      boldText: 'scale your business',
      suffix: ' faster.',
      bg: 'bg-green-50',
      border: 'border-green-200',
      titleColor: 'text-green-700'
    },
    optimise: {
      icon: '⚡',
      title: 'Optimise',
      description: "Spot what's working in your marketing so you can fine-tune and get ",
      boldText: 'better results',
      suffix: ' with less effort.',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      titleColor: 'text-yellow-700'
    },
    protect: {
      icon: '🛡️',
      title: 'Protect',
      description: "I'll keep an eye on performance drops, wasted spend, and risky campaigns — ",
      boldText: 'protecting your brand',
      suffix: ' and budget before problems grow.',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      titleColor: 'text-blue-700'
    }
  }

  const c = config[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${c.bg} ${c.border} border rounded-2xl p-4 max-w-[90%]`}
    >
      <div className="flex items-start gap-2">
        <span className="text-xl">{c.icon}</span>
        <div>
          <h3 className={`font-semibold ${c.titleColor}`}>{c.title}</h3>
          <p className="text-gray-600 text-sm mt-1">
            {c.description}
            <span className="font-semibold italic">{c.boldText}</span>
            {c.suffix}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// INSIGHT OUTPUT CARD COMPONENT
// =============================================================================
interface InsightCardProps {
  data: InsightData
}

const InsightCard: React.FC<InsightCardProps> = ({ data }) => {
  const typeStyles = {
    grow: { badgeBg: 'bg-green-100', badgeText: 'text-green-700', metricColor: 'text-green-600' },
    optimise: { badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-700', metricColor: 'text-yellow-600' },
    protect: { badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', metricColor: 'text-blue-600' }
  }

  const styles = typeStyles[data.type]
  const typeLabel = data.type.charAt(0).toUpperCase() + data.type.slice(1) + ' Insights'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm max-w-[90%]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className={`${styles.badgeBg} ${styles.badgeText} text-xs font-medium px-2 py-1 rounded-full`}>
          {typeLabel}
        </span>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>

      {/* Platform */}
      <div className="flex items-center gap-2 mb-2">
        {data.platform === 'google_ads' && (
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#FBBC04" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
          </svg>
        )}
        <span className="font-semibold text-gray-900">
          {data.platform === 'google_ads' ? 'Google Ads' : data.platform === 'meta_ads' ? 'Meta Ads' : data.platform}
        </span>
      </div>

      {/* Title */}
      <p className="text-gray-600 text-sm mb-3">{data.title}</p>

      {/* Metrics */}
      <div className="space-y-3 mb-4">
        {data.metrics.map((metric, idx) => (
          <div key={idx} className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-4xl font-bold ${styles.metricColor}`}>{metric.value}</span>
            <span className="text-gray-600 text-sm">{metric.label}</span>
            {metric.badge && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                {metric.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Description */}
      <p className="text-gray-700 text-sm">{data.description}</p>
    </motion.div>
  )
}

// =============================================================================
// MESSAGE BUBBLE COMPONENT
// =============================================================================
interface MessageBubbleProps {
  message: ChatMessage
  onChoiceSelect?: (action: string) => void
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onChoiceSelect }) => {
  // User message
  if (message.type === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="bg-black text-white px-4 py-2 rounded-2xl max-w-[80%]">
          <p className="text-sm">{message.content}</p>
        </div>
      </motion.div>
    )
  }

  // Bronze card
  if (message.type === 'bronze-card' && message.bronzeFact) {
    const fact = message.bronzeFact

    // Determine variant based on metric type
    const isClicksMetric = fact.metric_name?.toLowerCase().includes('click') ||
                           fact.headline.toLowerCase().includes('click')

    // Parse headline to extract parts
    // E.g., "Your ads reached 311,621 people in the last 30 days"
    // -> headline: "Your ads reached", metricLabel: "people in the last 30 days"
    let headlineText = ''
    let metricLabelText = fact.detail || ''

    if (fact.metric_value) {
      // Try to split headline around the number
      const numberStr = fact.metric_value.toLocaleString()
      const parts = fact.headline.split(/[\d,]+/)
      if (parts.length >= 2) {
        headlineText = parts[0].trim()
        metricLabelText = parts[1]?.trim() || fact.detail || ''
      } else {
        headlineText = fact.headline
      }
    } else {
      headlineText = fact.headline
    }

    // Parse secondary metric from detail if it contains numbers
    let secondaryMetric: { value: string; label: string } | undefined
    if (fact.detail) {
      // Check for patterns like "With 7577 conversions" or "5.33% click through rate"
      const detailMatch = fact.detail.match(/(?:With\s+)?([\d,\.%]+)\s+(.+)/i)
      if (detailMatch) {
        secondaryMetric = { value: detailMatch[1], label: detailMatch[2] }
      }
    }

    return (
      <BronzeCardV2
        platform={fact.platform}
        headline={headlineText}
        metricValue={fact.metric_value || 0}
        metricLabel={metricLabelText}
        secondaryMetric={secondaryMetric}
        variant={isClicksMetric ? 'secondary' : 'primary'}
      />
    )
  }

  // Explainer box
  if (message.type === 'explainer-box' && message.explainerType) {
    return <ExplainerBox type={message.explainerType} />
  }

  // Insight card
  if (message.type === 'insight-card' && message.insightData) {
    return <InsightCard data={message.insightData} />
  }

  // Choice buttons (standalone)
  if (message.type === 'choice-buttons' && message.choices) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-2"
      >
        {message.choices.map((choice, idx) => (
          <button
            key={idx}
            onClick={() => onChoiceSelect?.(choice.action)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              choice.variant === 'primary'
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {choice.label}
          </button>
        ))}
      </motion.div>
    )
  }

  // Mia message (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2"
    >
      <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl max-w-[85%] w-fit">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>

      {/* Inline choices if present */}
      {message.choices && message.choices.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {message.choices.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => onChoiceSelect?.(choice.action)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                choice.variant === 'primary'
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// =============================================================================
// PROGRESS DOTS COMPONENT
// =============================================================================
interface ProgressDotsProps {
  current: number
  total: number
}

const ProgressDots: React.FC<ProgressDotsProps> = ({ current, total }) => (
  <div className="flex gap-1">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`w-2 h-2 rounded-full transition-colors ${
          i < current ? 'bg-black' : 'bg-gray-300'
        }`}
      />
    ))}
  </div>
)

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const OnboardingChatV2: React.FC<OnboardingChatV2Props> = ({
  onComplete,
  onSkip,
  onConnectPlatform,
}) => {
  const { selectedAccount, sessionId, login, loginMeta, refreshAccounts } = useSession()
  const {
    step,
    platformsConnected,
    platformCount,
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
    error: streamError,
    startStreaming,
    reset: resetStreaming
  } = useOnboardingStreaming()

  // Message state
  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([])
  const [messageQueue, setMessageQueue] = useState<Omit<ChatMessage, 'id'>[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(1)

  // Modal state
  const [showMetaSelector, setShowMetaSelector] = useState(false)
  const [showGoogleSelector, setShowGoogleSelector] = useState(false)

  // Streaming state
  const [isStreamingInsight, setIsStreamingInsight] = useState(false)
  const [isStreamingCombined, setIsStreamingCombined] = useState(false)
  const [selectedInsightType, setSelectedInsightType] = useState<'grow' | 'optimise' | 'protect'>('grow')

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false)
  const processingQueue = useRef(false)

  // Generate unique ID
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayedMessages, isTyping])

  // Process message queue
  useEffect(() => {
    if (messageQueue.length === 0 || isTyping || processingQueue.current) return

    processingQueue.current = true
    const nextMessage = messageQueue[0]

    // Show typing indicator
    setIsTyping(true)

    // Determine delay based on message type - 2 seconds for all messages for natural pacing
    const delay = nextMessage.type === 'explainer-box' ? 2500 : 2000

    setTimeout(() => {
      // Add message to displayed
      setDisplayedMessages(prev => [...prev, { ...nextMessage, id: generateId() }])
      // Remove from queue
      setMessageQueue(prev => prev.slice(1))
      // Hide typing
      setIsTyping(false)
      processingQueue.current = false

      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    }, delay)
  }, [messageQueue, isTyping])

  // Queue messages helper
  const queueMessages = useCallback((messages: Omit<ChatMessage, 'id'>[]) => {
    setMessageQueue(prev => [...prev, ...messages])
  }, [])

  // Add single message immediately (no queue)
  const addImmediateMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    setDisplayedMessages(prev => [...prev, { ...message, id: generateId() }])
  }, [])

  // Initialize chat
  useEffect(() => {
    if (!hasInitialized.current && selectedAccount) {
      hasInitialized.current = true
      initializeChat()
    }
  }, [selectedAccount])

  // Handle streaming completion
  useEffect(() => {
    if (streamComplete && (isStreamingInsight || isStreamingCombined)) {
      const handleStreamComplete = async () => {
        // Add the streamed text as a Mia message
        if (streamedText) {
          addImmediateMessage({ type: 'mia', content: streamedText })
        }

        const wasCombined = isStreamingCombined

        // Reset streaming state
        setIsStreamingInsight(false)
        setIsStreamingCombined(false)
        resetStreaming()

        await advanceStep()

        if (wasCombined) {
          // After combined streaming, go to completion
          queueMessages([
            { type: 'mia', content: "Perfect! You're fully set up with cross-platform insights." },
            {
              type: 'choice-buttons',
              choices: [
                { label: "Let's go!", action: "finish", variant: 'primary' }
              ]
            }
          ])
        } else {
          // After single-platform streaming, prompt for second platform
          const hasMetaConnected = platformsConnected.includes('meta') ||
                                   platformsConnected.includes('meta_ads') ||
                                   platformsConnected.includes('facebook')
          const hasGoogleConnected = platformsConnected.includes('google_ads')

          const connectAction = hasMetaConnected && !hasGoogleConnected ? 'connect_google' : 'connect_meta'
          const connectLabel = hasMetaConnected && !hasGoogleConnected ? 'Connect Google Ads' : 'Connect Meta'

          queueMessages([
            { type: 'mia', content: "Great! You're getting the hang of it. Now let's link your second account for even deeper insights." },
            {
              type: 'choice-buttons',
              choices: [
                { label: connectLabel, action: connectAction, variant: 'primary' },
                { label: "Skip for now", action: "skip_connect", variant: 'secondary' }
              ]
            }
          ])
        }
      }
      handleStreamComplete()
    }
  }, [streamComplete, isStreamingInsight, isStreamingCombined])

  const initializeChat = async () => {
    const accountName = selectedAccount?.name || 'your account'

    // Load onboarding status
    await loadOnboardingStatus()

    // Queue initial welcome messages
    queueMessages([
      { type: 'mia', content: "Congrats! 🥳 You're connected" },
      { type: 'mia', content: "Hi I'm Mia, but you probably already know that." },
      { type: 'mia', content: "We'll get to know each other much better :P" },
      { type: 'mia', content: "Let's start with some stats" },
    ])

    // Fetch Bronze fact in parallel
    const bronzeFact = await fetchBronzeHighlight()

    if (bronzeFact) {
      // Queue Bronze card and follow-up question
      queueMessages([
        { type: 'bronze-card', bronzeFact },
        {
          type: 'mia',
          content: "Want to see how many of those people actually clicked?",
          choices: [
            { label: "Yes, show me!", action: "show_clicks", variant: 'primary' },
            { label: "Later", action: "skip_clicks", variant: 'secondary' }
          ]
        }
      ])
    } else {
      // No Bronze data - skip to explainers
      queueMessages([
        { type: 'mia', content: "I'm connecting to your data..." },
        {
          type: 'mia',
          content: "Would you like to see what I can help you with?",
          choices: [
            { label: "Yes!", action: "show_explainers", variant: 'primary' },
            { label: "Skip", action: "skip", variant: 'secondary' }
          ]
        }
      ])
    }

    await advanceStep()
  }

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
    }
  }

  // Show clicks Bronze card
  const handleShowClicks = async () => {
    // Fetch follow-up Bronze fact (clicks/CTR)
    const followupFact = await fetchBronzeFollowup()

    if (followupFact) {
      queueMessages([
        { type: 'bronze-card', bronzeFact: followupFact },
        { type: 'mia', content: "🔥 Amazing! These are great stats" },
        { type: 'mia', content: "But now what...? 🤔" },
        {
          type: 'mia',
          content: "Don't stress, I got you. I specialise in taking your stats and comparing them against each other. We can look into three areas:"
        },
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
        setShowMetaSelector(true)
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
    try {
      const success = await login()
      if (success) {
        setShowGoogleSelector(true)
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
    setShowMetaSelector(false)
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
    setShowGoogleSelector(false)
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Progress dots - top right */}
      <div className="absolute top-4 right-4 z-10">
        <ProgressDots current={currentProgress} total={4} />
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
        onClose={() => setShowMetaSelector(false)}
        onSuccess={handleMetaAccountLinked}
        currentGoogleAccountName={selectedAccount?.name}
      />

      {/* Google Account Link Selector Modal */}
      <GoogleAccountLinkSelector
        isOpen={showGoogleSelector}
        onClose={() => setShowGoogleSelector(false)}
        onSuccess={handleGoogleAccountLinked}
      />
    </div>
  )
}

export default OnboardingChatV2
