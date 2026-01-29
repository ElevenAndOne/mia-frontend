import type { AuthProvider } from '../auth/types';

export type OnboardingStep =
  | 'landing'
  | 'google-accounts'
  | 'google-campaigns'
  | 'meta-accounts'
  | 'meta-campaigns'
  | 'chat';

export type OnboardingState = {
  currentStep: OnboardingStep;
  provider: AuthProvider | null;
  selectedAccountId: string | null;
  selectedCampaignIds: string[];
};

export type OnboardingAction =
  | { type: 'LOGIN'; provider: AuthProvider }
  | { type: 'SELECT_ACCOUNT'; accountId: string }
  | { type: 'SELECT_CAMPAIGNS'; campaignIds: string[] }
  | { type: 'NEXT_STEP' }
  | { type: 'BACK' }
  | { type: 'RESET' };

export type OnboardingContextValue = OnboardingState & {
  login: (provider: AuthProvider) => void;
  selectAccount: (accountId: string) => void;
  selectCampaigns: (campaignIds: string[]) => void;
  nextStep: () => void;
  back: () => void;
  reset: () => void;
};

// Google-specific types
export type GoogleAccount = {
  id: string;
  name: string;
  email: string;
  customerId: string;
};

export type GoogleCampaign = {
  id: string;
  accountId: string;
  name: string;
  status: 'active' | 'paused' | 'removed';
  budget: number;
  currency: string;
};

// Meta-specific types
export type MetaAdAccount = {
  id: string;
  name: string;
  accountId: string;
  businessName: string | null;
};

export type MetaCampaign = {
  id: string;
  accountId: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  objective: string;
  dailyBudget: number;
  currency: string;
};
