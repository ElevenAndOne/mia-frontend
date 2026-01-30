import { useMemo, type RefObject } from 'react'
import { Popover } from '../../overlay'
import { Radio } from '../../../components/radio'

interface DateRangeOption {
  id: string
  label: string
  value: string
  getDateRange: () => { start: Date; end: Date }
}

interface DateRangePopoverProps {
  isOpen: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLButtonElement | null>
  selectedRange: string
  onSelect: (range: string) => void
}

export const DateRangePopover = ({ isOpen, onClose, anchorRef, selectedRange, onSelect }: DateRangePopoverProps) => {
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

  const handleSelect = (value: string) => {
    onSelect(value)
    onClose()
  }

  return (
    <Popover isOpen={isOpen} onClose={onClose} anchorRef={anchorRef} placement="top-start" className="min-w-[240px]" mobileAdaptation="none" >
      <div className="flex flex-col p-1 gap-0.5">
        {dateOptions.map((option) => (
          <DateRangeItem
            key={option.id}
            option={option}
            active={selectedRange === option.value}
            onClick={() => handleSelect(option.value)}
          />
        ))}
      </div>
    </Popover>
  )
}

function DateRangeItem({ option, active, onClick }: { option: DateRangeOption, active: boolean, onClick: () => void }) {
  const formatDateRange = (option: DateRangeOption): string => {
    const { start, end } = option.getDateRange()
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return `${formatDate(start)} - ${formatDate(end)}`
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${active ? 'bg-gray-100' : 'hover:bg-gray-50'
        }`}
    >
      <div className="text-left">
        <div className="font-medium text-gray-900 text-sm">{option.label}</div>
        <div className="text-xs text-gray-500">{formatDateRange(option)}</div>
      </div>

      {/* Radio indicator */}
      <Radio active={active} />
    </button>
  )
}


// Keep backward compatible export name
export const DateRangeSheet = DateRangePopover
export default DateRangePopover
