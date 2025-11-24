import React, { useState, useEffect } from 'react'
import { useSession } from '../contexts/SessionContext'
import { useUIState } from '../contexts/UIStateContext'
import { useSdk } from '../contexts/SdkContext'
import { PageLayout } from './layout/PageLayout'
import { LoadingSpinner, ErrorState } from './ui'

interface OptimizeData {
  header: {
    percentage: number
    description: string
    icon: string
  }
  insights: string[]
  roas: {
    percentage: number
    trend: string
    label: string
  }
  boxes: Array<{
    value: string
    label: string
    trend: string
    unit?: string
  }>
  prediction: {
    amount: string
    confidence: string
    description: string
  }
}

interface OptimizePageProps {
  onBack?: () => void
  question?: string
  isLoading?: boolean
  data?: OptimizeData
}

export const OptimizePage: React.FC<OptimizePageProps> = ({ 
  onBack, 
  question = "What can we improve?", 
  isLoading = false, 
  data 
}) => {
  const { selectedAccount } = useSession()
  const { showNotification } = useUIState()
  const sdk = useSdk()
  
  const [optimizeData, setOptimizeData] = useState<OptimizeData | null>(data || null)
  const [loading, setLoading] = useState(isLoading)
  const [error, setError] = useState<string | null>(null)

  // Fetch data when component mounts if not provided
  useEffect(() => {
    if (data) {
      setOptimizeData(data)
      setLoading(false)
    } else if (question) {
      fetchOptimizeData()
    }
  }, [data, question])

  const fetchOptimizeData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await sdk.insights.getImproveData({
        question: question,
        user: 'user@example.com',
        selected_account: selectedAccount ? {
          id: selectedAccount.id,
          name: selectedAccount.name,
          google_ads_id: selectedAccount.google_ads_id,
          ga4_property_id: selectedAccount.ga4_property_id,
          meta_ads_id: selectedAccount.meta_ads_id,
          business_type: selectedAccount.business_type
        } : undefined,
        user_id: selectedAccount?.id || ''
      })
      
      if (response.success && response.data) {
        setOptimizeData(response.data as OptimizeData)
        setError(null)
      } else {
        setError('Unable to load optimization data. Please try again.')
        setOptimizeData(getErrorFallbackData())
      }
    } catch (error) {
      console.error('Failed to fetch optimize data:', error)
      setError('Connection error. Please check your connection.')
      setOptimizeData(getErrorFallbackData())
      showNotification('Failed to load optimization data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getErrorFallbackData = (): OptimizeData => ({
    header: {
      percentage: 0,
      description: "Unable to load\nmarketing data",
      icon: "error"
    },
    insights: ["Data currently unavailable"],
    roas: {
      percentage: 0,
      trend: "neutral",
      label: "ROAS"
    },
    boxes: [],
    prediction: {
      amount: "N/A",
      confidence: "Low",
      description: "Unable to generate prediction"
    }
  })

  const handleRetry = () => {
    fetchOptimizeData()
  }

  return (
    <PageLayout
      title="Optimize Performance"
      subtitle="Discover opportunities to improve your marketing performance"
      onBack={onBack}
      loading={loading}
      error={error}
      onRetry={handleRetry}
      showAccountInfo={true}
      showLogout={true}
    >
      {optimizeData && (
        <div className="container mx-auto px-4 py-6">
          {/* Header Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {optimizeData.header.icon === 'error' ? '⚠️' : '📈'}
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">
                  {optimizeData.header.percentage}%
                </div>
                <p className="text-gray-600 whitespace-pre-line">
                  {optimizeData.header.description}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Insights */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Key Insights
                </h2>
                <div className="space-y-3">
                  {optimizeData.insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-gray-700">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics Boxes */}
              {optimizeData.boxes.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {optimizeData.boxes.map((box, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="text-2xl font-bold text-gray-900">
                        {box.value}{box.unit}
                      </div>
                      <div className="text-sm text-gray-600">{box.label}</div>
                      <div className={`text-xs mt-1 ${
                        box.trend === 'up' ? 'text-green-600' : 
                        box.trend === 'down' ? 'text-red-600' : 
                        'text-gray-500'
                      }`}>
                        {box.trend === 'up' && '↗ Trending up'}
                        {box.trend === 'down' && '↘ Trending down'}
                        {box.trend === 'neutral' && '→ Stable'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - ROAS and Prediction */}
            <div className="space-y-6">
              {/* ROAS Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {optimizeData.roas.label}
                </h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {optimizeData.roas.percentage}%
                </div>
                <div className={`text-sm ${
                  optimizeData.roas.trend === 'up' ? 'text-green-600' : 
                  optimizeData.roas.trend === 'down' ? 'text-red-600' : 
                  'text-gray-500'
                }`}>
                  {optimizeData.roas.trend === 'up' && '↗ Improving'}
                  {optimizeData.roas.trend === 'down' && '↘ Declining'}
                  {optimizeData.roas.trend === 'neutral' && '→ Stable'}
                </div>
              </div>

              {/* Prediction Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Prediction
                </h3>
                <div className="text-2xl font-bold text-blue-700 mb-2">
                  {optimizeData.prediction.amount}
                </div>
                <div className="text-sm text-blue-600 mb-3">
                  Confidence: {optimizeData.prediction.confidence}
                </div>
                <p className="text-sm text-gray-700">
                  {optimizeData.prediction.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
