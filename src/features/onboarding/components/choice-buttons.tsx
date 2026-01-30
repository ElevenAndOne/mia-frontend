import type { ChoiceOption } from '../onboarding-chat-types'

interface ChoiceButtonsProps {
  choices: ChoiceOption[]
  onSelect?: (action: string) => void
  className?: string
}

export const ChoiceButtons = ({ choices, onSelect, className = '' }: ChoiceButtonsProps) => (
  <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
    {choices.map((choice, idx) => (
      <button
        key={`${choice.action}-${idx}`}
        type="button"
        onClick={() => onSelect?.(choice.action)}
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
)
