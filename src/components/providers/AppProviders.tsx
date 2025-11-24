import React from 'react'
import { SdkProvider } from '../../contexts/SdkContext'
import { SessionProvider } from '../../contexts/SessionContext'
import { UIStateProvider } from '../../contexts/UIStateContext'
import { ChatProvider } from '../../contexts/ChatContext'

interface AppProvidersProps {
  children: React.ReactNode
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <SdkProvider>
      <SessionProvider>
        <UIStateProvider>
          <ChatProvider>
            {children}
          </ChatProvider>
        </UIStateProvider>
      </SessionProvider>
    </SdkProvider>
  )
}
