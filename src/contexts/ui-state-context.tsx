import { createContext, useContext, useState } from 'react'
import type { FC, ReactNode } from 'react'

export type ModalType = 
  | 'none'
  | 'brevo-api-key'
  | 'brevo-account-selector'
  | 'meta-account-selector'
  | 'facebook-page-selector'
  | 'ga4-property-selector'
  | 'google-account-selector'
  | 'hubspot-account-selector'
  | 'date-picker'
  | 'figma-login'

export interface LoadingState {
  isLoading: boolean
  message?: string
}

export interface ModalData {
  [key: string]: unknown
}

interface UIStateContextType {
  // Modal management
  activeModal: ModalType
  openModal: (modal: ModalType, data?: ModalData) => void
  closeModal: () => void
  modalData: ModalData | null

  // Loading states
  loadingState: LoadingState
  setLoading: (isLoading: boolean, message?: string) => void

  // Navigation state
  showBurgerMenu: boolean
  setShowBurgerMenu: (show: boolean) => void
  toggleBurgerMenu: () => void
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useUIState = () => {
  const context = useContext(UIStateContext)
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider')
  }
  return context
}

interface UIStateProviderProps {
  children: ReactNode
}

export const UIStateProvider: FC<UIStateProviderProps> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ModalType>('none')
  const [modalData, setModalData] = useState<ModalData | null>(null)
  const [loadingState, setLoadingStateInternal] = useState<LoadingState>({ isLoading: false })
  const [showBurgerMenu, setShowBurgerMenu] = useState(false)

  const openModal = (modal: ModalType, data?: ModalData) => {
    setActiveModal(modal)
    setModalData(data || null)
  }

  const closeModal = () => {
    setActiveModal('none')
    setModalData(null)
  }

  const setLoading = (isLoading: boolean, message?: string) => {
    setLoadingStateInternal({ isLoading, message })
  }

  const toggleBurgerMenu = () => {
    setShowBurgerMenu(prev => !prev)
  }

  return (
    <UIStateContext.Provider
      value={{
        activeModal,
        openModal,
        closeModal,
        modalData,
        loadingState,
        setLoading,
        showBurgerMenu,
        setShowBurgerMenu,
        toggleBurgerMenu
      }}
    >
      {children}
    </UIStateContext.Provider>
  )
}
