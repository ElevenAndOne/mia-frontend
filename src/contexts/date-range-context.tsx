import { createContext, useContext, useState } from 'react'
import type { FC, ReactNode } from 'react'

export type DateRangeOption = '7_days' | '30_days' | '90_days' | 'custom'

export interface DateRangeState {
  selectedRange: DateRangeOption
  customStart?: Date
  customEnd?: Date
}

interface DateRangeContextType {
  dateRange: DateRangeState
  setDateRange: (range: DateRangeOption, customStart?: Date, customEnd?: Date) => void
  getDateRangeLabel: () => string
  getDateRangeDays: () => number
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useDateRange = () => {
  const context = useContext(DateRangeContext)
  if (!context) {
    throw new Error('useDateRange must be used within a DateRangeProvider')
  }
  return context
}

interface DateRangeProviderProps {
  children: ReactNode
}

export const DateRangeProvider: FC<DateRangeProviderProps> = ({ children }) => {
  const [dateRange, setDateRangeState] = useState<DateRangeState>({
    selectedRange: '30_days'
  })

  const setDateRange = (range: DateRangeOption, customStart?: Date, customEnd?: Date) => {
    setDateRangeState({
      selectedRange: range,
      customStart,
      customEnd
    })
  }

  const getDateRangeLabel = (): string => {
    switch (dateRange.selectedRange) {
      case '7_days':
        return 'Last 7 days'
      case '30_days':
        return 'Last 30 days'
      case '90_days':
        return 'Last 90 days'
      case 'custom':
        if (dateRange.customStart && dateRange.customEnd) {
          return `${dateRange.customStart.toLocaleDateString()} - ${dateRange.customEnd.toLocaleDateString()}`
        }
        return 'Custom range'
      default:
        return 'Last 30 days'
    }
  }

  const getDateRangeDays = (): number => {
    switch (dateRange.selectedRange) {
      case '7_days':
        return 7
      case '30_days':
        return 30
      case '90_days':
        return 90
      case 'custom':
        if (dateRange.customStart && dateRange.customEnd) {
          const diffTime = Math.abs(dateRange.customEnd.getTime() - dateRange.customStart.getTime())
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        }
        return 30
      default:
        return 30
    }
  }

  return (
    <DateRangeContext.Provider value={{ dateRange, setDateRange, getDateRangeLabel, getDateRangeDays }}>
      {children}
    </DateRangeContext.Provider>
  )
}
