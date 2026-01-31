import { useState, useEffect, type RefObject } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format } from 'date-fns'
import { Popover } from '../features/overlay'

interface DateRangeSelectorProps {
  isOpen: boolean
  onClose: () => void
  selectedRange: string
  onApply: (range: string) => void
  anchorRef: RefObject<HTMLElement | null>
}

const DATE_RANGE_OPTIONS = [
  { value: '7_days', label: 'Last 7 days' },
  { value: '14_days', label: 'Last 14 days' },
  { value: '30_days', label: 'Last 30 days' },
  { value: '90_days', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
]

const DateRangeSelector = ({ isOpen, onClose, selectedRange, onApply, anchorRef }: DateRangeSelectorProps) => {
  const [tempSelection, setTempSelection] = useState(selectedRange)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  // Sync temp selection when selectedRange changes (from parent)
  useEffect(() => {
    if (!isOpen) return
    setTempSelection(selectedRange)
    // If selectedRange is custom format (YYYY-MM-DD_YYYY-MM-DD), parse it
    if (selectedRange.includes('_') && selectedRange.match(/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/)) {
      const [start, end] = selectedRange.split('_')
      setDateRange({ from: new Date(start), to: new Date(end) })
      setShowCustomPicker(true)
    } else {
      setDateRange(undefined)
      setShowCustomPicker(false)
    }
  }, [isOpen, selectedRange])

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
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      anchorRef={anchorRef}
      placement="bottom-end"
      className={`max-h-[75vh] ${showCustomPicker ? 'w-80' : 'w-64'}`}
      mobileAdaptation="none"
    >
      <div className="max-h-[75vh] overflow-y-auto">
        {DATE_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleOptionClick(option.value)}
            className={`w-full px-3 py-2 text-left transition-colors ${
              tempSelection === option.value
                ? 'bg-utility-purple-100 text-utility-purple-700 subheading-md'
                : 'text-secondary hover:bg-secondary paragraph-sm'
            }`}
          >
            {option.label}
            {tempSelection === option.value && <span className="float-right text-utility-purple-600">✓</span>}
          </button>
        ))}

        {/* Custom Date Picker */}
        {showCustomPicker && (
          <div className="border-t border-secondary p-3">
            <p className="subheading-sm text-secondary mb-3">Select date range</p>
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
                  caption_label: 'subheading-md',
                  nav: 'hidden', // Hide navigation arrows since we have dropdowns
                  table: 'w-full border-collapse space-y-1',
                  head_row: 'flex',
                  head_cell: 'paragraph-xs text-quaternary rounded-md w-9',
                  row: 'flex w-full mt-2',
                  cell: 'text-center paragraph-sm p-0 relative [&:has([aria-selected])]:bg-utility-purple-200 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                  day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-tertiary rounded-md',
                  day_selected:
                    'bg-utility-purple-600 text-primary-onbrand hover:bg-utility-purple-600 hover:text-primary-onbrand focus:bg-utility-purple-600 focus:text-primary-onbrand',
                  day_today: 'bg-tertiary text-primary',
                  day_outside: 'text-placeholder-subtle opacity-50',
                  day_disabled: 'text-placeholder-subtle opacity-50',
                  day_range_middle: 'aria-selected:bg-utility-purple-200 aria-selected:text-utility-purple-700',
                  day_hidden: 'invisible',
                }}
              />
            </div>
            {dateRange?.from && dateRange?.to && (
              <div className="mt-3 paragraph-xs text-tertiary bg-utility-purple-100 p-2 rounded">
                <strong>Selected:</strong> {format(dateRange.from, 'MMM d, yyyy')} -{' '}
                {format(dateRange.to, 'MMM d, yyyy')}
              </div>
            )}
          </div>
        )}

        {/* Apply Button */}
        <div className="border-t border-secondary p-2">
          <button
            onClick={handleApply}
            disabled={showCustomPicker && (!dateRange?.from || !dateRange?.to)}
            className="w-full px-4 py-2 bg-utility-purple-600 text-primary-onbrand subheading-md rounded-md hover:bg-utility-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </div>
    </Popover>
  )
}

export default DateRangeSelector
