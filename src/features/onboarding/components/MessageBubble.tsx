/**
 * MessageBubble - Message bubble component for chat
 *
 * Renders different types of messages in the onboarding chat:
 * - Mia messages (with optional inline choices)
 * - User messages
 * - Bronze cards
 * - Explainer boxes
 * - Insight cards
 * - Choice buttons
 */

import React from 'react'
import { motion } from 'framer-motion'
import { ChatMessage } from '../hooks/useMessageQueue'
import { BronzeCardV2 } from './BronzeCardV2'
import { ExplainerBox } from './ExplainerBox'
import { InsightCardPreview } from './InsightCardPreview'

export interface MessageBubbleProps {
  message: ChatMessage
  onChoiceSelect?: (action: string) => void
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onChoiceSelect }) => {
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
    return <InsightCardPreview data={message.insightData} />
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
