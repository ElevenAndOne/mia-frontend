import { createContext } from 'react';
import type { OnboardingContextValue } from './types';

const defaultContextValue: OnboardingContextValue = {
  currentStep: 'landing',
  provider: null,
  selectedAccountId: null,
  selectedCampaignIds: [],
  login: () => {},
  selectAccount: () => {},
  selectCampaigns: () => {},
  nextStep: () => {},
  back: () => {},
  reset: () => {},
};

export const OnboardingContext =
  createContext<OnboardingContextValue>(defaultContextValue);
