import { createContext, useContext, useState, useCallback, lazy, Suspense, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

// Lazy load the modal
const InsightsDatePickerModal = lazy(() => import('@components/insights-date-picker-modal'))

type InsightType = 'grow' | 'optimize' | 'protect'

interface InsightsDatePickerContextType {
  showDatePicker: (type: InsightType, platforms?: string[]) => void
}

const InsightsDatePickerContext = createContext<InsightsDatePickerContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useInsightsDatePicker = (): InsightsDatePickerContextType => {
  const context = useContext(InsightsDatePickerContext)
  if (context === undefined) {
    throw new Error('useInsightsDatePicker must be used within an InsightsDatePickerProvider')
  }
  return context
}

interface InsightsDatePickerProviderProps {
  children: ReactNode
}

export const InsightsDatePickerProvider = ({ children }: InsightsDatePickerProviderProps) => {
  const navigate = useNavigate()

  const [isOpen, setIsOpen] = useState(false)
  const [insightType, setInsightType] = useState<InsightType>('grow')
  const [platforms, setPlatforms] = useState<string[]>([])

  const showDatePicker = useCallback((type: InsightType, selectedPlatforms?: string[]) => {
    setInsightType(type)
    setPlatforms(selectedPlatforms || [])
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setInsightType('grow')
    setPlatforms([])
    navigate('/home')
  }, [navigate])

  const handleGenerate = useCallback((dateRange: string) => {
    setIsOpen(false)

    const params = new URLSearchParams()
    if (platforms.length) params.set('platforms', platforms.join(','))
    params.set('range', dateRange)

    navigate(`/insights/${insightType}?${params.toString()}`)

    setInsightType('grow')
    setPlatforms([])
  }, [navigate, insightType, platforms])

  const contextValue: InsightsDatePickerContextType = {
    showDatePicker
  }

  return (
    <InsightsDatePickerContext.Provider value={contextValue}>
      {children}
      <Suspense fallback={null}>
        <InsightsDatePickerModal
          isOpen={isOpen}
          onClose={handleClose}
          onGenerate={handleGenerate}
          insightType={insightType}
        />
      </Suspense>
    </InsightsDatePickerContext.Provider>
  )
}
