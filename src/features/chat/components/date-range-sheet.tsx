import { type RefObject } from 'react'
import { Popover } from '../../overlay'
import { Radio } from '../../../components/radio'
import { CHAT_DATE_RANGE_OPTIONS, formatRangeSpan, parseDateRangeValue } from '../../../utils/date-range'

interface DateRangePopoverProps {
  isOpen: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLButtonElement | null>
  selectedRange: string
  onSelect: (range: string) => void
}

export const DateRangePopover = ({ isOpen, onClose, anchorRef, selectedRange, onSelect }: DateRangePopoverProps) => {
  const handleSelect = (value: string) => {
    onSelect(value)
    onClose()
  }

  return (
    <Popover isOpen={isOpen} onClose={onClose} anchorRef={anchorRef} placement="top-start" className="min-w-[240px]" mobileAdaptation="none" >
      <div className="flex flex-col p-1 gap-0.5">
        {CHAT_DATE_RANGE_OPTIONS.map((option) => (
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

function DateRangeItem({ option, active, onClick }: { option: { label: string; value: string }, active: boolean, onClick: () => void }) {
  const parsed = parseDateRangeValue(option.value)
  const rangeLabel = parsed ? formatRangeSpan(parsed.start, parsed.end) : ''

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${active ? 'bg-tertiary' : 'hover:bg-secondary'
        }`}
    >
      <div className="text-left">
        <div className="subheading-md text-primary">{option.label}</div>
        <div className="paragraph-xs text-quaternary">{rangeLabel}</div>
      </div>

      {/* Radio indicator */}
      <Radio active={active} />
    </button>
  )
}


// Keep backward compatible export name
export const DateRangeSheet = DateRangePopover
export default DateRangePopover
