import { createContext } from 'react';
import type { OnboardingContextValue } from './types';

const defaultContextValue: OnboardingContextValue = {
  currentStep: 'landing',
  numericStep: 0,
  provider: null,
  selectedAccountId: null,
  selectedCampaignIds: [],
  growTaskId: null,
  growInsightsReady: false,
  bronzeHighlight: null,
  login: () => {},
  selectAccount: () => {},
  selectCampaigns: () => {},
  nextStep: () => {},
  back: () => {},
  reset: () => {},
  setNumericStep: () => {},
  setGrowTask: () => {},
  setGrowInsightsReady: () => {},
  setBronzeHighlight: () => {},
};

export const OnboardingContext =
  createContext<OnboardingContextValue>(defaultContextValue);
