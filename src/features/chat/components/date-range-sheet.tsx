import { useState, type RefObject } from 'react'
import { Popover } from '../../overlay'
import { Radio } from '../../../components/radio'
import { CHAT_DATE_RANGE_OPTIONS, formatRangeSpan, parseDateRangeValue, buildCustomDateRangeValue, isCustomDateRange } from '../../../utils/date-range'

interface DateRangePopoverProps {
  isOpen: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLButtonElement | null>
  selectedRange: string
  onSelect: (range: string) => void
}

export const DateRangePopover = ({ isOpen, onClose, anchorRef, selectedRange, onSelect }: DateRangePopoverProps) => {
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Pre-fill custom inputs when a custom range is already active
  const handleOpenCustom = () => {
    if (isCustomDateRange(selectedRange)) {
      const [s, e] = selectedRange.split('_')
      setCustomStart(s)
      setCustomEnd(e)
    } else {
      setCustomStart('')
      setCustomEnd('')
    }
    setShowCustom(true)
  }

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return
    onSelect(buildCustomDateRangeValue(new Date(customStart), new Date(customEnd)))
    setShowCustom(false)
    onClose()
  }

  const handleSelect = (value: string) => {
    onSelect(value)
    setShowCustom(false)
    onClose()
  }

  const isCustomActive = isCustomDateRange(selectedRange)

  return (
    <Popover isOpen={isOpen} onClose={onClose} anchorRef={anchorRef} placement="top-start" className="min-w-[240px]" mobileAdaptation="none">
      <div className="flex flex-col p-1 gap-0.5">
        {!showCustom ? (
          <>
            {CHAT_DATE_RANGE_OPTIONS.map((option) => (
              <DateRangeItem
                key={option.id}
                option={option}
                active={selectedRange === option.value}
                onClick={() => handleSelect(option.value)}
              />
            ))}

            {/* Custom range option */}
            <button
              onClick={handleOpenCustom}
              className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${isCustomActive ? 'bg-tertiary' : 'hover:bg-secondary'}`}
            >
              <div className="text-left">
                <div className="subheading-md text-primary">Custom range</div>
                {isCustomActive && (
                  <div className="paragraph-xs text-quaternary">
                    {(() => {
                      const parsed = parseDateRangeValue(selectedRange)
                      return parsed ? formatRangeSpan(parsed.start, parsed.end) : ''
                    })()}
                  </div>
                )}
              </div>
              <Radio active={isCustomActive} />
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2 p-1">
            <div className="subheading-md text-primary px-1">Custom date range</div>
            <div className="flex flex-col gap-1.5">
              <label className="paragraph-xs text-secondary px-1">Start date</label>
              <input
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={e => setCustomStart(e.target.value)}
                className="w-full bg-secondary text-primary paragraph-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-brand-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="paragraph-xs text-secondary px-1">End date</label>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={e => setCustomEnd(e.target.value)}
                className="w-full bg-secondary text-primary paragraph-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-brand-primary"
              />
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setShowCustom(false)}
                className="flex-1 py-2 rounded-lg bg-secondary text-secondary paragraph-sm hover:bg-tertiary transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleApplyCustom}
                disabled={!customStart || !customEnd}
                className="flex-1 py-2 rounded-lg bg-brand-primary text-white paragraph-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Apply
              </button>
            </div>
          </div>
        )}
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
      <Radio active={active} />
    </button>
  )
}


// Keep backward compatible export name
export const DateRangeSheet = DateRangePopover
export default DateRangePopover
