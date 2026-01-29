import { useState } from 'react';
import { Layout } from '../../components/layout';
import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { useOnboarding } from '../../features/onboarding/use-onboarding';
import { useMetaCampaigns } from '../../features/onboarding/use-meta-campaigns';

export function MetaCampaignsScreen() {
  const { selectedAccountId, selectedCampaignIds, selectCampaigns, nextStep, back } = useOnboarding();
  const { campaigns, status } = useMetaCampaigns(selectedAccountId);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedCampaignIds);

  const toggleCampaign = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    if (selectedIds.length > 0) {
      selectCampaigns(selectedIds);
      nextStep();
    }
  };

  const formatBudget = (budget: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(budget);
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 overflow-y-auto px-4 py-8">
        <div className="space-y-2">
          <button
            onClick={back}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Select Meta Campaigns
          </h1>
          <p className="text-gray-600">
            Choose which campaigns you want to monitor
          </p>
          <div className="text-sm text-gray-500">Step 2 of 2</div>
        </div>

        {status === 'loading' && (
          <div className="py-8 text-center text-gray-500">
            Loading campaigns...
          </div>
        )}

        {status === 'success' && campaigns.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No campaigns found for this account
          </div>
        )}

        {status === 'success' && campaigns.length > 0 && (
          <div className="space-y-3">
            {campaigns.map(campaign => (
              <Card
                key={campaign.id}
                selected={selectedIds.includes(campaign.id)}
                onClick={() => toggleCampaign(campaign.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {campaign.name}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <StatusBadge status={campaign.status} />
                      <span className="text-gray-500">{campaign.objective}</span>
                      <span className="text-gray-500">
                        {formatBudget(campaign.dailyBudget, campaign.currency)}/day
                      </span>
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded border ${
                      selectedIds.includes(campaign.id)
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300 bg-white'
                    } flex items-center justify-center`}
                  >
                    {selectedIds.includes(campaign.id) && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {selectedIds.length} campaign{selectedIds.length !== 1 ? 's' : ''}{' '}
            selected
          </span>
          <Button
            onClick={handleContinue}
            disabled={selectedIds.length === 0 || status === 'loading'}
          >
            Continue
          </Button>
        </div>
      </div>
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  );
}
