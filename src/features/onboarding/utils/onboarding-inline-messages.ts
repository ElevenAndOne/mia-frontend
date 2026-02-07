import type { ChatMessageInput } from '../onboarding-chat-types'
import type { ExplainerType } from '../onboarding-chat-types'
import type { BronzeFact } from '../onboarding-context'
import { buildBronzeCardData } from '../bronze-card-utils'
import { buildExplainerMessages } from '../onboarding-chat-messages'

type Provider = 'google' | 'meta'

export const getPrimaryProvider = (hasGoogleAuth: boolean, hasMetaAuth: boolean): Provider => {
  if (hasGoogleAuth) {
    return 'google'
  }
  if (hasMetaAuth) {
    return 'meta'
  }
  return 'google'
}

export const getSecondaryProvider = (provider: Provider): Provider => {
  return provider === 'google' ? 'meta' : 'google'
}

export const getProviderLabel = (provider: Provider): string => {
  return provider === 'google' ? 'Google Ads' : 'Meta Ads'
}

export const buildWelcomeMessages = (): ChatMessageInput[] => {
  return [
    { type: 'mia', content: "Hi, I'm Mia. Let's get your workspace set up." },
    { type: 'mia', content: 'Everything will happen right here in chat.' }
  ]
}

export const buildWorkspacePrompt = (): ChatMessageInput[] => {
  return [
    { type: 'mia', content: "You don't have a workspace yet. Let's create one." },
    {
      type: 'input-prompt',
      inputPromptKey: 'workspace_name',
      inputPromptLabel: 'What should we call your workspace?',
      inputPromptPlaceholder: 'e.g. Acme Performance',
      inputPromptCta: 'Create Workspace',
      inputPromptLoadingCta: 'Creating...'
    }
  ]
}

export const buildPrimaryConnectPrompt = (provider: Provider): ChatMessageInput[] => {
  const label = getProviderLabel(provider)
  return [
    { type: 'mia', content: `To begin, connect your first platform. I recommend starting with ${label}.` },
    {
      type: 'choice-buttons',
      choices: [
        {
          label: `Connect ${label}`,
          action: provider === 'google' ? 'connect_primary_google' : 'connect_primary_meta',
          variant: 'primary'
        },
        { label: 'Skip for now', action: 'skip', variant: 'secondary' }
      ]
    }
  ]
}

export const buildBronzeMessages = (bronzeFact: BronzeFact | null): ChatMessageInput[] => {
  if (!bronzeFact) {
    return [{ type: 'mia', content: "I couldn't find enough campaign data yet, but we can still continue." }]
  }

  return [
    { type: 'bronze-card', bronzeCard: buildBronzeCardData(bronzeFact) },
    { type: 'mia', content: 'This is your Bronze insight: a factual snapshot of your current performance.' }
  ]
}

export const buildSilverPromptMessages = (): ChatMessageInput[] => {
  return [
    ...buildExplainerMessages(),
    { type: 'mia', content: 'Pick one area and I will generate actionable Silver guidance next.' }
  ]
}

export const buildSilverLoadingMessage = (type: ExplainerType): ChatMessageInput[] => {
  const label = `${type.charAt(0).toUpperCase()}${type.slice(1)}`
  return [{ type: 'mia', content: `Analyzing your ${label} opportunities now...` }]
}

export const buildSecondPlatformPrompt = (primaryProvider: Provider): ChatMessageInput[] => {
  const secondaryProvider = getSecondaryProvider(primaryProvider)
  const secondaryLabel = getProviderLabel(secondaryProvider)
  return [
    { type: 'mia', content: 'Great. You now have actionable insights from your first platform.' },
    { type: 'mia', content: `Next, connect ${secondaryLabel} to unlock unified insights across platforms.` },
    {
      type: 'choice-buttons',
      choices: [
        {
          label: `Connect ${secondaryLabel}`,
          action: secondaryProvider === 'google' ? 'connect_google' : 'connect_meta',
          variant: 'primary'
        },
        { label: 'Skip for now', action: 'finish', variant: 'secondary' }
      ]
    }
  ]
}

export const buildFinalMessages = (): ChatMessageInput[] => {
  return [
    { type: 'mia', content: "You're all set. Let's start using Mia." },
    { type: 'choice-buttons', choices: [{ label: "Let's go", action: 'finish', variant: 'primary' }] }
  ]
}
