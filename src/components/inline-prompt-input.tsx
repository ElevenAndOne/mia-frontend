import { useState } from 'react'

interface InlinePromptInputProps {
  label?: string
  placeholder?: string
  ctaLabel?: string
  loadingCtaLabel?: string
  isSubmitting?: boolean
  onSubmit: (value: string) => void | Promise<void>
}

export const InlinePromptInput = ({
  label,
  placeholder,
  ctaLabel = 'Continue',
  loadingCtaLabel = 'Saving...',
  isSubmitting = false,
  onSubmit
}: InlinePromptInputProps) => {
  const [value, setValue] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setLocalError('Please enter a value to continue.')
      return
    }
    setLocalError(null)
    await onSubmit(trimmed)
    setValue('')
  }

  return (
    <div className="bg-tertiary text-primary px-4 py-3 rounded-2xl max-w-[85%] w-full sm:w-fit sm:min-w-[320px]">
      {label ? <p className="paragraph-sm mb-2">{label}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            if (localError) {
              setLocalError(null)
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !isSubmitting) {
              void handleSubmit()
            }
          }}
          placeholder={placeholder}
          disabled={isSubmitting}
          className="w-full sm:w-72 rounded-xl px-3 py-2 border border-secondary bg-primary text-primary paragraph-sm focus:outline-none focus:ring-2 focus:ring-brand-solid"
        />
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => {
            void handleSubmit()
          }}
          className="px-4 py-2 rounded-xl bg-brand-solid text-primary-onbrand subheading-md disabled:opacity-50"
        >
          {isSubmitting ? loadingCtaLabel : ctaLabel}
        </button>
      </div>
      {localError ? <p className="paragraph-xs text-error mt-2">{localError}</p> : null}
    </div>
  )
}
