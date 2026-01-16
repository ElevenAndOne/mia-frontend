import { useState } from 'react'

export const useModalManager = () => {
  // Workspace creation modal state (shown after account selection for new users)
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)

  // Date picker modal state
  const [showInsightsDatePicker, setShowInsightsDatePicker] = useState(false)
  const [pendingInsightType, setPendingInsightType] = useState<'grow' | 'optimize' | 'protect' | null>(null)
  const [selectedInsightDateRange, setSelectedInsightDateRange] = useState<string>('30_days')
  const [pendingPlatforms, setPendingPlatforms] = useState<string[]>([]) // Store selected platforms for insights

  const openInsightsDatePicker = (type: 'grow' | 'optimize' | 'protect', platforms: string[]) => {
    setPendingInsightType(type)
    setPendingPlatforms(platforms)
    setShowInsightsDatePicker(true)
  }

  const closeInsightsDatePicker = () => {
    setShowInsightsDatePicker(false)
    setPendingInsightType(null)
  }

  const handleInsightsDateGenerate = (dateRange: string) => {
    setSelectedInsightDateRange(dateRange)
    setShowInsightsDatePicker(false)
    return pendingInsightType
  }

  return {
    // Workspace modal
    showCreateWorkspaceModal,
    setShowCreateWorkspaceModal,

    // Insights date picker modal
    showInsightsDatePicker,
    pendingInsightType,
    selectedInsightDateRange,
    pendingPlatforms,
    openInsightsDatePicker,
    closeInsightsDatePicker,
    handleInsightsDateGenerate
  }
}
