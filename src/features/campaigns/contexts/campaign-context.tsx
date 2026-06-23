/* eslint-disable react-refresh/only-export-components -- context module: provider + hook live together by design */
import { createContext, useContext } from 'react'
import type { CampaignDetail, CampaignSummary } from '../types'

// Shared state for the campaign workspace. The layout loads the campaign once
// and provides it here so every view (Overview / Calendar / Builder) reads the
// same instance — switching views never refetches.
export interface CampaignWorkspaceValue {
  tenantId: string
  sessionId: string
  campaign: CampaignDetail
  setCampaign: (
    next: CampaignDetail | null | ((prev: CampaignDetail | null) => CampaignDetail | null),
  ) => void
  reloadDetail: () => Promise<void>
  list: CampaignSummary[]
  setList: React.Dispatch<React.SetStateAction<CampaignSummary[]>>
  reloadList: () => Promise<void>
}

const CampaignWorkspaceContext = createContext<CampaignWorkspaceValue | null>(null)

export const CampaignWorkspaceProvider = CampaignWorkspaceContext.Provider

export function useCampaignWorkspace(): CampaignWorkspaceValue {
  const ctx = useContext(CampaignWorkspaceContext)
  if (!ctx) throw new Error('useCampaignWorkspace must be used within the campaign workspace layout')
  return ctx
}
