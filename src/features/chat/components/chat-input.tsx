import { useState, useRef, useEffect } from 'react'
import type { KeyboardEvent } from 'react'
import DateRangeSheet from './date-range-sheet'
import PlatformSelector from './platform-selector'

interface Platform {
  id: string
  name: string
  icon: string
  connected: boolean
}

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

export const ChatInput = ({
  onSubmit,
  disabled = false,
  placeholder = 'Start chatting...',
  dateRange,
  onDateRangeChange,
  platforms,
  selectedPlatforms,
  onPlatformToggle,
  hasSelectedPlatforms = false
}: ChatInputProps) => {
  const [message, setMessage] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPlatformSelector, setShowPlatformSelector] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const canSubmit = message.trim() && !disabled && hasSelectedPlatforms

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 md:pb-6">
      {/* Main input container */}
      <div className="bg-gray-100 rounded-2xl overflow-visible">
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
            className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-500 text-base"
          />
        </div>

        {/* Toolbar row */}
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1 relative">
            {/* Calendar button */}
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors"
              title="Select date range"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>

            {/* Platform selector button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPlatformSelector(!showPlatformSelector)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  hasSelectedPlatforms
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title="Select platforms"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </button>

              <PlatformSelector
                isOpen={showPlatformSelector}
                onClose={() => setShowPlatformSelector(false)}
                platforms={platforms}
                selectedPlatforms={selectedPlatforms}
                onToggle={onPlatformToggle}
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
                ? 'bg-gray-700 text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      {/* Date Range Sheet */}
      <DateRangeSheet
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedRange={dateRange}
        onSelect={onDateRangeChange}
      />
    </div>
  )
}

export default ChatInput
