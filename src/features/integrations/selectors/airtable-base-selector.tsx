import { useState, useEffect } from 'react'
import { apiFetch } from '../../../utils/api'
import { useSession } from '../../../contexts/session-context'
import { AccountSelectorModal } from './components/account-selector-modal'
import { SelectorItem } from './components/selector-item'
import { useSelectorState } from './hooks/use-selector-state'

interface AirtableBase {
  id: string
  name: string
}

interface AirtableBaseSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const AirtableBaseSelector = ({ isOpen, onClose, onSuccess }: AirtableBaseSelectorProps) => {
  const { sessionId } = useSession()
  const [bases, setBases] = useState<AirtableBase[]>([])

  const [state, actions] = useSelectorState<string>({
    onSuccess,
    onClose,
  })

  useEffect(() => {
    if (isOpen) {
      actions.resetState()
      fetchBases()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const fetchBases = async () => {
    actions.setIsLoading(true)
    actions.setError(null)

    try {
      const response = await apiFetch('/api/oauth/airtable/bases', {
        method: 'GET',
        headers: {
          'X-Session-ID': sessionId || 'default',
        },
      })

      const data = await response.json()

      if (data.success && data.bases) {
        setBases(data.bases)

        if (data.bases.length === 1) {
          actions.setSelectedId(data.bases[0].id)
        }
      } else {
        actions.setError(data.detail || 'Failed to fetch Airtable bases')
      }
    } catch {
      actions.setError('Failed to load Airtable bases. Please try again.')
    } finally {
      actions.setIsLoading(false)
    }
  }

  const handleSelectBase = async () => {
    if (!state.selectedId) {
      actions.setError('Please select a base')
      return
    }

    const selectedBase = bases.find(b => b.id === state.selectedId)

    await actions.withSubmitting(async () => {
      const response = await apiFetch('/api/oauth/airtable/select-base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId || 'default',
        },
        body: JSON.stringify({
          base_id: state.selectedId,
          base_name: selectedBase?.name,
        }),
      })

      const data = await response.json()

      if (data.success) {
        actions.handleSuccess()
      } else {
        throw new Error(data.detail || 'Failed to select base')
      }
    })
  }

  return (
    <AccountSelectorModal
      isOpen={isOpen}
      onClose={actions.handleClose}
      title="Airtable Bases"
      subtitle="Select which Airtable base to use for content calendar data"
      icon={
        <img src="/icons/Airtable.png" alt="Airtable" className="w-6 h-6" />
      }
      iconBgColor="bg-utility-info-200"
      isLoading={state.isLoading}
      loadingMessage="Loading Airtable bases..."
      error={state.error}
      success={state.success}
      successMessage="Base connected successfully!"
      isEmpty={bases.length === 0}
      emptyMessage="No Airtable bases found."
      emptySubMessage="Make sure you granted access to at least one base during authorization."
      isSubmitting={state.isSubmitting}
      onSubmit={handleSelectBase}
      submitLabel="Select Base"
      submitLoadingLabel="Selecting..."
      submitDisabled={!state.selectedId}
      accentColor="blue"
    >
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {bases.map((base) => (
          <SelectorItem
            key={base.id}
            isSelected={state.selectedId === base.id}
            onSelect={() => actions.setSelectedId(base.id)}
            title={base.name}
            subtitle={`ID: ${base.id}`}
            accentColor="blue"
            selectionStyle="radio"
          />
        ))}
      </div>
    </AccountSelectorModal>
  )
}

export default AirtableBaseSelector
