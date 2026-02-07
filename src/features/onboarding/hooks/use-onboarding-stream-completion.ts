import { useEffect } from 'react'
import type { ChatMessageInput } from '../onboarding-chat-types'
import { buildFinalMessages, buildSecondPlatformPrompt } from '../utils/onboarding-inline-messages'

type Provider = 'google' | 'meta'

interface UseOnboardingStreamCompletionArgs {
  isComplete: boolean
  streamedText: string
  isStreamingInsight: boolean
  isStreamingCombined: boolean
  primaryProvider: Provider
  addImmediateMessage: (message: ChatMessageInput) => void
  queueMessages: (messages: ChatMessageInput[]) => void
  onCombinedComplete: () => void
  onDone: () => void
}

export const useOnboardingStreamCompletion = ({
  isComplete,
  streamedText,
  isStreamingInsight,
  isStreamingCombined,
  primaryProvider,
  addImmediateMessage,
  queueMessages,
  onCombinedComplete,
  onDone
}: UseOnboardingStreamCompletionArgs) => {
  useEffect(() => {
    if (!isComplete) {
      return
    }

    if (streamedText) {
      addImmediateMessage({ type: 'mia', content: streamedText })
    }

    if (isStreamingCombined) {
      onCombinedComplete()
      queueMessages(buildFinalMessages())
    } else if (isStreamingInsight) {
      queueMessages(buildSecondPlatformPrompt(primaryProvider))
    }

    onDone()
  }, [
    addImmediateMessage,
    isComplete,
    isStreamingCombined,
    isStreamingInsight,
    onCombinedComplete,
    onDone,
    primaryProvider,
    queueMessages,
    streamedText
  ])
}
