import { useCallback, useState } from 'react'
import { suggestField, type SuggestFieldBody } from '../services/campaign-api'
import { useCampaignWorkspace } from '../contexts/campaign-context'

export interface AskMiaContext {
  fieldLabel: string // e.g. "strategy", "asset copy", "caption"
  phaseName?: string
  channel?: string // human label, e.g. "Meta Ads"
  assetName?: string
  assetType?: string | null
}

// Fetches a campaign-scoped suggestion for one field via the dedicated
// (non-persisting) Sonnet 4.6 endpoint. Used by the inline Ask Mia affordance.
export function useAskMia(context: AskMiaContext) {
  const { tenantId, sessionId, campaign } = useCampaignWorkspace()
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(
    async (currentValue?: string) => {
      setLoading(true)
      setError(null)
      const body: SuggestFieldBody = {
        field_label: context.fieldLabel,
        phase_name: context.phaseName,
        channel: context.channel,
        asset_name: context.assetName,
        asset_type: context.assetType ?? undefined,
        current_value: currentValue || undefined,
      }
      try {
        setSuggestion(await suggestField(sessionId, tenantId, campaign.campaign_id, body))
      } catch {
        setError("Couldn't reach Mia — try again.")
      } finally {
        setLoading(false)
      }
    },
    [sessionId, tenantId, campaign.campaign_id, context],
  )

  const reset = useCallback(() => {
    setSuggestion(null)
    setError(null)
  }, [])

  return { suggestion, loading, error, generate, reset }
}
