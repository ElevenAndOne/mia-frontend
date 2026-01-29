import { useState } from 'react';
import { Layout } from '../../components/layout';
import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { useOnboarding } from '../../features/onboarding/use-onboarding';
import { useGoogleAccounts } from '../../features/onboarding/use-google-accounts';

export function GoogleAccountsScreen() {
  const { selectedAccountId, selectAccount, nextStep, back } = useOnboarding();
  const { accounts, status } = useGoogleAccounts();
  const [selectedId, setSelectedId] = useState<string | null>(selectedAccountId);

  const handleContinue = () => {
    if (selectedId) {
      selectAccount(selectedId);
      nextStep();
    }
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
            Select Google Ads Account
          </h1>
          <p className="text-gray-600">
            Choose which Google Ads account you want to connect
          </p>
          <div className="text-sm text-gray-500">Step 1 of 2</div>
        </div>

        {status === 'loading' && (
          <div className="py-8 text-center text-gray-500">
            Loading accounts...
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            {accounts.map(account => (
              <Card
                key={account.id}
                selected={selectedId === account.id}
                onClick={() => setSelectedId(account.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {account.name}
                    </div>
                    <div className="text-sm text-gray-500">{account.email}</div>
                    <div className="text-xs text-gray-400">
                      ID: {account.customerId}
                    </div>
                  </div>
                  {selectedId === account.id && (
                    <div className="text-blue-600">
                      <CheckIcon />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <Button
          fullWidth
          onClick={handleContinue}
          disabled={!selectedId || status === 'loading'}
        >
          Continue
        </Button>
      </div>
    </Layout>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
