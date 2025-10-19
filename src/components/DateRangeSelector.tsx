import { useState, useEffect } from 'react'

interface DateRangeSelectorProps {
  isOpen: boolean
  onClose: () => void
  selectedRange: string
  onApply: (range: string) => void
}

const DATE_RANGE_OPTIONS = [
  { value: '7_days', label: 'Last 7 days' },
  { value: '14_days', label: 'Last 14 days' },
  { value: '30_days', label: 'Last 30 days' },
  { value: '90_days', label: 'Last 90 days' }
]

const DateRangeSelector = ({ isOpen, onClose, selectedRange, onApply }: DateRangeSelectorProps) => {
  const [tempSelection, setTempSelection] = useState(selectedRange)

  // Sync temp selection when selectedRange changes (from parent)
  useEffect(() => {
    setTempSelection(selectedRange)
  }, [selectedRange])

  if (!isOpen) return null

  const handleApply = () => {
    onApply(tempSelection)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div className="fixed top-16 right-4 bg-white rounded-lg shadow-xl z-50 w-48 overflow-hidden">
        {DATE_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setTempSelection(option.value)}
            className={`w-full px-4 py-3 text-left text-sm transition-colors ${
              tempSelection === option.value
                ? 'bg-purple-50 text-purple-900 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {option.label}
            {tempSelection === option.value && (
              <span className="float-right text-purple-600">✓</span>
            )}
          </button>
        ))}

        {/* Apply Button */}
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={handleApply}
            className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  )
}

export default DateRangeSelector
