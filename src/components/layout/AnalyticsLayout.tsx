import React, { useState } from 'react'
import { PageLayout, PageLayoutProps } from './PageLayout'
import { NavigationTabs, NavigationTab } from '../common/NavigationTabs'
import { ChatInterface } from '../chat/ChatInterface'
import { QuestionGrid, PRESET_QUESTIONS, QuestionCategory } from '../chat/QuestionGrid'
import { useChat } from '../../contexts/ChatContext'

export interface AnalyticsLayoutProps extends Omit<PageLayoutProps, 'children'> {
  categories: QuestionCategory[]
  activeCategory: QuestionCategory
  onCategoryChange: (category: QuestionCategory) => void
  onQuestionSelect: (question: string, category: QuestionCategory, questionIndex: number) => Promise<void>
  renderContent?: (category: QuestionCategory) => React.ReactNode
  showQuestionGrid?: boolean
  showChat?: boolean
  className?: string
}

export const AnalyticsLayout: React.FC<AnalyticsLayoutProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  onQuestionSelect,
  renderContent,
  showQuestionGrid = true,
  showChat = true,
  className,
  ...pageLayoutProps
}) => {
  const { getSession, switchCategory } = useChat()

  // Navigation tabs configuration
  const navigationTabs: NavigationTab[] = categories.map(category => ({
    id: category,
    label: category.charAt(0).toUpperCase() + category.slice(1),
    image: `/images/${category.charAt(0).toUpperCase() + category.slice(1)} Nav.png`
  }))

  const handleCategoryChange = (categoryId: string) => {
    const category = categoryId as QuestionCategory
    switchCategory(category)
    onCategoryChange(category)
  }

  const handleQuestionSelect = async (question: any, index: number) => {
    await onQuestionSelect(question.text, activeCategory, index)
  }

  const session = getSession(activeCategory)
  const hasMessages = session && session.messages.length > 0
  const isInitialFlow = !session || session.questionFlow === 'initial'

  return (
    <PageLayout {...pageLayoutProps} className={className}>
      <div className="container mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <NavigationTabs
            tabs={navigationTabs}
            activeTab={activeCategory}
            onTabChange={handleCategoryChange}
            className="max-w-2xl mx-auto"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left Column - Questions or Custom Content */}
          <div className="space-y-6">
            {renderContent ? renderContent(activeCategory) : (
              <>
                {/* Initial Questions Grid */}
                {showQuestionGrid && isInitialFlow && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Choose a question to analyze
                    </h2>
                    <QuestionGrid
                      questions={[...PRESET_QUESTIONS[activeCategory]]}
                      category={activeCategory}
                      onQuestionSelect={handleQuestionSelect}
                      columns={1}
                    />
                  </div>
                )}

                {/* Show message when questions have been asked */}
                {!isInitialFlow && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">
                      Continue the conversation
                    </h3>
                    <p className="text-blue-700 text-sm">
                      Ask follow-up questions or choose from the remaining preset questions.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column - Chat Interface */}
          {showChat && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="font-medium text-gray-900">
                    Chat with Mia
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {hasMessages 
                      ? "Continue your conversation" 
                      : "Ask a question to get started"
                    }
                  </p>
                </div>
                
                <ChatInterface
                  category={activeCategory}
                  className="min-h-[400px]"
                  maxHeight="max-h-[500px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
