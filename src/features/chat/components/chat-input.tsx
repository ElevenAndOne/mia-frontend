import { useState, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { DateRangePopover } from './date-range-sheet'
import PlatformSelector from './platform-selector'
import { Icon } from '../../../components/icon'
import type { Platform } from '../types'

interface ChatInputProps {
  onSubmit: (message: string) => void
  disabled?: boolean
  placeholder?: string
  dateRange: string
  onDateRangeChange: (range: string) => void
  platforms: Platform[]
  selectedPlatforms: string[]
  onPlatformToggle: (platformId: string) => void
  hasSelectedPlatforms?: boolean
}

export const ChatInput = ({ onSubmit, disabled = false, placeholder = 'Start chatting...', dateRange, onDateRangeChange, platforms, selectedPlatforms, onPlatformToggle, hasSelectedPlatforms = false }: ChatInputProps) => {
  const [message, setMessage] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPlatformSelector, setShowPlatformSelector] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const calendarButtonRef = useRef<HTMLButtonElement>(null)
  const platformButtonRef = useRef<HTMLButtonElement>(null)

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSubmit(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // FEB 2026: Removed auto-focus on mount - bad UX on mobile
  // Opens keyboard immediately when page loads, taking up screen space
  // User can tap input when they want to type

  const canSubmit = message.trim() && !disabled && hasSelectedPlatforms

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 md:pb-6">
      {/* Main input container */}
      <div className="bg-tertiary rounded-2xl overflow-visible">
        {/* Text input row */}
        <div className="px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent outline-none text-primary placeholder:text-placeholder paragraph-md"
          />
        </div>

        {/* Toolbar row */}
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1 relative">
            {/* Calendar button */}
            <button
              ref={calendarButtonRef}
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-10 h-10 rounded-full bg-quaternary flex items-center justify-center text-tertiary hover:bg-tertiary transition-colors"
              title="Select date range"
            >
              <Icon.calendar size={18} />
            </button>

            <DateRangePopover
              isOpen={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              anchorRef={calendarButtonRef}
              selectedRange={dateRange}
              onSelect={onDateRangeChange}
            />

            {/* Platform selector button */}
            <div className="relative">
              <button
                ref={platformButtonRef}
                type="button"
                onClick={() => setShowPlatformSelector(!showPlatformSelector)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  hasSelectedPlatforms
                    ? 'bg-brand-solid text-primary-onbrand'
                    : 'bg-quaternary text-tertiary hover:bg-tertiary'
                }`}
                title="Select platforms"
              >
                <Icon.tool_01 size={18} />
              </button>

              <PlatformSelector
                isOpen={showPlatformSelector}
                onClose={() => setShowPlatformSelector(false)}
                platforms={platforms}
                selectedPlatforms={selectedPlatforms}
                onToggle={onPlatformToggle}
                anchorRef={platformButtonRef}
              />
            </div>

          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              canSubmit
                ? 'bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover'
                : 'bg-quaternary text-placeholder-subtle cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Icon.arrow_right size={18} />
          </button>
        </div>
      </div>

    </div>
  )
}

export default ChatInput
