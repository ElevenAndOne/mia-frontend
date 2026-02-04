import { useCallback } from 'react'
import { useSession } from '../../../contexts/session-context'
import { useOnboarding } from '../../onboarding/onboarding-context'

interface IntegrationFlowOptions {
  invalidateIntegrationStatus?: () => void
  skipOnboarding?: boolean
}

interface IntegrationFlowActions {
  refreshIntegrationState: () => Promise<void>
  handleSkip: (onSkip?: () => void) => Promise<void>
  handleSuccess: (onSuccess?: () => void) => Promise<void>
}

export const useIntegrationFlow = ({
  invalidateIntegrationStatus,
  skipOnboarding = false,
}: IntegrationFlowOptions = {}): IntegrationFlowActions => {
  const { refreshAccounts, refreshWorkspaces } = useSession()
  const { skipOnboarding: skipOnboardingAction } = useOnboarding()

  const refreshIntegrationState = useCallback(async () => {
    await Promise.allSettled([
      refreshAccounts(),
      refreshWorkspaces(),
    ])
    invalidateIntegrationStatus?.()
  }, [refreshAccounts, refreshWorkspaces, invalidateIntegrationStatus])

  const handleSkip = useCallback(async (onSkip?: () => void) => {
    if (skipOnboarding) {
      await skipOnboardingAction()
    }
    await refreshIntegrationState()
    onSkip?.()
  }, [skipOnboarding, skipOnboardingAction, refreshIntegrationState])

  const handleSuccess = useCallback(async (onSuccess?: () => void) => {
    await refreshIntegrationState()
    onSuccess?.()
  }, [refreshIntegrationState])

  return {
    refreshIntegrationState,
    handleSkip,
    handleSuccess,
  }
}
