import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BuilderHeader } from '../components/builder/builder-header'
import { ObjectivesEditor } from '../components/builder/objectives-editor'
import { PhaseStepper } from '../components/builder/phase-stepper'
import { PhaseDetail } from '../components/builder/phase-detail'
import { CampaignPickerModal } from '../components/builder/campaign-picker-modal'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import { useCampaignMutations } from '../hooks/use-campaign-mutations'
import { useWorkspaceLists } from '../hooks/use-workspace-lists'
import { defaultPhaseIndex } from '../utils/campaign-dates'
import type { LinkedCampaign } from '../types'

type PickerTarget = { actionId: string; channel: string; current: LinkedCampaign[] }

export const BuilderView = () => {
  const { campaign } = useCampaignWorkspace()
  const { patchCampaign, saveObjectives, savePickerLinks } = useCampaignMutations()
  const lists = useWorkspaceLists()
  const navigate = useNavigate()

  const sortedPhases = useMemo(() => [...campaign.phases].sort((a, b) => a.sort_order - b.sort_order), [campaign.phases])
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
  const [picker, setPicker] = useState<PickerTarget | null>(null)

  useEffect(() => {
    setSelectedPhaseId(sortedPhases[defaultPhaseIndex(campaign)]?.phase_id ?? sortedPhases[0]?.phase_id ?? null)
  }, [campaign.campaign_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPhase = sortedPhases.find((p) => p.phase_id === selectedPhaseId) ?? sortedPhases[0] ?? null

  return (
    <div className="space-y-5">
      {campaign.status === 'draft' && (
        <div className="bg-utility-warning-50 border border-utility-warning-200 rounded-xl p-3 flex items-center justify-between gap-3">
          <p className="paragraph-sm text-utility-warning-700">This campaign is a DRAFT — activate it to start tracking actuals.</p>
          <button onClick={() => patchCampaign({ status: 'live' })} className="shrink-0 px-3 py-1.5 bg-utility-warning-600 text-white rounded-lg label-sm hover:bg-utility-warning-700">Set to Live</button>
        </div>
      )}
      {lists.hubspotNeedsReconnect && (
        <div className="bg-utility-warning-50 border border-utility-warning-200 rounded-xl p-3">
          <p className="paragraph-sm text-utility-warning-700">HubSpot needs reconnecting — HubSpot-sourced KPIs won't update until you reconnect it from Integrations.</p>
        </div>
      )}

      <BuilderHeader guides={lists.guides} onBuildNew={() => navigate('/campaigns/new')} />

      <ObjectivesEditor objectives={campaign.objectives} onSave={saveObjectives} />

      {sortedPhases.length > 0 && selectedPhase && (
        <div className="space-y-3">
          <p className="label-xs text-quaternary uppercase tracking-wide">Campaign Phases</p>
          <PhaseStepper phases={sortedPhases} selectedId={selectedPhase.phase_id} onSelect={setSelectedPhaseId} />
          <PhaseDetail
            phase={selectedPhase}
            currency={campaign.budget_currency}
            hubspotLists={lists.hubspotLists}
            hubspotListsMessage={lists.hubspotListsMessage}
            brevoLists={lists.brevoLists}
            channelConfig={lists.channelConfig}
            onSaveChannelConfig={lists.saveChannelConfig}
            onOpenPicker={(actionId, channel, current) => setPicker({ actionId, channel, current })}
          />
        </div>
      )}

      {picker && (
        <CampaignPickerModal
          channel={picker.channel}
          current={picker.current}
          onClose={() => setPicker(null)}
          onSave={(selected) => { void savePickerLinks(picker.actionId, selected); setPicker(null) }}
        />
      )}
    </div>
  )
}
