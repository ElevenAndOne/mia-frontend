import { lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNavigation } from '@contexts/navigation-context'
import { AppLayout } from '@components/app-layout'

const InsightPage = lazy(() => import('@features/insights/components/insight-page'))
const SummaryInsights = lazy(() => import('@features/insights/components/summary-insights'))

interface InsightPageWrapperProps {
  insightType: 'grow' | 'optimize' | 'protect' | 'summary'
}

export const InsightPageWrapper = ({ insightType }: InsightPageWrapperProps) => {
  const { navigateBack } = useNavigation()
  const [searchParams] = useSearchParams()

  const platforms = searchParams.get('platforms')?.split(',').filter(Boolean)
  const dateRange = searchParams.get('range') || '30_days'

  if (insightType === 'summary') {
    return (
      <AppLayout>
        <div className="w-full h-full">
          <SummaryInsights onBack={navigateBack} />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="w-full h-full">
        <InsightPage
          insightType={insightType}
          onBack={navigateBack}
          initialDateRange={dateRange}
          platforms={platforms}
        />
      </div>
    </AppLayout>
  )
}

export default InsightPageWrapper
