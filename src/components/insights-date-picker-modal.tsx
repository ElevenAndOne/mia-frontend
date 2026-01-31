import { useState, useRef, useId, useEffect } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { OverlayPortal, useEscapeKey, useClickOutside, useOverlayContext } from '../features/overlay'

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
  { value: 'custom', label: 'Custom range' },
]

const INSIGHT_TITLES = {
  grow: 'Grow Insights',
  optimize: 'Optimize Insights',
  protect: 'Protect Insights',
}

const INSIGHT_DESCRIPTIONS = {
  grow: 'Discover opportunities to scale your best-performing campaigns and creatives',
  optimize: 'Identify inefficiencies and improve ROI across your marketing channels',
  protect: 'Safeguard your high-performing campaigns from potential risks',
}

const InsightsDatePickerModal = ({ isOpen, onClose, onGenerate, insightType }: InsightsDatePickerModalProps) => {
  const [selectedRange, setSelectedRange] = useState('30_days')
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const panelRef = useRef<HTMLDivElement>(null)
  const { registerOverlay, unregisterOverlay, getZIndex } = useOverlayContext()
  const overlayId = useId()

  // Register/unregister overlay for stacking management
  useEffect(() => {
    if (isOpen) {
      registerOverlay(overlayId)
      return () => unregisterOverlay(overlayId)
    }
  }, [isOpen, overlayId, registerOverlay, unregisterOverlay])

  // Use overlay hooks for consistent behavior
  useEscapeKey(onClose, isOpen)
  useClickOutside([panelRef], onClose, isOpen)

  const zIndex = getZIndex(overlayId)

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
        <OverlayPortal>
          {/* Centered floating panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary rounded-2xl shadow-2xl border border-secondary w-full max-w-md max-h-[85vh] overflow-y-auto"
            style={{ zIndex: zIndex + 1 }}
          >
            <div className="p-4">
              {/* Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="title-h6 text-primary">{INSIGHT_TITLES[insightType]}</h2>
                  <button onClick={onClose} className="text-placeholder-subtle hover:text-tertiary transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="paragraph-sm text-tertiary">{INSIGHT_DESCRIPTIONS[insightType]}</p>
              </div>

              {/* Date Range Selection */}
              <div className="space-y-2 mb-4">
                <label className="block subheading-md text-secondary mb-3">Select analysis period</label>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleRangeSelect(option.value)}
                    className={`w-full px-3 py-2 text-left rounded-lg border-2 transition-all ${
                      selectedRange === option.value
                        ? 'border-utility-purple-600 bg-utility-purple-100 text-utility-purple-700 subheading-md'
                        : 'border-secondary hover:border-primary text-secondary paragraph-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="subheading-md">{option.label}</span>
                      {selectedRange === option.value && (
                        <svg className="w-5 h-5 text-utility-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Date Picker */}
              {showCustomPicker && (
                <div className="border-t border-secondary pt-3 mb-3">
                  <p className="subheading-sm text-secondary mb-3">Select date range</p>
                  <div className="flex justify-center">
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
                        nav: 'hidden',
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
                    <div className="mt-3 paragraph-xs text-tertiary bg-utility-purple-100 p-2 rounded text-center">
                      <strong>Selected:</strong> {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              )}

              {/* Helper Text */}
              <div className="bg-utility-purple-100 border border-utility-purple-300 rounded-lg p-2 mb-3">
                <p className="paragraph-xs text-utility-purple-700">
                  Choose a date range with active campaign data for the most relevant insights. You can change the date range
                  anytime after generating insights.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-3 py-2 subheading-md text-secondary bg-tertiary rounded-lg hover:bg-quaternary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerateDisabled}
                  className="flex-1 px-3 py-2 subheading-md bg-utility-purple-600 text-primary-onbrand rounded-lg hover:bg-utility-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Insights
                </button>
              </div>
            </div>
          </motion.div>
        </OverlayPortal>
      )}
    </AnimatePresence>
  )
}

export default InsightsDatePickerModal
