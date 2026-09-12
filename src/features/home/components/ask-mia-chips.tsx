import { Edit03 } from '../../../components/icon/edit-03'
import { MessageChatCircle } from '../../../components/icon/message-chat-circle'
import type { BriefChip } from '../types'

interface AskMiaChipsProps {
  chips: BriefChip[]
  onPick: (chip: BriefChip) => void
  disabled?: boolean
}

/**
 * Three "Ask Mia" chips. Each one is a real question about this workspace; tapping sends
 * the prompt as-is and the answer streams in. Stacked on phones, wrapped on desktop.
 */
export const AskMiaChips = ({ chips, onPick, disabled }: AskMiaChipsProps) => {
  if (chips.length === 0) return null
  return (
    <section className="w-full flex flex-col gap-2.5" aria-label="Ask Mia">
      <span className="mia-mono text-primary">Ask Mia</span>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
        {chips.map((chip) => {
          const Icon = chip.write_action ? Edit03 : MessageChatCircle
          return (
            <button
              key={chip.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(chip)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-primary px-4 paragraph-xs font-semibold text-primary hover:bg-secondary active:bg-tertiary disabled:opacity-50 md:w-auto w-full justify-start"
            >
              <Icon size={13} />
              <span className="truncate">{chip.text}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
