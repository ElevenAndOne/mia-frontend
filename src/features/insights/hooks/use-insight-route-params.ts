import { useSearchParams } from 'react-router-dom'
import type { DateRangeValue } from '../../../utils/date-range'

export const useInsightRouteParams = () => {
  const [searchParams] = useSearchParams()
  const platforms = searchParams.get('platforms')?.split(',').filter(Boolean)
  const dateRange = (searchParams.get('range') || '30_days') as DateRangeValue

  return {
    platforms: platforms && platforms.length > 0 ? platforms : undefined,
    dateRange,
  }
}
