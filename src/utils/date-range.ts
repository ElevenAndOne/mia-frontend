import { format } from 'date-fns'

export const CUSTOM_RANGE_PATTERN = /^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/

export type DateRangePresetValue =
  | '7_days'
  | '14_days'
  | '30_days'
  | '90_days'
  | '180_days'
  | '365_days'

export type DateRangeValue = DateRangePresetValue | string

export interface DateRangeSpan {
  start: Date
  end: Date
}

export interface DateRangeOption {
  id: string
  label: string
  value: DateRangePresetValue
}

const PRESET_DEFINITIONS: Record<DateRangePresetValue, { days: number; label: string; shortLabel: string }> = {
  '7_days': { days: 7, label: 'Last 7 days', shortLabel: '7d' },
  '14_days': { days: 14, label: 'Last 14 days', shortLabel: '14d' },
  '30_days': { days: 30, label: 'Last 30 days', shortLabel: '30d' },
  '90_days': { days: 90, label: 'Last 90 days', shortLabel: '90d' },
  '180_days': { days: 180, label: 'Last 6 months', shortLabel: '6mo' },
  '365_days': { days: 365, label: 'Last year', shortLabel: '1y' },
}

export const DEFAULT_DATE_RANGE_OPTIONS: Array<{ value: DateRangePresetValue | 'custom'; label: string }> = [
  { value: '7_days', label: PRESET_DEFINITIONS['7_days'].label },
  { value: '14_days', label: PRESET_DEFINITIONS['14_days'].label },
  { value: '30_days', label: PRESET_DEFINITIONS['30_days'].label },
  { value: '90_days', label: PRESET_DEFINITIONS['90_days'].label },
  { value: 'custom', label: 'Custom range' },
]

export const CHAT_DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { id: '7_days', label: PRESET_DEFINITIONS['7_days'].label, value: '7_days' },
  { id: '30_days', label: PRESET_DEFINITIONS['30_days'].label, value: '30_days' },
  { id: '90_days', label: 'Last 3 months', value: '90_days' },
  { id: '180_days', label: 'Last 6 months', value: '180_days' },
  { id: '365_days', label: PRESET_DEFINITIONS['365_days'].label, value: '365_days' },
]

export const isCustomDateRange = (value: string): boolean => CUSTOM_RANGE_PATTERN.test(value)

export const buildCustomDateRangeValue = (start: Date, end: Date): string => {
  return `${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}`
}

export const parseCustomDateRange = (value: string): DateRangeSpan | null => {
  if (!isCustomDateRange(value)) return null
  const [startStr, endStr] = value.split('_')
  const start = new Date(startStr)
  const end = new Date(endStr)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  return { start, end }
}

export const getPresetDateRange = (value: DateRangePresetValue, now: Date = new Date()): DateRangeSpan => {
  const preset = PRESET_DEFINITIONS[value]
  const end = new Date(now)
  const start = new Date(now)
  start.setDate(now.getDate() - (preset.days - 1))
  return { start, end }
}

export const parseDateRangeValue = (value: string, now: Date = new Date()): DateRangeSpan | null => {
  if (isCustomDateRange(value)) {
    return parseCustomDateRange(value)
  }

  if (value in PRESET_DEFINITIONS) {
    return getPresetDateRange(value as DateRangePresetValue, now)
  }

  return null
}

export const formatRangeSpan = (
  start: Date,
  end: Date,
  {
    includeYear = false,
    locale = 'en-US',
  }: { includeYear?: boolean; locale?: string } = {}
): string => {
  const options: Intl.DateTimeFormatOptions = includeYear
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' }
  const formatter = new Intl.DateTimeFormat(locale, options)
  return `${formatter.format(start)} - ${formatter.format(end)}`
}

export type DateRangeDisplayVariant = 'short' | 'range' | 'long'

export const formatDateRangeDisplay = (
  value: string,
  variant: DateRangeDisplayVariant = 'range',
  now: Date = new Date()
): string => {
  if (variant === 'short' && value in PRESET_DEFINITIONS) {
    return PRESET_DEFINITIONS[value as DateRangePresetValue].shortLabel
  }

  if (variant === 'long' && value in PRESET_DEFINITIONS) {
    return PRESET_DEFINITIONS[value as DateRangePresetValue].label
  }

  const parsed = parseDateRangeValue(value, now)
  if (!parsed) return value

  return formatRangeSpan(parsed.start, parsed.end, { includeYear: variant === 'long' })
}

export const getPresetLabel = (value: DateRangePresetValue): string => PRESET_DEFINITIONS[value].label
