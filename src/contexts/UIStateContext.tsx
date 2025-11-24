import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface ModalState {
  isOpen: boolean
  data?: any
}

export interface NotificationState {
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  isVisible: boolean
}

export interface UIState {
  // Modal states
  modals: {
    accountSelector: ModalState
    datePicker: ModalState
    integrationConfig: ModalState
    confirmation: ModalState
  }
  
  // Loading states
  loading: {
    global: boolean
    page: boolean
    action: string | null
  }
  
  // Notification state
  notification: NotificationState | null

  // Page state
  sidebarCollapsed: boolean
}

export interface UIActions {
  // Modal actions
  openModal: (modalName: keyof UIState['modals'], data?: any) => void
  closeModal: (modalName: keyof UIState['modals']) => void
  closeAllModals: () => void

  // Loading actions
  setGlobalLoading: (loading: boolean) => void
  setPageLoading: (loading: boolean) => void
  setActionLoading: (action: string | null) => void

  // Notification actions
  showNotification: (message: string, type: NotificationState['type']) => void
  hideNotification: () => void

  // UI actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

type UIContextType = UIState & UIActions

const UIStateContext = createContext<UIContextType | undefined>(undefined)

export const useUIState = () => {
  const context = useContext(UIStateContext)
  if (context === undefined) {
    throw new Error('useUIState must be used within a UIStateProvider')
  }
  return context
}

interface UIStateProviderProps {
  children: ReactNode
}

export const UIStateProvider: React.FC<UIStateProviderProps> = ({ children }) => {
  const [state, setState] = useState<UIState>({
    modals: {
      accountSelector: { isOpen: false },
      datePicker: { isOpen: false },
      integrationConfig: { isOpen: false },
      confirmation: { isOpen: false }
    },
    loading: {
      global: false,
      page: false,
      action: null
    },
    notification: null,
    sidebarCollapsed: false
  })

  // Modal actions
  const openModal = (modalName: keyof UIState['modals'], data?: any) => {
    setState(prev => ({
      ...prev,
      modals: {
        ...prev.modals,
        [modalName]: { isOpen: true, data }
      }
    }))
  }

  const closeModal = (modalName: keyof UIState['modals']) => {
    setState(prev => ({
      ...prev,
      modals: {
        ...prev.modals,
        [modalName]: { isOpen: false, data: undefined }
      }
    }))
  }

  const closeAllModals = () => {
    setState(prev => ({
      ...prev,
      modals: {
        accountSelector: { isOpen: false },
        datePicker: { isOpen: false },
        integrationConfig: { isOpen: false },
        confirmation: { isOpen: false }
      }
    }))
  }

  // Loading actions
  const setGlobalLoading = (loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        global: loading
      }
    }))
  }

  const setPageLoading = (loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        page: loading
      }
    }))
  }

  const setActionLoading = (action: string | null) => {
    setState(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        action
      }
    }))
  }

  // Notification actions
  const showNotification = (message: string, type: NotificationState['type']) => {
    setState(prev => ({
      ...prev,
      notification: {
        message,
        type,
        isVisible: true
      }
    }))

    // Auto hide after 5 seconds
    setTimeout(() => {
      hideNotification()
    }, 5000)
  }

  const hideNotification = () => {
    setState(prev => ({
      ...prev,
      notification: prev.notification ? {
        ...prev.notification,
        isVisible: false
      } : null
    }))
  }

  // UI actions
  const toggleSidebar = () => {
    setState(prev => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed
    }))
  }

  const setSidebarCollapsed = (collapsed: boolean) => {
    setState(prev => ({
      ...prev,
      sidebarCollapsed: collapsed
    }))
  }

  const contextValue: UIContextType = {
    ...state,
    openModal,
    closeModal,
    closeAllModals,
    setGlobalLoading,
    setPageLoading,
    setActionLoading,
    showNotification,
    hideNotification,
    toggleSidebar,
    setSidebarCollapsed
  }

  return (
    <UIStateContext.Provider value={contextValue}>
      {children}
    </UIStateContext.Provider>
  )
}
