/**
 * useOnboardingFlow - Core onboarding flow logic
 *
 * Manages the initialization and streaming completion handlers for the onboarding flow.
 * Handles Bronze card display, streaming insights, and platform connection prompts.
 */

import { useEffect, useRef, useState } from 'react'
import { BronzeFact } from '../../../contexts/onboarding-context'

interface UseOnboardingFlowProps {
  selectedAccount: any
  streamComplete: boolean
  streamedText: string
  isStreamingInsight: boolean
  isStreamingCombined: boolean
  platformsConnected: string[]
  fetchBronzeHighlight: (platform?: string) => Promise<BronzeFact | null>
  loadOnboardingStatus: () => Promise<string | null>
  advanceStep: () => Promise<void>
  resetStreaming: () => void
  queueMessages: (messages: any[]) => void
  addImmediateMessage: (message: any) => void
  setIsStreamingInsight: (value: boolean) => void
  setIsStreamingCombined: (value: boolean) => void
  setInitialBronzeFact: (fact: BronzeFact | null) => void
}

export const useOnboardingFlow = ({
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
}: UseOnboardingFlowProps) => {
  const hasInitialized = useRef(false)

  // Initialize chat
  const initializeChat = async () => {
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
      // Store for later reference when showing reaction messages
      setInitialBronzeFact(bronzeFact)

      const reachValue = bronzeFact.metric_value || 0

      // Queue Bronze card with context-appropriate follow-up
      if (reachValue === 0) {
        // No reach - don't ask about clicks, suggest connecting another platform or exploring features
        queueMessages([
          { type: 'bronze-card', bronzeFact },
          { type: 'mia', content: "Looks like there hasn't been much activity recently." },
          { type: 'mia', content: "No worries! This could mean your campaigns are paused, or we just need to look at a different time period." },
          {
            type: 'mia',
            content: "Let me show you what I can help with:",
            choices: [
              { label: "Show me", action: "show_explainers", variant: 'primary' },
              { label: "Manage Integrations", action: "go_integrations", variant: 'secondary' }
            ]
          }
        ])
      } else {
        // Has reach - ask about clicks
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
      }
    } else {
      // No Bronze data - offer to go to Integrations or continue
      queueMessages([
        { type: 'mia', content: "I couldn't find any recent campaign data for this account." },
        { type: 'mia', content: "This might mean your campaigns haven't run recently, or you need to connect a different platform." },
        {
          type: 'mia',
          content: "What would you like to do?",
          choices: [
            { label: "Manage Integrations", action: "go_integrations", variant: 'primary' },
            { label: "Continue anyway", action: "show_explainers", variant: 'secondary' }
          ]
        }
      ])
    }

    await advanceStep()
  }

  // Initialize chat on mount
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

  return {
    initializeChat,
  }
}
