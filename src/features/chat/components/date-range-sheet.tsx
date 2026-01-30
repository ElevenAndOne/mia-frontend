import { useMemo } from 'react'
import { Sheet } from '../../overlay'

interface DateRangeOption {
  id: string
  label: string
  value: string
  getDateRange: () => { start: Date; end: Date }
}

interface DateRangeSheetProps {
  isOpen: boolean
  onClose: () => void
  selectedRange: string
  onSelect: (range: string) => void
}

export const DateRangeSheet = ({ isOpen, onClose, selectedRange, onSelect }: DateRangeSheetProps) => {
  const dateOptions: DateRangeOption[] = useMemo(() => {
    const today = new Date()

    return [
      {
        id: '7_days',
        label: 'Last 7 days',
        value: '7_days',
        getDateRange: () => {
          const start = new Date(today)
          start.setDate(today.getDate() - 7)
          return { start, end: today }
        },
      },
      {
        id: '30_days',
        label: 'Last 30 days',
        value: '30_days',
        getDateRange: () => {
          const start = new Date(today)
          start.setDate(today.getDate() - 30)
          return { start, end: today }
        },
      },
      {
        id: '3_months',
        label: 'Last 3 months',
        value: '90_days',
        getDateRange: () => {
          const start = new Date(today)
          start.setMonth(today.getMonth() - 3)
          return { start, end: today }
        },
      },
      {
        id: '6_months',
        label: 'Last 6 months',
        value: '180_days',
        getDateRange: () => {
          const start = new Date(today)
          start.setMonth(today.getMonth() - 6)
          return { start, end: today }
        },
      },
      {
        id: '1_year',
        label: 'Last year',
        value: '365_days',
        getDateRange: () => {
          const start = new Date(today)
          start.setFullYear(today.getFullYear() - 1)
          return { start, end: today }
        },
      },
    ]
  }, [])

  const formatDateRange = (option: DateRangeOption): string => {
    const { start, end } = option.getDateRange()
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return `${formatDate(start)} - ${formatDate(end)}`
  }

  const handleSelect = (value: string) => {
    onSelect(value)
    onClose()
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose} position="bottom" showHandle className="max-h-[70vh]">
      {/* Options */}
      <div className="px-4 pb-8">
        {dateOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.value)}
            className={`w-full flex items-center justify-between py-4 px-2 rounded-lg transition-colors ${
              selectedRange === option.value ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-left">
              <div className="font-medium text-gray-900">{option.label}</div>
              <div className="text-sm text-gray-500">{formatDateRange(option)}</div>
            </div>

            {/* Radio indicator */}
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedRange === option.value ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
              }`}
            >
              {selectedRange === option.value && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

export default DateRangeSheet
