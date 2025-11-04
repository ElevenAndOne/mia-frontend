import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

const InsightsDatePickerModal = ({ isOpen, onClose, onGenerate, insightType }: InsightsDatePickerModalProps) => {
  const [selectedRange, setSelectedRange] = useState('30_days')
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  const handleRangeSelect = (value: string) => {
    setSelectedRange(value)
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

  const handleGenerate = () => {
    if (selectedRange === 'custom' && customStartDate && customEndDate) {
      onGenerate(`${customStartDate}_${customEndDate}`)
    } else {
      onGenerate(selectedRange)
    }
  }

  const isGenerateDisabled = selectedRange === 'custom' && (!customStartDate || !customEndDate)

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
              <div className="border-t border-gray-200 pt-4 mb-6 space-y-3">
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
