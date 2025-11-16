import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DayPicker, DateRange, CaptionProps } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format } from 'date-fns'

interface InsightsDatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (dateRange: string) => void
  insightType: 'grow' | 'optimize' | 'protect'
}

const DATE_RANGE_OPTIONS = [
  { value: '7_days', label: 'Last 7 days' },
  { value: '14_days', label: 'Last 14 days' },
  { value: '30_days', label: 'Last 30 days' },
  { value: '90_days', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' }
]

const INSIGHT_TITLES = {
  grow: 'Grow Insights',
  optimize: 'Optimize Insights',
  protect: 'Protect Insights'
}

const INSIGHT_DESCRIPTIONS = {
  grow: 'Discover opportunities to scale your best-performing campaigns and creatives',
  optimize: 'Identify inefficiencies and improve ROI across your marketing channels',
  protect: 'Safeguard your high-performing campaigns from potential risks'
}

// Custom caption component with month/year dropdowns
function CustomCaption(props: CaptionProps) {
  const { displayMonth } = props
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 9 + i)
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value)
    const newDate = new Date(displayMonth.getFullYear(), newMonth, 1)
    props.onMonthChange?.(newDate)
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value)
    const newDate = new Date(newYear, displayMonth.getMonth(), 1)
    props.onMonthChange?.(newDate)
  }

  return (
    <div className="flex justify-center gap-2 pb-2">
      <select
        value={displayMonth.getMonth()}
        onChange={handleMonthChange}
        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {months.map((month, index) => (
          <option key={month} value={index}>
            {month}
          </option>
        ))}
      </select>
      <select
        value={displayMonth.getFullYear()}
        onChange={handleYearChange}
        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  )
}

const InsightsDatePickerModal = ({ isOpen, onClose, onGenerate, insightType }: InsightsDatePickerModalProps) => {
  const [selectedRange, setSelectedRange] = useState('30_days')
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const handleRangeSelect = (value: string) => {
    setSelectedRange(value)
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

  const handleGenerate = () => {
    if (selectedRange === 'custom' && dateRange?.from && dateRange?.to) {
      const startStr = format(dateRange.from, 'yyyy-MM-dd')
      const endStr = format(dateRange.to, 'yyyy-MM-dd')
      onGenerate(`${startStr}_${endStr}`)
    } else {
      onGenerate(selectedRange)
    }
  }

  const isGenerateDisabled = selectedRange === 'custom' && (!dateRange?.from || !dateRange?.to)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {INSIGHT_TITLES[insightType]}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {INSIGHT_DESCRIPTIONS[insightType]}
              </p>
            </div>

            {/* Date Range Selection */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select analysis period
              </label>
              {DATE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleRangeSelect(option.value)}
                  className={`w-full px-4 py-3 text-left rounded-lg border-2 transition-all ${
                    selectedRange === option.value
                      ? 'border-purple-600 bg-purple-50 text-purple-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option.label}</span>
                    {selectedRange === option.value && (
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Date Picker */}
            {showCustomPicker && (
              <div className="border-t border-gray-200 pt-4 mb-6">
                <p className="text-xs font-medium text-gray-700 mb-3">
                  Select date range
                </p>
                <div className="flex justify-center">
                  <DayPicker
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    disabled={{ after: new Date() }}
                    captionLayout="dropdown"
                    components={{
                      Caption: CustomCaption
                    }}
                    classNames={{
                      months: "flex flex-col",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center mb-2",
                      caption_label: "text-sm font-medium",
                      nav: "hidden",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-purple-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md",
                      day_selected: "bg-purple-600 text-white hover:bg-purple-600 hover:text-white focus:bg-purple-600 focus:text-white",
                      day_today: "bg-gray-100 text-gray-900",
                      day_outside: "text-gray-400 opacity-50",
                      day_disabled: "text-gray-400 opacity-50",
                      day_range_middle: "aria-selected:bg-purple-100 aria-selected:text-purple-900",
                      day_hidden: "invisible",
                    }}
                  />
                </div>
                {dateRange?.from && dateRange?.to && (
                  <div className="mt-3 text-xs text-gray-600 bg-purple-50 p-2 rounded text-center">
                    <strong>Selected:</strong> {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            )}

            {/* Helper Text */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-6">
              <p className="text-xs text-purple-800">
                💡 Choose a date range with active campaign data for the most relevant insights.
                You can change the date range anytime after generating insights.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerateDisabled}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Generate Insights
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default InsightsDatePickerModal
