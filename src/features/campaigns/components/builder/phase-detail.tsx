import { useState } from 'react'
import { EditableText } from '../../../../components/editable-text'
import { EditableTextarea } from '../../../../components/editable-textarea'
import { ChannelActionCard } from './channel-action-card'
import { KpiList } from './kpi-list'
import { ManageChannelsModal } from './manage-channels-modal'
import { AskMiaButton } from '../ask-mia/ask-mia-button'
import { usePhaseEditor } from '../../hooks/use-phase-editor'
import { PLATFORM_LABELS } from '../../utils/channel-colors'
import type { ChannelConfig, LinkedCampaign, Phase } from '../../types'

interface ListOption { list_id: number; name: string; size: number }
const HIDE_FROM_PICKER = ['ga4', 'airtable', 'facebook_organic', 'instagram_organic', 'display']
const BREVO_CHANNELS = ['brevo', 'email', 'email_marketing', 'email_newsletter', 'newsletter']

interface Props {
  phase: Phase
  currency: string | null
  hubspotLists: ListOption[]
  hubspotListsMessage: string | null
  brevoLists: ListOption[]
  channelConfig: ChannelConfig
  onSaveChannelConfig: (config: ChannelConfig) => Promise<boolean> | boolean
  onOpenPicker: (actionId: string, channel: string, current: LinkedCampaign[]) => void
}

export const PhaseDetail = ({
  phase, currency, hubspotLists, hubspotListsMessage, brevoLists,
  channelConfig, onSaveChannelConfig, onOpenPicker,
}: Props) => {
  const { patchPhase, addKpi, patchKpi, deleteKpi, addChannel, removeChannel } = usePhaseEditor(phase.phase_id)
  const [addingChannel, setAddingChannel] = useState(false)
  const [newChannel, setNewChannel] = useState('')
  const [managing, setManaging] = useState(false)

  const channelOptions: [string, string][] = [
    ...Object.entries(PLATFORM_LABELS).filter(([k]) => ![...HIDE_FROM_PICKER, ...channelConfig.hidden].includes(k)),
    ...channelConfig.custom.map((c) => [c.key, c.label] as [string, string]),
  ]
  const phaseHasHubspot = phase.channel_actions.some((ca) => ca.channel === 'hubspot')
  const phaseHasBrevo = phase.channel_actions.some((ca) => BREVO_CHANNELS.includes((ca.channel ?? '').toLowerCase()))
  const phaseHasLeadKpi = phase.kpis.some((k) => /lead|contact/i.test(k.kpi_name))
  const suggestHubspot = phaseHasLeadKpi && !phaseHasHubspot && hubspotLists.length > 0

  const submitChannel = async () => {
    if (!newChannel) return
    await addChannel(newChannel)
    setNewChannel('')
    setAddingChannel(false)
  }

  const removeWithConfirm = (actionId: string) => {
    if (confirm('Remove this channel?')) void removeChannel(actionId)
  }

  return (
    <div className="bg-secondary-alt rounded-2xl border border-secondary p-5 space-y-5">
      <div className="space-y-3">
        <h3 className="title-h6 text-primary flex items-center gap-1.5">
          <EditableText value={phase.phase_name} onSave={(v) => { if (v.trim() && v.trim() !== phase.phase_name) patchPhase({ phase_name: v.trim() }) }} className="title-h6 text-primary" />
          <span className="text-tertiary font-normal">Phase</span>
        </h3>
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="label-xs text-quaternary uppercase tracking-wide">Objective</p>
            <AskMiaButton context={{ fieldLabel: 'phase objective', phaseName: phase.phase_name }} currentValue={phase.objective ?? ''} onInsert={(t) => patchPhase({ objective: t })} />
          </div>
          <EditableTextarea value={phase.objective ?? ''} onSave={(v) => patchPhase({ objective: v || null })} placeholder="Add phase objective…" rows={2} className="paragraph-sm text-secondary" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="label-xs text-quaternary uppercase tracking-wide">Strategy</p>
            <AskMiaButton context={{ fieldLabel: 'phase strategy', phaseName: phase.phase_name }} currentValue={phase.strategy ?? ''} onInsert={(t) => patchPhase({ strategy: t })} />
          </div>
          <EditableTextarea value={phase.strategy ?? ''} onSave={(v) => patchPhase({ strategy: v || null })} placeholder="Add phase strategy…" rows={2} className="paragraph-sm text-secondary" />
        </div>
      </div>

      {phaseHasHubspot && hubspotLists.length === 0 && hubspotListsMessage && (
        <p className="paragraph-xs text-quaternary italic">{hubspotListsMessage}</p>
      )}

      <KpiList
        kpis={phase.kpis}
        hubspotLists={hubspotLists}
        brevoLists={brevoLists}
        phaseHasHubspot={phaseHasHubspot}
        phaseHasBrevo={phaseHasBrevo}
        onPatchKpi={patchKpi}
        onDeleteKpi={deleteKpi}
        onAddKpi={addKpi}
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="label-xs text-quaternary uppercase tracking-wide">Channels ({phase.channel_actions.length})</p>
          <button onClick={() => setManaging(true)} className="text-quaternary hover:text-secondary" title="Manage channel options">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>
        <div className="space-y-2.5">
          {phase.channel_actions.map((ca) => (
            <ChannelActionCard key={ca.action_id} phaseId={phase.phase_id} phaseName={phase.phase_name} action={ca} currency={currency} onRemove={() => removeWithConfirm(ca.action_id)} onOpenPicker={onOpenPicker} />
          ))}
        </div>
        {suggestHubspot && (
          <p className="mt-2 paragraph-xs text-utility-warning-700 bg-utility-warning-50 border border-utility-warning-200 rounded-lg px-2.5 py-1.5">
            This phase tracks leads but HubSpot isn't a channel here. Add HubSpot and link the list so Mia can pull the real number.
          </p>
        )}
        {addingChannel ? (
          <div className="flex items-center gap-2 mt-2.5">
            <select value={newChannel} onChange={(e) => setNewChannel(e.target.value)} autoFocus className="flex-1 px-2 py-1.5 border border-tertiary rounded-lg text-xs bg-primary text-secondary outline-none">
              <option value="">Select channel…</option>
              {channelOptions.map(([key, lbl]) => <option key={key} value={key}>{lbl}</option>)}
            </select>
            <button onClick={submitChannel} className="label-xs text-utility-brand-600 hover:text-utility-brand-700 shrink-0">Add</button>
            <button onClick={() => { setAddingChannel(false); setNewChannel('') }} className="label-xs text-quaternary shrink-0">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAddingChannel(true)} className="mt-2.5 label-xs text-quaternary hover:text-secondary">+ Add channel</button>
        )}
      </div>

      {managing && <ManageChannelsModal config={channelConfig} onClose={() => setManaging(false)} onSave={onSaveChannelConfig} />}
    </div>
  )
}
