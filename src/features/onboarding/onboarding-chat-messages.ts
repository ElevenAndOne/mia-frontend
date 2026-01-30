import type { BronzeFact } from './onboarding-context'
import type { ChatMessageInput, ExplainerType } from './onboarding-chat-types'
import { buildBronzeCardData } from './bronze-card-utils'

const CHOICE_LABELS: Record<string, string> = {
  show_clicks: 'Yes, show me!',
  skip_clicks: 'Later',
  show_explainers: 'Yes!',
  skip: 'Skip',
  grow: 'Grow',
  optimise: 'Optimise',
  protect: 'Protect',
  connect_meta: 'Connect Meta',
  connect_google: 'Connect Google Ads',
  skip_connect: 'Skip for now',
  finish: "Let's go!",
  go_integrations: 'Manage Integrations',
  continue_anyway: 'Continue anyway'
}

export const WELCOME_MESSAGES: ChatMessageInput[] = [
  { type: 'mia', content: "Congrats! 🥳 You're connected" },
  { type: 'mia', content: "Hi I'm Mia, but you probably already know that." },
  { type: 'mia', content: "We'll get to know each other much better :P" },
  { type: 'mia', content: "Let's start with some stats" }
]

export const getChoiceLabel = (action: string) => CHOICE_LABELS[action] || action

export const getConnectPrompt = (platformsConnected: string[]) => {
  const hasMetaConnected =
    platformsConnected.includes('meta') ||
    platformsConnected.includes('meta_ads') ||
    platformsConnected.includes('facebook')
  const hasGoogleConnected = platformsConnected.includes('google_ads')

  return {
    action: hasMetaConnected && !hasGoogleConnected ? 'connect_google' : 'connect_meta',
    label: hasMetaConnected && !hasGoogleConnected ? 'Connect Google Ads' : 'Connect Meta'
  }
}

export const buildBronzeNoReachMessages = (bronzeFact: BronzeFact): ChatMessageInput[] => [
  { type: 'bronze-card', bronzeCard: buildBronzeCardData(bronzeFact) },
  { type: 'mia', content: "Looks like there hasn't been much activity recently." },
  {
    type: 'mia',
    content: 'No worries! This could mean your campaigns are paused, or we just need to look at a different time period.'
  },
  {
    type: 'mia',
    content: 'Let me show you what I can help with:',
    choices: [
      { label: 'Show me', action: 'show_explainers', variant: 'primary' },
      { label: 'Manage Integrations', action: 'go_integrations', variant: 'secondary' }
    ]
  }
]

export const buildBronzeReachMessages = (bronzeFact: BronzeFact): ChatMessageInput[] => [
  { type: 'bronze-card', bronzeCard: buildBronzeCardData(bronzeFact) },
  {
    type: 'mia',
    content: 'Want to see how many of those people actually clicked?',
    choices: [
      { label: 'Yes, show me!', action: 'show_clicks', variant: 'primary' },
      { label: 'Later', action: 'skip_clicks', variant: 'secondary' }
    ]
  }
]

export const buildNoBronzeMessages = (): ChatMessageInput[] => [
  { type: 'mia', content: "I couldn't find any recent campaign data for this account." },
  {
    type: 'mia',
    content: "This might mean your campaigns haven't run recently, or you need to connect a different platform."
  },
  {
    type: 'mia',
    content: 'What would you like to do?',
    choices: [
      { label: 'Manage Integrations', action: 'go_integrations', variant: 'primary' },
      { label: 'Continue anyway', action: 'show_explainers', variant: 'secondary' }
    ]
  }
]

const buildClickReaction = (followupFact: BronzeFact, initialBronzeFact: BronzeFact | null) => {
  const clickValue = followupFact.metric_value ?? 0
  const reachValue = initialBronzeFact?.metric_value ?? 0
  const formattedClicks = clickValue.toLocaleString()
  const formattedReach = reachValue.toLocaleString()

  const ctrMatch = followupFact.detail?.match(/(\d+\.?\d*)%/)
  const actualCTR = ctrMatch ? ctrMatch[1] : null

  if (clickValue === 0) {
    return {
      reactionMessage: "Hmm, looks like there weren't many clicks in this period.",
      followupMessage: 'No worries though - I can help you figure out how to change that! 🤔'
    }
  }

  if (clickValue < 100) {
    return {
      reactionMessage: `${formattedClicks} clicks - let's see how we can boost that!`,
      followupMessage: actualCTR
        ? `That's a ${actualCTR}% click-through rate. I can help you improve it! 🤔`
        : 'I can help you improve those numbers! 🤔'
    }
  }

  if (clickValue < 1000) {
    return {
      reactionMessage: `Nice! ${formattedClicks} clicks from ${formattedReach} reach.`,
      followupMessage: actualCTR
        ? `That's a ${actualCTR}% click-through rate - solid foundation to build on! 🤔`
        : 'Solid foundation to build on! 🤔'
    }
  }

  return {
    reactionMessage: `🔥 ${formattedClicks} clicks! That's impressive engagement.`,
    followupMessage: actualCTR
      ? `With a ${actualCTR}% CTR, you're doing great. But what's next? 🤔`
      : `From ${formattedReach} reach, that's great performance. But what's next? 🤔`
  }
}

export const buildClickMessages = (
  followupFact: BronzeFact,
  initialBronzeFact: BronzeFact | null
): ChatMessageInput[] => {
  const bronzeCard = buildBronzeCardData(followupFact)
  const { reactionMessage, followupMessage } = buildClickReaction(followupFact, initialBronzeFact)

  return [
    { type: 'bronze-card', bronzeCard },
    { type: 'mia', content: reactionMessage },
    { type: 'mia', content: followupMessage },
    {
      type: 'mia',
      content:
        "Don't stress, I got you. I specialise in taking your stats and comparing them against each other. We can look into three areas:"
    }
  ]
}

export const buildNoClickMessages = (): ChatMessageInput[] => [
  { type: 'mia', content: "I couldn't find click data for this period. Let me show you what else I can help with:" }
]

export const buildExplainerMessages = (): ChatMessageInput[] => [
  { type: 'explainer-box', explainerType: 'grow' },
  { type: 'explainer-box', explainerType: 'optimise' },
  { type: 'explainer-box', explainerType: 'protect' },
  {
    type: 'mia',
    content: "We're going to explore one of these but don't worry, you can always explore the others later."
  },
  {
    type: 'mia',
    content: 'Which would you like to look at first?',
    choices: [
      { label: 'Grow', action: 'grow', variant: 'secondary' },
      { label: 'Optimise', action: 'optimise', variant: 'secondary' },
      { label: 'Protect', action: 'protect', variant: 'secondary' }
    ]
  }
]

export const buildInsightLoadingMessages = (type: ExplainerType): ChatMessageInput[] => {
  const insightLabel = `${type.charAt(0).toUpperCase()}${type.slice(1)}`
  return [{ type: 'mia', content: `Cool! I'm doing my magic and analysing your ${insightLabel} info.` }]
}

export const buildInsightFallbackChoices = (platformsConnected: string[]): ChatMessageInput[] => {
  const { action, label } = getConnectPrompt(platformsConnected)

  return [
    {
      type: 'choice-buttons',
      choices: [
        { label, action, variant: 'primary' },
        { label: 'Skip for now', action: 'skip_connect', variant: 'secondary' }
      ]
    }
  ]
}

export const buildConnectRetryMessages = (platform: 'meta' | 'google'): ChatMessageInput[] => {
  const label = platform === 'meta' ? 'Meta' : 'Google'
  const action = platform === 'meta' ? 'connect_meta' : 'connect_google'

  return [
    {
      type: 'mia',
      content: `${label} connection was cancelled. Would you like to try again?`
    },
    {
      type: 'choice-buttons',
      choices: [
        { label: 'Try again', action, variant: 'primary' },
        { label: 'Skip for now', action: 'skip_connect', variant: 'secondary' }
      ]
    }
  ]
}

export const buildConnectErrorMessages = (platform: 'meta' | 'google'): ChatMessageInput[] => {
  const label = platform === 'meta' ? 'Meta' : 'Google'
  const action = platform === 'meta' ? 'connect_meta' : 'connect_google'

  return [
    {
      type: 'mia',
      content: `There was an issue connecting to ${label}. Would you like to try again?`
    },
    {
      type: 'choice-buttons',
      choices: [
        { label: 'Try again', action, variant: 'primary' },
        { label: 'Skip for now', action: 'skip_connect', variant: 'secondary' }
      ]
    }
  ]
}

export const buildPlatformLinkedMessages = (platformLabel: string): ChatMessageInput[] => [
  { type: 'mia', content: `Perfect - ${platformLabel} is now connected!` },
  { type: 'mia', content: "I'm now analyzing both platforms together..." }
]

export const buildCombinedFallbackMessages = (): ChatMessageInput[] => [
  { type: 'mia', content: "You're all set with cross-platform insights!" },
  { type: 'choice-buttons', choices: [{ label: "Let's go!", action: 'finish', variant: 'primary' }] }
]

export const buildSkipMessages = (): ChatMessageInput[] => [
  { type: 'mia', content: 'No problem! You can connect more platforms anytime from Settings.' },
  { type: 'mia', content: "For now, let's explore what I can show you with your current data." },
  { type: 'choice-buttons', choices: [{ label: "Let's go!", action: 'finish', variant: 'primary' }] }
]

export const buildStreamCompleteMessages = (wasCombined: boolean, platformsConnected: string[]): ChatMessageInput[] => {
  if (wasCombined) {
    return [
      { type: 'mia', content: "Perfect! You're fully set up with cross-platform insights." },
      { type: 'choice-buttons', choices: [{ label: "Let's go!", action: 'finish', variant: 'primary' }] }
    ]
  }

  const { action, label } = getConnectPrompt(platformsConnected)

  return [
    {
      type: 'mia',
      content: "Great! You're getting the hang of it. Now let's link your second account for even deeper insights."
    },
    {
      type: 'choice-buttons',
      choices: [
        { label, action, variant: 'primary' },
        { label: 'Skip for now', action: 'skip_connect', variant: 'secondary' }
      ]
    }
  ]
}
