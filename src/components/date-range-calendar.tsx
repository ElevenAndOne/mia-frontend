import { DayPicker, type DateRange, type Matcher } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

interface DateRangeCalendarProps {
  selected: DateRange | undefined
  onSelect: (range: DateRange | undefined) => void
  disabled?: Matcher | Matcher[]
  numberOfMonths?: number
  className?: string
}

const CLASSNAMES = {
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
}

export const DateRangeCalendar = ({
  selected,
  onSelect,
  disabled = { after: new Date() },
  numberOfMonths = 1,
  className = '',
}: DateRangeCalendarProps) => {
  return (
    <DayPicker
      mode="range"
      selected={selected}
      onSelect={onSelect}
      numberOfMonths={numberOfMonths}
      disabled={disabled}
      captionLayout="dropdown"
      classNames={CLASSNAMES}
      className={className}
    />
  )
}
