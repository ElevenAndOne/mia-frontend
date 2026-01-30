import { useState, useEffect, useRef } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format } from 'date-fns'
import { useEscapeKey, useClickOutside, OverlayPortal } from '../features/overlay'

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
  { value: 'custom', label: 'Custom range' },
]

const DateRangeSelector = ({ isOpen, onClose, selectedRange, onApply }: DateRangeSelectorProps) => {
  const [tempSelection, setTempSelection] = useState(selectedRange)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const panelRef = useRef<HTMLDivElement>(null)

  // Use overlay hooks for consistent behavior
  useEscapeKey(onClose, isOpen)
  useClickOutside([panelRef], onClose, isOpen)

  // Sync temp selection when selectedRange changes (from parent)
  useEffect(() => {
    setTempSelection(selectedRange)
    // If selectedRange is custom format (YYYY-MM-DD_YYYY-MM-DD), parse it
    if (selectedRange.includes('_') && selectedRange.match(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/)) {
      const [start, end] = selectedRange.split('_')
      setDateRange({ from: new Date(start), to: new Date(end) })
      setShowCustomPicker(true)
    } else {
      setDateRange(undefined)
    }
  }, [selectedRange])

  if (!isOpen) return null

  const handleOptionClick = (value: string) => {
    setTempSelection(value)
    if (value === 'custom') {
      setShowCustomPicker(true)
      // Set default dates (today and 30 days ago) if no range selected
      if (!dateRange?.from || !dateRange?.to) {
        const today = new Date()
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(today.getDate() - 30)
        setDateRange({ from: thirtyDaysAgo, to: today })
      }
    } else {
      setShowCustomPicker(false)
    }
  }

  const handleApply = () => {
    if (tempSelection === 'custom' && dateRange?.from && dateRange?.to) {
      // Format: YYYY-MM-DD_YYYY-MM-DD
      const startStr = format(dateRange.from, 'yyyy-MM-dd')
      const endStr = format(dateRange.to, 'yyyy-MM-dd')
      onApply(`${startStr}_${endStr}`)
    } else {
      onApply(tempSelection)
    }
    onClose()
    setShowCustomPicker(false)
  }

  return (
    <OverlayPortal>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20" style={{ zIndex: 1200 }} onClick={onClose} />

      {/* Dropdown */}
      <div
        ref={panelRef}
        className={`fixed top-16 right-4 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[75vh] transition-all ${showCustomPicker ? 'w-80' : 'w-64'}`}
        style={{ zIndex: 1300 }}
      >
        {DATE_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleOptionClick(option.value)}
            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
              tempSelection === option.value
                ? 'bg-purple-50 text-purple-900 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {option.label}
            {tempSelection === option.value && <span className="float-right text-purple-600">✓</span>}
          </button>
        ))}

        {/* Custom Date Picker */}
        {showCustomPicker && (
          <div className="border-t border-gray-200 p-3">
            <p className="text-xs font-medium text-gray-700 mb-3">Select date range</p>
            <div className="rdp-custom-wrapper">
              <DayPicker
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                disabled={{ after: new Date() }}
                captionLayout="dropdown"
                classNames={{
                  months: 'flex flex-col',
                  month: 'space-y-4',
                  caption: 'flex justify-center pt-1 relative items-center mb-2',
                  caption_label: 'text-sm font-medium',
                  nav: 'hidden', // Hide navigation arrows since we have dropdowns
                  table: 'w-full border-collapse space-y-1',
                  head_row: 'flex',
                  head_cell: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem]',
                  row: 'flex w-full mt-2',
                  cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-purple-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                  day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md',
                  day_selected:
                    'bg-purple-600 text-white hover:bg-purple-600 hover:text-white focus:bg-purple-600 focus:text-white',
                  day_today: 'bg-gray-100 text-gray-900',
                  day_outside: 'text-gray-400 opacity-50',
                  day_disabled: 'text-gray-400 opacity-50',
                  day_range_middle: 'aria-selected:bg-purple-100 aria-selected:text-purple-900',
                  day_hidden: 'invisible',
                }}
              />
            </div>
            {dateRange?.from && dateRange?.to && (
              <div className="mt-3 text-xs text-gray-600 bg-purple-50 p-2 rounded">
                <strong>Selected:</strong> {format(dateRange.from, 'MMM d, yyyy')} -{' '}
                {format(dateRange.to, 'MMM d, yyyy')}
              </div>
            )}
          </div>
        )}

        {/* Apply Button */}
        <div className="border-t border-gray-200 p-2" style={{ paddingBottom: '1rem' }}>
          <button
            onClick={handleApply}
            disabled={showCustomPicker && (!dateRange?.from || !dateRange?.to)}
            className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </div>
    </OverlayPortal>
  )
}

export default DateRangeSelector
