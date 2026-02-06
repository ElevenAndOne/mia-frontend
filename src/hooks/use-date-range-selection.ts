import { useEffect, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { buildCustomDateRangeValue, isCustomDateRange, parseCustomDateRange } from '../utils/date-range'

interface UseDateRangeSelectionParams {
  initialRange: string
  isOpen?: boolean
}

interface UseDateRangeSelectionResult {
  selectedRange: string
  showCustomPicker: boolean
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
  selectRange: (value: string) => void
  setSelectedRange: (value: string) => void
  getResolvedRangeValue: () => string
  isSelectionValid: boolean
  isCustomSelection: boolean
}

const getDefaultCustomRange = (): DateRange => {
  const today = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(today.getDate() - 30)
  return { from: thirtyDaysAgo, to: today }
}

export const useDateRangeSelection = ({ initialRange, isOpen }: UseDateRangeSelectionParams): UseDateRangeSelectionResult => {
  const [selectedRange, setSelectedRange] = useState(initialRange)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  useEffect(() => {
    if (isOpen === false) return

    if (isCustomDateRange(initialRange)) {
      const parsed = parseCustomDateRange(initialRange)
      if (parsed) {
        setSelectedRange('custom')
        setDateRange({ from: parsed.start, to: parsed.end })
        setShowCustomPicker(true)
        return
      }
    }

    setSelectedRange(initialRange)
    setDateRange(undefined)
    setShowCustomPicker(false)
  }, [initialRange, isOpen])

  const selectRange = (value: string) => {
    setSelectedRange(value)

    if (value === 'custom') {
      setShowCustomPicker(true)
      if (!dateRange?.from || !dateRange?.to) {
        setDateRange(getDefaultCustomRange())
      }
      return
    }

    setShowCustomPicker(false)
  }

  const getResolvedRangeValue = () => {
    if (selectedRange === 'custom' && dateRange?.from && dateRange?.to) {
      return buildCustomDateRangeValue(dateRange.from, dateRange.to)
    }
    return selectedRange
  }

  const isCustomSelection = selectedRange === 'custom'
  const isSelectionValid = !isCustomSelection || Boolean(dateRange?.from && dateRange?.to)

  return {
    selectedRange,
    showCustomPicker,
    dateRange,
    setDateRange,
    selectRange,
    setSelectedRange,
    getResolvedRangeValue,
    isSelectionValid,
    isCustomSelection,
  }
}
