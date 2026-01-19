import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Workspace } from '../types'
import { workspaceService } from '../services/workspace-service'
import { useAuth } from './auth-context'

interface WorkspaceContextValue {
  // State
  activeWorkspace: Workspace | null
  availableWorkspaces: Workspace[]
  isLoading: boolean

  // Actions
  createWorkspace: (name: string) => Promise<Workspace | null>
  switchWorkspace: (tenantId: string) => Promise<boolean>
  refreshWorkspaces: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { sessionId, isAuthenticated } = useAuth()
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const refreshWorkspaces = useCallback(async (): Promise<void> => {
    if (!sessionId) return

    setIsLoading(true)
    try {
      const workspaces = await workspaceService.listWorkspaces(sessionId)
      setAvailableWorkspaces(workspaces)

      // Set active workspace (first one, or previously active)
      if (workspaces.length > 0 && !activeWorkspace) {
        setActiveWorkspace(workspaces[0])
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, activeWorkspace])

  // Fetch workspaces when authenticated
  useEffect(() => {
    if (isAuthenticated && sessionId) {
      refreshWorkspaces()
    }
  }, [isAuthenticated, sessionId, refreshWorkspaces])

  const createWorkspace = async (name: string): Promise<Workspace | null> => {
    if (!sessionId) return null

    const workspace = await workspaceService.createWorkspace(sessionId, name)
    if (workspace) {
      await refreshWorkspaces()
      setActiveWorkspace(workspace)
    }
    return workspace
  }

  const switchWorkspace = async (tenantId: string): Promise<boolean> => {
    if (!sessionId) return false

    const success = await workspaceService.switchWorkspace(sessionId, tenantId)
    if (success) {
      const workspace = availableWorkspaces.find(w => w.tenant_id === tenantId)
      if (workspace) {
        setActiveWorkspace(workspace)
      }
    }
    return success
  }

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        availableWorkspaces,
        isLoading,
        createWorkspace,
        switchWorkspace,
        refreshWorkspaces
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}
