import { useState, useEffect } from 'react'
import { apiFetch } from '../../../utils/api'
import { useSession } from '../../../contexts/session-context'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'

interface LinkedInAdAccount {
  id: string
  name: string
  status: string
  type: string
  currency: string
}

interface LinkedInOrganization {
  id: string
  name: string
}

interface LinkedInAccountSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const LinkedInAccountSelector = ({ isOpen, onClose, onSuccess }: LinkedInAccountSelectorProps) => {
  const { sessionId } = useSession()
  const [adAccounts, setAdAccounts] = useState<LinkedInAdAccount[]>([])
  const [organizations, setOrganizations] = useState<LinkedInOrganization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)

  const [state, actions] = useSelectorState<string>({
    onSuccess,
    onClose,
  })

  useEffect(() => {
    if (isOpen) {
      fetchLinkedInAccounts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchLinkedInAccounts = async () => {
    actions.setIsLoading(true)
    actions.setError(null)

    try {
      const response = await apiFetch('/api/oauth/linkedin/accounts', {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId || 'default',
        },
      })

      const data = await response.json()

      if (data.success) {
        setAdAccounts(data.ad_accounts || [])
        setOrganizations(data.organizations || [])

        if (data.ad_accounts?.length === 1) {
          actions.setSelectedId(data.ad_accounts[0].id)
        }
        if (data.organizations?.length === 1) {
          setSelectedOrgId(data.organizations[0].id)
        }
      } else {
        actions.setError(data.error || 'Failed to fetch LinkedIn accounts')
      }
    } catch {
      actions.setError('Failed to load LinkedIn accounts. Please try again.')
    } finally {
      actions.setIsLoading(false)
    }
  }

  const handleLinkAccount = async () => {
    if (!state.selectedId && !selectedOrgId) {
      actions.setError('Please select an ad account or organization')
      return
    }

    await actions.withSubmitting(async () => {
      const response = await apiFetch('/api/oauth/linkedin/link-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default',
        },
        body: JSON.stringify({
          ad_account_id: state.selectedId || null,
          ad_account_name: adAccounts.find(a => a.id === state.selectedId)?.name || null,
          organization_id: selectedOrgId || null,
          organization_name: organizations.find(o => o.id === selectedOrgId)?.name || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        actions.handleSuccess()
      } else {
        throw new Error(data.message || 'Failed to link LinkedIn account')
      }
    })
  }

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="LinkedIn Accounts"
      subtitle="Select your LinkedIn Ad Account and/or Company Page"
      icon={
        <svg className="w-6 h-6 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      }
      iconBgColor="bg-blue-50"
      isLoading={state.isLoading}
      loadingMessage="Discovering LinkedIn accounts..."
      error={state.error}
      success={state.success}
      successMessage="LinkedIn account linked!"
      isEmpty={adAccounts.length === 0 && organizations.length === 0}
      emptyMessage="No LinkedIn accounts found."
      emptySubMessage="Make sure your LinkedIn app has the right permissions."
      isSubmitting={state.isSubmitting}
      onSubmit={handleLinkAccount}
      submitLabel="Link Account"
      submitLoadingLabel="Linking..."
      submitDisabled={!state.selectedId && !selectedOrgId}
      accentColor="black"
    >
      <div className="space-y-4 max-h-72 overflow-y-auto">
        {/* Ad Accounts Section */}
        {adAccounts.length > 0 && (
          <div>
            <h4 className="label-sm text-secondary mb-2">Ad Accounts</h4>
            <div className="space-y-2">
              {adAccounts.map((account) => (
                <SelectorItem
                  key={account.id}
                  isSelected={state.selectedId === account.id}
                  onSelect={() => actions.setSelectedId(account.id)}
                  title={account.name}
                  subtitle={`ID: ${account.id} | ${account.status} | ${account.currency}`}
                  accentColor="black"
                  selectionStyle="radio"
                />
              ))}
            </div>
          </div>
        )}

        {/* Organizations Section */}
        {organizations.length > 0 && (
          <div>
            <h4 className="label-sm text-secondary mb-2">Company Pages (Organic)</h4>
            <div className="space-y-2">
              {organizations.map((org) => (
                <SelectorItem
                  key={org.id}
                  isSelected={selectedOrgId === org.id}
                  onSelect={() => setSelectedOrgId(org.id)}
                  title={org.name}
                  subtitle={`Organization ID: ${org.id}`}
                  accentColor="black"
                  selectionStyle="radio"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AccountSelectorModal>
  )
}

export default LinkedInAccountSelector