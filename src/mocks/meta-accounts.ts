import type { MetaAdAccount, MetaCampaign } from '../features/onboarding/types';

export const mockMetaAdAccounts: MetaAdAccount[] = [
  {
    id: 'meta-acc-1',
    name: 'Acme Corp Facebook',
    accountId: 'act_123456789',
    businessName: 'Acme Corporation',
  },
  {
    id: 'meta-acc-2',
    name: 'Instagram Shop',
    accountId: 'act_987654321',
    businessName: 'Acme Corporation',
  },
  {
    id: 'meta-acc-3',
    name: 'Agency Client Account',
    accountId: 'act_555666777',
    businessName: 'Digital Agency Inc',
  },
];

export const mockMetaCampaigns: MetaCampaign[] = [
  {
    id: 'meta-camp-1',
    accountId: 'meta-acc-1',
    name: 'Conversions - Website',
    status: 'active',
    objective: 'CONVERSIONS',
    dailyBudget: 150,
    currency: 'USD',
  },
  {
    id: 'meta-camp-2',
    accountId: 'meta-acc-1',
    name: 'Reach - Brand Awareness',
    status: 'active',
    objective: 'REACH',
    dailyBudget: 75,
    currency: 'USD',
  },
  {
    id: 'meta-camp-3',
    accountId: 'meta-acc-1',
    name: 'Traffic - Blog Posts',
    status: 'paused',
    objective: 'TRAFFIC',
    dailyBudget: 50,
    currency: 'USD',
  },
  {
    id: 'meta-camp-4',
    accountId: 'meta-acc-2',
    name: 'Instagram Shopping',
    status: 'active',
    objective: 'PRODUCT_CATALOG_SALES',
    dailyBudget: 200,
    currency: 'USD',
  },
  {
    id: 'meta-camp-5',
    accountId: 'meta-acc-3',
    name: 'Lead Generation',
    status: 'active',
    objective: 'LEAD_GENERATION',
    dailyBudget: 100,
    currency: 'USD',
  },
];
