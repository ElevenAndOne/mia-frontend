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
        className={`px-4 py-2 rounded-full subheading-md transition-colors ${
          choice.variant === 'primary'
            ? 'bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover'
            : 'bg-primary text-primary border border-primary hover:bg-secondary'
        }`}
      >
        {choice.label}
      </button>
    ))}
  </div>
)
