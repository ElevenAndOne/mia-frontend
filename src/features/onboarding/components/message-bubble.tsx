import { motion } from 'framer-motion'
import type { ChatMessage } from '../onboarding-chat-types'
import { BronzeCard } from './bronze-card'
import { ChoiceButtons } from './choice-buttons'
import { ExplainerBox } from './explainer-box'
import { InsightCard } from './insight-card'

interface MessageBubbleProps {
  message: ChatMessage
  onChoiceSelect?: (action: string) => void
}

export const MessageBubble = ({ message, onChoiceSelect }: MessageBubbleProps) => {
  if (message.type === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="bg-brand-solid text-primary-onbrand px-4 py-2 rounded-2xl max-w-[80%]">
          <p className="paragraph-sm">{message.content}</p>
        </div>
      </motion.div>
    )
  }

  if (message.type === 'bronze-card' && message.bronzeCard) {
    return <BronzeCard {...message.bronzeCard} />
  }

  if (message.type === 'explainer-box' && message.explainerType) {
    return <ExplainerBox type={message.explainerType} />
  }

  if (message.type === 'insight-card' && message.insightData) {
    return <InsightCard data={message.insightData} />
  }

  if (message.type === 'choice-buttons' && message.choices) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <ChoiceButtons choices={message.choices} onSelect={onChoiceSelect} />
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
      <div className="bg-tertiary text-primary px-4 py-2 rounded-2xl max-w-[85%] w-fit">
        <p className="paragraph-sm whitespace-pre-wrap">{message.content}</p>
      </div>

      {message.choices && message.choices.length > 0 && (
        <ChoiceButtons choices={message.choices} onSelect={onChoiceSelect} className="mt-1" />
      )}
    </motion.div>
  )
}
