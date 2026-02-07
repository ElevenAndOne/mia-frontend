import { motion } from 'framer-motion'
import { Icon } from '../../../components/icon'
import { InlinePromptInput } from '../../../components/inline-prompt-input'
import { useClipboard } from '../../../hooks/use-clipboard'
import { useShareText } from '../../../hooks/use-share-text'
import type { ChatMessage } from '../onboarding-chat-types'
import { BronzeCard } from './bronze-card'
import { ChoiceButtons } from './choice-buttons'
import { ExplainerBox } from './explainer-box'
import { InsightCard } from './insight-card'

interface MessageBubbleProps {
  message: ChatMessage
  onChoiceSelect?: (action: string) => void
  onInputSubmit?: (promptKey: string, value: string) => void
  isInputSubmitting?: boolean
}

export const MessageBubble = ({ message, onChoiceSelect, onInputSubmit, isInputSubmitting }: MessageBubbleProps) => {
  const { copied, copy } = useClipboard()
  const { share } = useShareText()

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

  if (message.type === 'input-prompt' && message.inputPromptKey) {
    const promptKey = message.inputPromptKey
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
        <InlinePromptInput
          label={message.inputPromptLabel}
          placeholder={message.inputPromptPlaceholder}
          ctaLabel={message.inputPromptCta}
          loadingCtaLabel={message.inputPromptLoadingCta}
          isSubmitting={isInputSubmitting}
          onSubmit={(value) => onInputSubmit?.(promptKey, value)}
        />
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
      <div className="bg-tertiary text-primary px-4 py-2 rounded-2xl max-w-[85%] w-fit">
        <p className="paragraph-sm whitespace-pre-wrap">{message.content}</p>
      </div>

      {message.type === 'mia' && message.content ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              void copy(message.content || '')
            }}
            className="p-1.5 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
            title={copied ? 'Copied' : 'Copy'}
            aria-label="Copy message"
          >
            {copied ? <Icon.check size={14} /> : <Icon.copy_01 size={14} />}
          </button>
          <button
            type="button"
            onClick={() => {
              void share(message.content || '')
            }}
            className="p-1.5 rounded-lg hover:bg-tertiary text-quaternary hover:text-secondary transition-colors"
            title="Share"
            aria-label="Share message"
          >
            <Icon.share_01 size={14} />
          </button>
        </div>
      ) : null}

      {message.choices && message.choices.length > 0 && (
        <ChoiceButtons choices={message.choices} onSelect={onChoiceSelect} className="mt-1" />
      )}
    </motion.div>
  )
}
