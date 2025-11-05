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
  { value: 'custom', label: 'Custom range' }
]

const DateRangeSelector = ({ isOpen, onClose, selectedRange, onApply }: DateRangeSelectorProps) => {
  const [tempSelection, setTempSelection] = useState(selectedRange)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Sync temp selection when selectedRange changes (from parent)
  useEffect(() => {
    setTempSelection(selectedRange)
    // If selectedRange is custom format (YYYY-MM-DD_YYYY-MM-DD), parse it
    if (selectedRange.includes('_') && selectedRange.match(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/)) {
      const [start, end] = selectedRange.split('_')
      setCustomStartDate(start)
      setCustomEndDate(end)
      setShowCustomPicker(true)
    }
  }, [selectedRange])

  if (!isOpen) return null

  const handleOptionClick = (value: string) => {
    setTempSelection(value)
    if (value === 'custom') {
      setShowCustomPicker(true)
      // Set default dates (today and 30 days ago)
      const today = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(today.getDate() - 30)
      if (!customStartDate) setCustomStartDate(thirtyDaysAgo.toISOString().split('T')[0])
      if (!customEndDate) setCustomEndDate(today.toISOString().split('T')[0])
    } else {
      setShowCustomPicker(false)
    }
  }

  const handleApply = () => {
    if (tempSelection === 'custom' && customStartDate && customEndDate) {
      // Format: YYYY-MM-DD_YYYY-MM-DD
      onApply(`${customStartDate}_${customEndDate}`)
    } else {
      onApply(tempSelection)
    }
    onClose()
    setShowCustomPicker(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div className="fixed top-16 right-4 bg-white rounded-lg shadow-xl z-50 w-64 overflow-hidden">
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

        {/* Custom Date Picker */}
        {showCustomPicker && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={customEndDate || new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {/* Apply Button */}
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={handleApply}
            disabled={showCustomPicker && (!customStartDate || !customEndDate)}
            className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  )
}

export default DateRangeSelector
