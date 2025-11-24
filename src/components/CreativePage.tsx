import React, { useState, useEffect } from 'react'
import { useSession } from '../contexts/SessionContext'
import { useChat } from '../contexts/ChatContext'
import { useUIState } from '../contexts/UIStateContext'
import { AnalyticsLayout } from './layout/AnalyticsLayout'
import { QuestionCategory } from './chat/QuestionGrid'
import { useSdk } from '../contexts/SdkContext'
import CreativeDatePicker from './CreativeDatePicker'

interface CreativePageProps {
  onBack?: () => void
}

export const CreativePage: React.FC<CreativePageProps> = ({ onBack }) => {
  const { sessionId, selectedAccount, availableAccounts, selectAccount } = useSession()
  const { addMessage, updateMessage, markQuestionAsked, setQuestionFlow, setCurrentQuestionIndex, setAnalyzing, isAnalyzing } = useChat()
  const { showNotification } = useUIState()
  const sdk = useSdk()
  
  const [activeCategory, setActiveCategory] = useState<QuestionCategory>('grow')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [userSelectedStartDate, setUserSelectedStartDate] = useState<string>('2025-08-03')

  // Initialize chat sessions for all categories
  useEffect(() => {
    const categories: QuestionCategory[] = ['grow', 'optimise', 'protect']
    categories.forEach(category => {
      // This will create sessions if they don't exist
    })
  }, [])

  // Date range calculation
  const getDateRangeForCategory = (category: QuestionCategory, customStartDate?: string) => {
    const startDate = customStartDate || userSelectedStartDate
    const start = new Date(startDate)
    const daysToAdd = category === 'protect' ? 6 : 30
    const end = new Date(start)
    end.setDate(start.getDate() + daysToAdd)

    return {
      start: startDate,
      end: end.toISOString().split('T')[0]
    }
  }

  // Handle question selection
  const handleQuestionSelect = async (question: string, category: QuestionCategory, questionIndex: number) => {
    if (isAnalyzing) return

    try {
      setAnalyzing(true)

      // Add question message to chat
      addMessage(category, {
        type: 'question',
        content: question,
        category,
        questionIndex
      })

      // Mark question as asked and update flow
      markQuestionAsked(category, questionIndex)
      setQuestionFlow(category, 'cycling')
      setCurrentQuestionIndex(category, 0)

      // Add loading response
      const loadingMessageId = `loading_${Date.now()}`
      addMessage(category, {
        type: 'response',
        content: '',
        category,
        questionIndex,
        isLoading: true
      })

      // Get date range for request
      const dateRange = getDateRangeForCategory(category)

      // Make API request
      const response = await sdk.insights.sendChatMessage({
        message: question,
        session_id: sessionId || '',
        user_id: selectedAccount?.id || '',
        google_ads_id: selectedAccount?.google_ads_id || '',
        ga4_property_id: selectedAccount?.ga4_property_id || '',
        date_range: `${dateRange.start} to ${dateRange.end}`
      })

      // Update loading message with response
      updateMessage(category, loadingMessageId, {
        content: response.message || 'I apologize, but I encountered an issue while analyzing your data. Please try asking the question again.',
        isLoading: false
      })

    } catch (error) {
      console.error('Failed to process question:', error)
      showNotification('Failed to process question. Please try again.', 'error')
      
      // Update loading message with error
      updateMessage(category, `loading_${Date.now()}`, {
        content: 'I apologize, but I encountered an issue while analyzing your data. Please try asking the question again.',
        isLoading: false
      })
    } finally {
      setAnalyzing(false)
    }
  }

  // Handle account switching
  const handleAccountSwitch = async (accountId: string) => {
    try {
      const success = await selectAccount(accountId)
      if (success) {
        // Clear chat sessions when switching accounts
        const categories: QuestionCategory[] = ['grow', 'optimise', 'protect']
        categories.forEach(category => {
          // Clear messages for each category
        })
        showNotification('Account switched successfully', 'success')
      } else {
        showNotification('Failed to switch account', 'error')
      }
    } catch (error) {
      console.error('Account switch error:', error)
      showNotification('Failed to switch account', 'error')
    }
  }

  // Custom content for the layout (date picker and account info)
  const renderCustomContent = (category: QuestionCategory) => {
    const dateRange = getDateRangeForCategory(category, userSelectedStartDate)
    
    return (
      <div className="space-y-4">
        {/* Date Range Display and Picker */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Analysis Period</h3>
              <p className="text-sm text-gray-600 mt-1">
                {formatDateRangeForDisplay(dateRange.start, dateRange.end)}
                {category === 'protect' && ' (7 days)'}
                {category !== 'protect' && ' (31 days)'}
              </p>
            </div>
            <button
              onClick={() => setShowDatePicker(true)}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Change Dates
            </button>
          </div>
        </div>

        {/* Account Information */}
        {selectedAccount && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {getAccountIcon(selectedAccount.business_type)}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {selectedAccount.display_name || selectedAccount.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedAccount.google_ads_id && `Google Ads: ${selectedAccount.google_ads_id}`}
                  {selectedAccount.meta_ads_id && ` • Meta: ${selectedAccount.meta_ads_id}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const formatDateRangeForDisplay = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const formatDate = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0')
      const month = date.toLocaleDateString('en-GB', { month: 'short' })
      return `${day} ${month}`
    }

    return `${formatDate(start)} - ${formatDate(end)}`
  }

  const getAccountIcon = (businessType: string) => {
    switch (businessType?.toLowerCase()) {
      case 'engineering': return '⚙️'
      case 'food': return '🍒'
      default: return '🏢'
    }
  }

  return (
    <>
      <AnalyticsLayout
        title="Creative Analysis"
        subtitle="Analyze your creative performance with Mia"
        onBack={onBack}
        categories={['grow', 'optimise', 'protect']}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        onQuestionSelect={handleQuestionSelect}
        renderContent={renderCustomContent}
        showAccountInfo={true}
        showLogout={true}
      />

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDatePicker(false)} />
            <div className="relative bg-white rounded-lg shadow-xl">
              <CreativeDatePicker
                isOpen={showDatePicker}
                startDate={userSelectedStartDate}
                category={activeCategory}
                onDateChange={(newStartDate) => {
                  setUserSelectedStartDate(newStartDate)
                  setShowDatePicker(false)
                }}
                onClose={() => setShowDatePicker(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
