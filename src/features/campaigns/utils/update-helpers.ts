// Pure immutable updaters for the nested campaign tree. Keep mutation hooks tiny
// and consistent: locate a phase / action / asset and replace it in place.

import type { Asset, CampaignDetail, ChannelAction, Phase } from '../types'

export const mapPhase = (
  campaign: CampaignDetail,
  phaseId: string,
  fn: (phase: Phase) => Phase,
): CampaignDetail => ({
  ...campaign,
  phases: campaign.phases.map((p) => (p.phase_id === phaseId ? fn(p) : p)),
})

export const mapAction = (
  phase: Phase,
  actionId: string,
  fn: (action: ChannelAction) => ChannelAction,
): Phase => ({
  ...phase,
  channel_actions: phase.channel_actions.map((a) => (a.action_id === actionId ? fn(a) : a)),
})

export const mapAsset = (
  action: ChannelAction,
  assetId: string,
  fn: (asset: Asset) => Asset,
): ChannelAction => ({
  ...action,
  assets: action.assets.map((a) => (a.asset_id === assetId ? fn(a) : a)),
})
