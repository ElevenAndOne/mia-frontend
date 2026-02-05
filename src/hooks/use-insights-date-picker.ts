import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { InsightType } from '../features/insights/config/insight-definitions'

export const useInsightsDatePicker = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showInsightsDatePicker, setShowInsightsDatePicker] = useState(false)
  const [pendingInsightType, setPendingInsightType] = useState<InsightType | null>(null)
  const [pendingPlatforms, setPendingPlatforms] = useState<string[]>([])

  useEffect(() => {
    const state = location.state as { showDatePicker?: boolean; platforms?: string[] } | null
    if (state?.showDatePicker) {
      const type = location.pathname.includes('grow') ? 'grow'
        : location.pathname.includes('optimize') ? 'optimize'
        : location.pathname.includes('protect') ? 'protect'
        : null

      if (type) {
        setPendingInsightType(type)
        setPendingPlatforms(state.platforms || [])
        setShowInsightsDatePicker(true)
        navigate(location.pathname + location.search, { replace: true, state: null })
      }
    }
  }, [location, navigate])

  const handleInsightsDateGenerate = (range: string) => {
    setShowInsightsDatePicker(false)

    const params = new URLSearchParams()
    if (pendingPlatforms.length) params.set('platforms', pendingPlatforms.join(','))
    params.set('range', range)

    if (pendingInsightType === 'grow') {
      navigate(`/insights/grow?${params.toString()}`)
    } else if (pendingInsightType === 'optimize') {
      navigate(`/insights/optimize?${params.toString()}`)
    } else if (pendingInsightType === 'protect') {
      navigate(`/insights/protect?${params.toString()}`)
    }

    setPendingInsightType(null)
    setPendingPlatforms([])
  }

  const handleDatePickerClose = () => {
    setShowInsightsDatePicker(false)
    setPendingInsightType(null)
    navigate('/home')
  }

  return {
    isOpen: showInsightsDatePicker,
    onClose: handleDatePickerClose,
    onGenerate: handleInsightsDateGenerate,
    insightType: pendingInsightType || 'grow',
  }
}
