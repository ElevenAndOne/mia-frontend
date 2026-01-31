import { type RefObject } from 'react'
import { Popover } from '../features/overlay'
import { DateRangeCalendar } from './date-range-calendar'
import { useDateRangeSelection } from '../hooks/use-date-range-selection'
import { DEFAULT_DATE_RANGE_OPTIONS, formatRangeSpan } from '../utils/date-range'

interface DateRangeSelectorProps {
  isOpen: boolean
  onClose: () => void
  selectedRange: string
  onApply: (range: string) => void
  anchorRef: RefObject<HTMLElement | null>
}

const DateRangeSelector = ({ isOpen, onClose, selectedRange, onApply, anchorRef }: DateRangeSelectorProps) => {
  const {
    selectedRange: tempSelection,
    showCustomPicker,
    dateRange,
    setDateRange,
    selectRange,
    getResolvedRangeValue,
    isSelectionValid,
  } = useDateRangeSelection({ initialRange: selectedRange, isOpen })

  const handleApply = () => {
    onApply(getResolvedRangeValue())
    onClose()
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
        {DEFAULT_DATE_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => selectRange(option.value)}
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
              <DateRangeCalendar selected={dateRange} onSelect={setDateRange} />
            </div>
            {dateRange?.from && dateRange?.to && (
              <div className="mt-3 paragraph-xs text-tertiary bg-utility-purple-100 p-2 rounded">
                <strong>Selected:</strong> {formatRangeSpan(dateRange.from, dateRange.to, { includeYear: true })}
              </div>
            )}
          </div>
        )}

        {/* Apply Button */}
        <div className="border-t border-secondary p-2">
          <button
            onClick={handleApply}
            disabled={!isSelectionValid}
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
