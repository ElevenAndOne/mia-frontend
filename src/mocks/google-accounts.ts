import type { GoogleAccount, GoogleCampaign } from '../features/onboarding/types';

export const mockGoogleAccounts: GoogleAccount[] = [
  {
    id: 'goog-acc-1',
    name: 'Acme Corp Ads',
    email: 'ads@acmecorp.com',
    customerId: '123-456-7890',
  },
  {
    id: 'goog-acc-2',
    name: 'Personal Account',
    email: 'demo@gmail.com',
    customerId: '098-765-4321',
  },
  {
    id: 'goog-acc-3',
    name: 'Startup Ventures',
    email: 'marketing@startup.io',
    customerId: '555-123-4567',
  },
];

export const mockGoogleCampaigns: GoogleCampaign[] = [
  {
    id: 'goog-camp-1',
    accountId: 'goog-acc-1',
    name: 'Brand Awareness Q1',
    status: 'active',
    budget: 5000,
    currency: 'USD',
  },
  {
    id: 'goog-camp-2',
    accountId: 'goog-acc-1',
    name: 'Product Launch 2024',
    status: 'active',
    budget: 10000,
    currency: 'USD',
  },
  {
    id: 'goog-camp-3',
    accountId: 'goog-acc-1',
    name: 'Holiday Sale',
    status: 'paused',
    budget: 7500,
    currency: 'USD',
  },
  {
    id: 'goog-camp-4',
    accountId: 'goog-acc-2',
    name: 'Personal Blog Promo',
    status: 'active',
    budget: 500,
    currency: 'USD',
  },
  {
    id: 'goog-camp-5',
    accountId: 'goog-acc-3',
    name: 'Series A Launch',
    status: 'active',
    budget: 15000,
    currency: 'USD',
  },
  {
    id: 'goog-camp-6',
    accountId: 'goog-acc-3',
    name: 'Retargeting Campaign',
    status: 'active',
    budget: 3000,
    currency: 'USD',
  },
];
