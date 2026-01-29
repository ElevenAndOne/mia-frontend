import { useReducer, useCallback, type ReactNode } from 'react';
import type { AuthProvider } from '../auth/types';
import type {
  OnboardingStep,
  OnboardingState,
  OnboardingAction,
} from './types';
import { OnboardingContext } from './onboarding-context-value';

const initialState: OnboardingState = {
  currentStep: 'landing',
  provider: null,
  selectedAccountId: null,
  selectedCampaignIds: [],
};

function getNextStep(state: OnboardingState): OnboardingStep {
  const { currentStep, provider } = state;

  if (!provider) return 'landing';

  const flowMap: Record<AuthProvider, Partial<Record<OnboardingStep, OnboardingStep>>> = {
    google: {
      landing: 'google-accounts',
      'google-accounts': 'google-campaigns',
      'google-campaigns': 'chat',
    },
    meta: {
      landing: 'meta-accounts',
      'meta-accounts': 'meta-campaigns',
      'meta-campaigns': 'chat',
    },
    email: {
      landing: 'chat',
    },
  };

  return flowMap[provider][currentStep] ?? 'chat';
}

function getPreviousStep(state: OnboardingState): OnboardingStep {
  const { currentStep, provider } = state;

  if (!provider) return 'landing';

  const flowMap: Record<AuthProvider, Partial<Record<OnboardingStep, OnboardingStep>>> = {
    google: {
      'google-accounts': 'landing',
      'google-campaigns': 'google-accounts',
      chat: 'google-campaigns',
    },
    meta: {
      'meta-accounts': 'landing',
      'meta-campaigns': 'meta-accounts',
      chat: 'meta-campaigns',
    },
    email: {
      chat: 'landing',
    },
  };

  return flowMap[provider][currentStep] ?? 'landing';
}

function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction
): OnboardingState {
  switch (action.type) {
    case 'LOGIN': {
      const firstStep =
        action.provider === 'google'
          ? 'google-accounts'
          : action.provider === 'meta'
            ? 'meta-accounts'
            : 'chat';
      return {
        ...state,
        provider: action.provider,
        currentStep: firstStep,
      };
    }

    case 'SELECT_ACCOUNT':
      return {
        ...state,
        selectedAccountId: action.accountId,
      };

    case 'SELECT_CAMPAIGNS':
      return {
        ...state,
        selectedCampaignIds: action.campaignIds,
      };

    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: getNextStep(state),
      };

    case 'BACK': {
      const previousStep = getPreviousStep(state);
      // Reset selections when going back to landing (different auth possible)
      if (previousStep === 'landing') {
        return initialState;
      }
      return {
        ...state,
        currentStep: previousStep,
      };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

type OnboardingProviderProps = {
  children: ReactNode;
};

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  const login = useCallback((provider: AuthProvider) => {
    dispatch({ type: 'LOGIN', provider });
  }, []);

  const selectAccount = useCallback((accountId: string) => {
    dispatch({ type: 'SELECT_ACCOUNT', accountId });
  }, []);

  const selectCampaigns = useCallback((campaignIds: string[]) => {
    dispatch({ type: 'SELECT_CAMPAIGNS', campaignIds });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const back = useCallback(() => {
    dispatch({ type: 'BACK' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value = {
    ...state,
    login,
    selectAccount,
    selectCampaigns,
    nextStep,
    back,
    reset,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
