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
import OnboardingProgressBar from './OnboardingProgressBar'
import BronzeFactCard from './BronzeFactCard'
import MicroCelebration from './MicroCelebration'

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
  const { selectedAccount } = useSession()
  const {
    step,
    platformsConnected,
    platformCount,
    fullAccess,
    fetchBronzeHighlight,
    fetchBronzeFollowup,
    startGrowInsightsAsync,
    checkGrowInsightsStatus,
    advanceStep,
    completeOnboarding,
    skipOnboarding,
    getAvailablePlatforms,
    growInsightsReady,
  } = useOnboarding()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationType, setCelebrationType] = useState<'success' | 'milestone' | 'complete'>('success')
  const [isTyping, setIsTyping] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize onboarding chat
  useEffect(() => {
    if (messages.length === 0 && selectedAccount) {
      initializeChat()
    }
  }, [selectedAccount])

  // Poll for Grow insights completion
  useEffect(() => {
    if (pollingInterval && growInsightsReady) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
      addGrowInsightsReadyMessage()
    }
  }, [growInsightsReady])

  const initializeChat = async () => {
    const accountName = selectedAccount?.name || 'your account'

    // Step 1: Welcome message
    await addMiaMessage(`Great - I've connected to ${accountName}.`)
    await delay(500)

    // Step 2: Fetch and show Bronze fact
    setIsTyping(true)
    const bronzeFact = await fetchBronzeHighlight()
    setIsTyping(false)

    if (bronzeFact) {
      await addMiaMessage("Here's something interesting already:")
      await delay(300)
      addBronzeFactMessage(bronzeFact)

      // Micro celebration
      setCelebrationType('success')
      setShowCelebration(true)

      await delay(1000)

      // Step 3: First choice
      addMiaMessage(
        "Want to see more details about your performance?",
        [
          { label: "Yes, show me", action: "show_more" },
          { label: "Later", action: "skip_details" }
        ]
      )

      // Start Grow insights in background
      startGrowInsightsAsync().then(taskId => {
        if (taskId) {
          // Start polling for completion
          const interval = setInterval(() => {
            checkGrowInsightsStatus()
          }, 3000)
          setPollingInterval(interval)
        }
      })

      await advanceStep() // Move to step 1
    } else {
      // No Bronze data available
      addMiaMessage(
        "I'm connecting to your data. While I do that, would you like to connect another platform for deeper insights?",
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
      'connect_second': 'Yes, connect more',
      'skip': 'Skip for now',
      'show_snapshot': 'Show my Intelligence Snapshot',
      'explore': 'Explore on my own',
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

      default:
        // Check if it's a platform connection
        if (action.startsWith('connect_')) {
          const platformId = action.replace('connect_', '')
          onConnectPlatform(platformId)
        }
    }
  }

  const handleShowMore = async () => {
    setIsTyping(true)
    const followupFact = await fetchBronzeFollowup()
    setIsTyping(false)

    if (followupFact) {
      addBronzeFactMessage(followupFact)
      await delay(500)
    }

    addMiaMessage(
      "I'm preparing your Grow Insights in the background. These will show you the biggest opportunities in your data."
    )

    await delay(1000)

    // Check platform count and prompt for second
    if (platformCount < 2) {
      addMiaMessage(
        "If you think that's cool - wait until I have two platforms connected. This unlocks much deeper cross-platform insights. Want to connect another platform now?",
        [
          { label: "Yes, show me options", action: "connect_second" },
          { label: "Skip for now", action: "skip" }
        ]
      )
    } else {
      // Already have 2+ platforms
      await handleOnboardingComplete()
    }

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
    onComplete()
  }

  const handleExplore = async () => {
    onComplete()
  }

  const handleOnboardingComplete = async () => {
    await completeOnboarding()

    setCelebrationType('complete')
    setShowCelebration(true)

    await delay(500)

    addMiaMessage(
      "Perfect - you're fully set up! With two platforms connected, your intelligence is now significantly more accurate. I've unlocked your Intelligence Snapshot.",
      [
        { label: "Show my Intelligence Snapshot", action: "show_snapshot" },
        { label: "Explore on my own", action: "explore" }
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
    <div className="flex flex-col h-full bg-gray-50">
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
            />
          ))}
        </AnimatePresence>

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
    </div>
  )
}

// Message Bubble Component
interface MessageBubbleProps {
  message: ChatMessage
  onChoiceSelect: (action: string) => void
  onPlatformSelect: (platformId: string) => void
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onChoiceSelect,
  onPlatformSelect,
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

  // Mia message
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2"
    >
      {/* Mia avatar */}
      <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">M</span>
      </div>

      <div className="flex-1 space-y-2">
        {/* Message bubble */}
        <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[85%]">
          <p className="text-sm text-gray-800 leading-relaxed">{message.content}</p>
        </div>

        {/* Choice buttons */}
        {message.choices && message.choices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => onChoiceSelect(choice.action)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  index === 0
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default OnboardingChat
