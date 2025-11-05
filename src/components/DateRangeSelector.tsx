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
  { value: '90_days', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom Range' }
]

const DateRangeSelector = ({ isOpen, onClose, selectedRange, onApply }: DateRangeSelectorProps) => {
  const [tempSelection, setTempSelection] = useState(selectedRange)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Sync temp selection when selectedRange changes (from parent)
  useEffect(() => {
    setTempSelection(selectedRange)
    // Parse custom range if it exists
    if (selectedRange.includes('_')) {
      const parts = selectedRange.split('_')
      if (parts.length === 2 && parts[0].match(/\d{4}-\d{2}-\d{2}/)) {
        setCustomStartDate(parts[0])
        setCustomEndDate(parts[1])
      }
    }
  }, [selectedRange])

  if (!isOpen) return null

  const handleApply = () => {
    if (tempSelection === 'custom' && customStartDate && customEndDate) {
      // Format as YYYY-MM-DD_YYYY-MM-DD
      onApply(`${customStartDate}_${customEndDate}`)
    } else if (tempSelection !== 'custom') {
      onApply(tempSelection)
    }
    onClose()
    setShowCustomPicker(false)
  }

  const handleOptionClick = (value: string) => {
    if (value === 'custom') {
      setShowCustomPicker(true)
      setTempSelection(value)
    } else {
      setTempSelection(value)
      setShowCustomPicker(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={() => {
          onClose()
          setShowCustomPicker(false)
        }}
      />

      {/* Dropdown */}
      <div className="fixed top-16 right-4 bg-white rounded-lg shadow-xl z-50 w-64 overflow-hidden">
        {!showCustomPicker ? (
          <>
            {DATE_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
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
          </>
        ) : (
          <>
            {/* Custom Date Range Picker */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Custom Date Range</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowCustomPicker(false)
                    setTempSelection(selectedRange)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleApply}
                  disabled={!customStartDate || !customEndDate}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default DateRangeSelector
