import { createContext, useContext, useState, ReactNode } from 'react'

interface ModalContextType {
  // Workspace modal
  showCreateWorkspaceModal: boolean
  setShowCreateWorkspaceModal: (show: boolean) => void

  // Insights date picker modal
  showInsightsDatePicker: boolean
  pendingInsightType: 'grow' | 'optimize' | 'protect' | null
  selectedInsightDateRange: string
  pendingPlatforms: string[]
  openInsightsDatePicker: (type: 'grow' | 'optimize' | 'protect', platforms: string[]) => void
  closeInsightsDatePicker: () => void
  handleInsightsDateGenerate: (dateRange: string) => 'grow' | 'optimize' | 'protect' | null

  // OAuth loading
  oauthLoadingPlatform: 'google' | 'meta' | null
  setOAuthLoading: (platform: 'google' | 'meta') => void
  clearOAuthLoading: () => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  // Workspace creation modal state
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false)

  // Date picker modal state
  const [showInsightsDatePicker, setShowInsightsDatePicker] = useState(false)
  const [pendingInsightType, setPendingInsightType] = useState<'grow' | 'optimize' | 'protect' | null>(null)
  const [selectedInsightDateRange, setSelectedInsightDateRange] = useState<string>('30_days')
  const [pendingPlatforms, setPendingPlatforms] = useState<string[]>([])

  // OAuth loading state
  const [oauthLoadingPlatform, setOauthLoadingPlatform] = useState<'google' | 'meta' | null>(null)

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

  const setOAuthLoading = (platform: 'google' | 'meta') => {
    setOauthLoadingPlatform(platform)
  }

  const clearOAuthLoading = () => {
    setOauthLoadingPlatform(null)
  }

  return (
    <ModalContext.Provider
      value={{
        showCreateWorkspaceModal,
        setShowCreateWorkspaceModal,
        showInsightsDatePicker,
        pendingInsightType,
        selectedInsightDateRange,
        pendingPlatforms,
        openInsightsDatePicker,
        closeInsightsDatePicker,
        handleInsightsDateGenerate,
        oauthLoadingPlatform,
        setOAuthLoading,
        clearOAuthLoading,
      }}
    >
      {children}
    </ModalContext.Provider>
  )
}

export const useModalContext = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModalContext must be used within a ModalProvider')
  }
  return context
}

export default ModalContext
