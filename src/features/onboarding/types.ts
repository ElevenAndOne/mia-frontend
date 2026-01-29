import type { AuthProvider } from '../auth/types';

export type OnboardingStep =
  | 'landing'
  | 'google-accounts'
  | 'google-campaigns'
  | 'meta-accounts'
  | 'meta-campaigns'
  | 'chat';

// Numeric step for API integration (0-5)
export type OnboardingNumericStep = 0 | 1 | 2 | 3 | 4 | 5;

// Bronze insight data
export type BronzeHighlight = {
  id: string;
  platform: string;
  title: string;
  highlight: string;
  metric: string;
  metricValue: number;
  trend: 'up' | 'down' | 'neutral';
  explanation: string;
};

export type BronzeFollowup = {
  id: string;
  question: string;
  answer: string;
};

// Onboarding status from API
export type OnboardingStatus = {
  step: OnboardingNumericStep;
  googleConnected: boolean;
  metaConnected: boolean;
  campaignsSelected: boolean;
  growTaskId: string | null;
  growInsightsReady: boolean;
};

export type OnboardingState = {
  currentStep: OnboardingStep;
  numericStep: OnboardingNumericStep;
  provider: AuthProvider | null;
  selectedAccountId: string | null;
  selectedCampaignIds: string[];
  // Background task tracking
  growTaskId: string | null;
  growInsightsReady: boolean;
  bronzeHighlight: BronzeHighlight | null;
};

export type OnboardingAction =
  | { type: 'LOGIN'; provider: AuthProvider }
  | { type: 'SELECT_ACCOUNT'; accountId: string }
  | { type: 'SELECT_CAMPAIGNS'; campaignIds: string[] }
  | { type: 'NEXT_STEP' }
  | { type: 'BACK' }
  | { type: 'RESET' }
  | { type: 'SET_NUMERIC_STEP'; step: OnboardingNumericStep }
  | { type: 'SET_GROW_TASK'; taskId: string }
  | { type: 'SET_GROW_INSIGHTS_READY'; ready: boolean }
  | { type: 'SET_BRONZE_HIGHLIGHT'; highlight: BronzeHighlight };

export type OnboardingContextValue = OnboardingState & {
  login: (provider: AuthProvider) => void;
  selectAccount: (accountId: string) => void;
  selectCampaigns: (campaignIds: string[]) => void;
  nextStep: () => void;
  back: () => void;
  reset: () => void;
  setNumericStep: (step: OnboardingNumericStep) => void;
  setGrowTask: (taskId: string) => void;
  setGrowInsightsReady: (ready: boolean) => void;
  setBronzeHighlight: (highlight: BronzeHighlight) => void;
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
