import { apiFetch } from '../utils/api'
import { useState, useEffect } from 'react'
import { useSession } from '../contexts/SessionContext'

interface ProtectInsightsProps {
  onBack?: () => void
}

interface InsightsResponse {
  success: boolean
  type: string
  summary: string
  insights: string[]
}

const ProtectInsights = ({ onBack }: ProtectInsightsProps) => {
  const { sessionId, selectedAccount } = useSession()
  const [insights, setInsights] = useState<InsightsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProtectInsights()
  }, [])

  const fetchProtectInsights = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!sessionId) {
        throw new Error('No session found. Please log in again.')
      }

      const response = await apiFetch('/api/quick-insights/protect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setInsights(result)
      } else {
        throw new Error(result.error || 'Failed to fetch insights')
      }

    } catch (error) {
      console.error('[PROTECT-INSIGHTS] Error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full h-full relative flex flex-col" style={{ backgroundColor: '#290068' }}>
      {/* Header */}
      <div className="flex items-center px-4 py-3 relative z-20 flex-shrink-0 bg-white">
        <div className="flex-1 flex justify-start pl-2">
          {/* Empty space for symmetry */}
        </div>

        <h1 className="text-xl font-normal text-black text-center" style={{ fontFamily: 'Geologica, sans-serif', fontSize: '20px', fontWeight: 400, lineHeight: '110%' }}>
          Protect
        </h1>

        <div className="flex-1 flex justify-end pr-2">
          <div className="relative">
            <button className="w-6 h-6 flex items-center justify-center opacity-50">
              <img src="/icons/calendar.svg" alt="Calendar" className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Gradient Header */}
      <div
        className="relative flex items-center justify-between px-4 py-4 overflow-hidden"
        style={{ minHeight: '100px' }}
      >
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #290068 0%, #4A148C 50%, #6A1B9A 100%)',
            backgroundImage: 'url("/images/Protect Nav.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 0
          }}
        />

        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center justify-center active:scale-90 transition-all duration-100"
          style={{
            color: '#FFF',
            padding: '12px',
            marginLeft: '-8px',
            minWidth: '44px',
            minHeight: '44px',
            position: 'relative',
            transform: 'translateY(-5px) translateX(15px)',
            zIndex: 20
          }}
        >
          <svg width="16" height="13" viewBox="0 0 16 13" fill="none">
            <path d="M7.18572 13L0.822088 6.63636L7.18572 0.272727L8.27947 1.35227L3.77663 5.85511H15.4386V7.41761H3.77663L8.27947 11.9062L7.18572 13Z" fill="white"/>
          </svg>
        </button>

        <div className="flex flex-col items-end" style={{ zIndex: 10, position: 'relative', transform: 'translateY(-5px) translateX(-20px)' }}>
          <span className="text-white font-medium text-lg">03 Aug - 02 Sep</span>
          {selectedAccount && (
            <span className="text-white/80 text-sm font-normal mt-0.5">{selectedAccount.name}</span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white p-6 overflow-y-auto rounded-t-2xl -mt-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 text-sm">Analyzing protection strategies...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={fetchProtectInsights}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {insights && !isLoading && !error && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-orange-50 to-purple-50 border border-orange-200 rounded-lg p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Summary</h2>
              <p className="text-gray-700 leading-relaxed">{insights.summary}</p>
            </div>

            {/* Key Insights */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Protection Strategies</h2>
              <div className="space-y-3">
                {insights.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-3 bg-gray-50 rounded-lg p-4">
                    <div className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <p className="flex-1 text-gray-800 text-sm leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProtectInsights
