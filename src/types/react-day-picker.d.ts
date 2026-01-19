/**
 * Type declarations for react-day-picker v9
 * Workaround for module resolution issue where TypeScript can't find exports
 */

declare module 'react-day-picker' {
  import type { ReactElement } from 'react'

  export interface DateRange {
    from: Date | undefined
    to?: Date | undefined
  }

  export interface DayPickerProps {
    mode?: 'single' | 'multiple' | 'range'
    selected?: Date | Date[] | DateRange | undefined
    onSelect?: (value: DateRange | undefined) => void
    numberOfMonths?: number
    disabled?: { before?: Date; after?: Date } | ((date: Date) => boolean)
    captionLayout?: 'dropdown' | 'buttons' | 'label'
    startMonth?: Date
    endMonth?: Date
    classNames?: Record<string, string>
    defaultMonth?: Date
    month?: Date
    onMonthChange?: (month: Date) => void
    showOutsideDays?: boolean
    fixedWeeks?: boolean
    hideNavigation?: boolean
    pagedNavigation?: boolean
    reverseMonths?: boolean
    fromDate?: Date
    toDate?: Date
    fromMonth?: Date
    toMonth?: Date
    fromYear?: number
    toYear?: number
    locale?: object
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
    ISOWeek?: boolean
    footer?: ReactElement
    modifiers?: Record<string, Date | Date[] | ((date: Date) => boolean)>
    modifiersClassNames?: Record<string, string>
    modifiersStyles?: Record<string, React.CSSProperties>
  }

  export function DayPicker(props: DayPickerProps): ReactElement
}
