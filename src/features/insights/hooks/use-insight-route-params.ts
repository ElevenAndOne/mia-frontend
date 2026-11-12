import { useSearchParams } from 'react-router-dom'
import { normalizeDateRange, type DateRangeValue } from '../../../utils/date-range'
import { StorageKey } from '../../../constants/storage-keys'

export const useInsightRouteParams = () => {
  const [searchParams] = useSearchParams()
  const platforms = searchParams.get('platforms')?.split(',').filter(Boolean)
  const dateRange: DateRangeValue = normalizeDateRange(
    searchParams.get('range') || localStorage.getItem(StorageKey.DATE_RANGE),
  )

  return {
    platforms: platforms && platforms.length > 0 ? platforms : undefined,
    dateRange,
  }
}
