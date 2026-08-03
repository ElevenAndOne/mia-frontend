import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../../../contexts/session-context'
import { CreativePreview } from '../../../chat/components/previews/creative-preview'
import { HighlightToolbar } from '../../../chat/components/highlight-toolbar'
import type { AssetContext } from '../../../chat/services/chat-service'
import { channelLabel } from '../../utils/channel-colors'
import { assetToCreativeSpec } from '../../utils/asset-preview'
import type { DraftPhase } from '../../utils/plan-draft'
import { MagicWand02 } from '../../../../components/icon/magic-wand-02'
import { XClose } from '../../../../components/icon/x-close'
import { useTextSelection } from '../../../../hooks/use-text-selection'
import { fetchCampaignDetail, patchAsset, uploadAssetMedia } from '../../services/campaign-api'
import { clearCampaignDetailCache } from '../../campaign-detail-cache'
import type { Asset, CampaignDetail } from '../../types'

interface BuilderCanvasProps {
  /** Saved campaign to render — null while the plan is still an unsaved proposal. */
  campaignId: string | null
  /** Bumped on every campaign_saved stream event → refetch (progressive population). */
  refreshKey: number
  /** Parsed from Mia's plan-proposal text — previews before the user confirms the save. */
  draft?: DraftPhase[] | null
  /** Highlight-to-edit: sends the instruction + asset context through the builder chat. */
  onRequestEdit?: (instruction: string, assetContext: AssetContext) => void
  /** Present when hosted in the mobile full-screen sheet — renders a close button. */
  onClose?: () => void
}

interface CanvasAsset {
  asset: Asset
  channel: string
}

interface CanvasPhase {
  key: string
  name: string
  assets: CanvasAsset[]
}

/**
 * The campaign-builder canvas. While Mia streams the plan proposal it renders
 * DRAFT previews parsed from the plan text; once the user confirms ("yes") each
 * saved phase replaces the draft with real Asset rows. Creative images upload
 * straight onto saved previews (→ deliverable_url, ClickUp-mirrored); text
 * editing goes through chat (highlight-to-edit lands next).
 */
export const BuilderCanvas = ({
  campaignId,
  refreshKey,
  draft,
  onRequestEdit,
  onClose,
}: BuilderCanvasProps) => {
  const { sessionId, activeWorkspace } = useSession()
  const tenantId = activeWorkspace?.tenant_id
  const navigate = useNavigate()

  const [detail, setDetail] = useState<CampaignDetail | null>(null)
  const [activePhaseKey, setActivePhaseKey] = useState<string | null>(null)
  const [assetIdx, setAssetIdx] = useState(0)
  // Bumped after our own writes (media upload/remove) — refetch without a save event.
  const [localRefresh, setLocalRefresh] = useState(0)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const saved = Boolean(campaignId)

  useEffect(() => {
    if (!sessionId || !tenantId || !campaignId) return
    let cancelled = false
    fetchCampaignDetail(sessionId, tenantId, campaignId)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch(() => {
        /* transient — the next save event refetches */
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, tenantId, campaignId, refreshKey, localRefresh])

  // One normalized phase list, whichever source is active.
  const phases: CanvasPhase[] = useMemo(() => {
    if (saved && detail) {
      return (detail.phases ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => ({
          key: p.phase_id,
          name: p.phase_name,
          assets: (p.channel_actions ?? []).flatMap((ca) =>
            (ca.assets ?? []).map((asset) => ({ asset, channel: ca.channel }))
          ),
        }))
    }
    return (draft ?? []).map((p) => ({ key: p.phase_name, name: p.phase_name, assets: p.assets }))
  }, [saved, detail, draft])

  const activePhase = phases.find((p) => p.key === activePhaseKey) ?? phases[0] ?? null

  // Drop a stale tab selection when the phase list changes source (draft → saved).
  useEffect(() => {
    if (activePhaseKey && !phases.some((p) => p.key === activePhaseKey)) {
      setActivePhaseKey(null)
      setAssetIdx(0)
    }
  }, [phases, activePhaseKey])

  const assets = activePhase?.assets ?? []
  const current = assets[Math.min(assetIdx, Math.max(0, assets.length - 1))]
  const spec = current ? assetToCreativeSpec(current.asset, current.channel) : null

  const canEditText = saved && Boolean(onRequestEdit) && Boolean(current)

  // Highlight-to-edit over the preview (saved assets only — drafts have no row to edit).
  // Mouseup on desktop, selectionchange on touch.
  const {
    selection,
    onMouseUp: handleMouseUp,
    clear: closeToolbar,
    selectAll,
    pickFromEvent,
  } = useTextSelection(previewRef, canEditText)

  // Mobile "Edit copy with Mia" arms tap-to-select pick mode; taps keep swapping
  // the target line until the toolbar closes.
  const [pickMode, setPickMode] = useState(false)
  const closeToolbarAndPick = useCallback(() => {
    closeToolbar()
    setPickMode(false)
  }, [closeToolbar])

  // Clear a lingering highlight when the displayed asset changes.
  useEffect(() => {
    closeToolbar()
    setPickMode(false)
  }, [activePhaseKey, assetIdx, refreshKey, localRefresh, closeToolbar])

  const submitEdit = useCallback(
    (instruction: string) => {
      if (!selection || !current || !campaignId || !onRequestEdit) return
      onRequestEdit(instruction, {
        asset_id: current.asset.asset_id,
        campaign_id: campaignId,
        asset_name: current.asset.asset_name,
        fields: {
          key_message: current.asset.key_message,
          cta: current.asset.cta,
          headline: current.asset.headline ?? null,
        },
        selection: { text: selection.text },
      })
      closeToolbar()
    },
    [selection, current, campaignId, onRequestEdit, closeToolbar]
  )

  // Media uploads land on the asset's deliverable_url (approved-creative field) —
  // ClickUp "Final Asset" mirrors and the campaign page stay in step automatically.
  const uploadMedia = useCallback(
    async (files: File[]) => {
      if (!sessionId || !tenantId || !campaignId || !current || isUploadingMedia) return
      setIsUploadingMedia(true)
      try {
        for (const f of files) {
          await uploadAssetMedia(sessionId, tenantId, campaignId, current.asset.asset_id, f)
        }
        clearCampaignDetailCache()
        setLocalRefresh((n) => n + 1)
      } catch {
        /* upload failed — slot stays as it was */
      } finally {
        setIsUploadingMedia(false)
      }
    },
    [sessionId, tenantId, campaignId, current, isUploadingMedia]
  )

  const removeMedia = useCallback(
    async (url: string) => {
      if (!sessionId || !tenantId || !campaignId || !current) return
      const remaining = (current.asset.deliverable_url ?? '')
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((u) => u !== url)
        .join('\n')
      try {
        await patchAsset(sessionId, tenantId, campaignId, current.asset.asset_id, {
          deliverable_url: remaining,
        })
        clearCampaignDetailCache()
        setLocalRefresh((n) => n + 1)
      } catch {
        /* removal failed — keep showing the image */
      }
    },
    [sessionId, tenantId, campaignId, current]
  )

  if (saved && !detail) {
    return (
      <aside className="flex flex-col h-full w-full bg-primary md:border-l md:border-tertiary min-w-0 items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-quaternary border-t-transparent rounded-full animate-spin" />
        <p className="paragraph-sm text-quaternary">Loading campaign…</p>
      </aside>
    )
  }

  return (
    <aside className="flex flex-col h-full w-full bg-primary md:border-l md:border-tertiary min-w-0">
      {/* Header */}
      <div className="border-b border-tertiary px-4 md:px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <h2 className="paragraph-md font-semibold text-primary truncate">
              {saved ? detail?.campaign_name : 'Campaign draft'}
            </h2>
            <span className="paragraph-sm text-quaternary uppercase tracking-wide">
              Campaign canvas
            </span>
          </div>
          {saved ? (
            <button
              type="button"
              onClick={() => navigate(`/campaigns/${campaignId}/builder`)}
              className="ml-auto shrink-0 px-3 py-1.5 rounded-lg paragraph-sm text-secondary border border-secondary hover:bg-tertiary transition-colors"
            >
              Open in builder →
            </button>
          ) : (
            <span className="ml-auto shrink-0 paragraph-sm text-utility-warning-600 border border-utility-warning-300 rounded-full px-2.5 py-0.5">
              Draft — type yes to save
            </span>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close canvas"
              className="shrink-0 w-10 h-10 -mr-1.5 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
            >
              <XClose size={16} />
            </button>
          )}
        </div>

        {/* Phase tabs */}
        {phases.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto mt-3 -mx-1 px-1">
            {phases.map((p) => {
              const active = p.key === activePhase?.key
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setActivePhaseKey(p.key)
                    setAssetIdx(0)
                  }}
                  className={`shrink-0 rounded-lg px-2.5 py-1 paragraph-sm transition-colors ${
                    active
                      ? 'bg-tertiary text-primary font-medium'
                      : 'text-quaternary hover:text-secondary hover:bg-tertiary/60'
                  }`}
                >
                  {p.name}
                  <span className="ml-1.5 text-quaternary">{p.assets.length}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        {assets.length === 0 ? (
          <p className="paragraph-sm text-quaternary text-center pt-16">
            No assets in {activePhase?.name ?? 'this phase'} yet — they'll appear here as Mia{' '}
            {saved ? 'saves' : 'drafts'} them.
          </p>
        ) : (
          <div className="max-w-[560px] mx-auto">
            {/* Asset strip: name + channel + flipper */}
            <div className="flex items-center gap-2 mb-4">
              <span className="paragraph-sm font-medium text-primary truncate">
                {current.asset.asset_name}
              </span>
              <span className="shrink-0 paragraph-sm text-quaternary">
                {channelLabel(current.channel)}
              </span>
              {assets.length > 1 && (
                <div className="ml-auto shrink-0 flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous asset"
                    onClick={() => setAssetIdx((i) => (i - 1 + assets.length) % assets.length)}
                    className="w-7 h-7 rounded-lg border border-secondary text-secondary hover:bg-tertiary transition-colors"
                  >
                    ‹
                  </button>
                  <span className="paragraph-sm text-quaternary tabular-nums">
                    {Math.min(assetIdx + 1, assets.length)}/{assets.length}
                  </span>
                  <button
                    type="button"
                    aria-label="Next asset"
                    onClick={() => setAssetIdx((i) => (i + 1) % assets.length)}
                    className="w-7 h-7 rounded-lg border border-secondary text-secondary hover:bg-tertiary transition-colors"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {spec ? (
              // select-text: mobile disables selection globally — re-enable for highlight-to-edit
              <div
                ref={previewRef}
                onMouseUp={handleMouseUp}
                onClick={pickMode ? pickFromEvent : undefined}
                className="select-text"
              >
                <CreativePreview
                  spec={spec}
                  brandName={activeWorkspace?.name}
                  // Uploads need a real asset row — drafts become uploadable once saved.
                  onUploadMedia={saved ? uploadMedia : undefined}
                  onRemoveMedia={saved ? removeMedia : undefined}
                  isUploadingMedia={isUploadingMedia}
                />
              </div>
            ) : (
              /* Channels without a faithful mock yet (email, display) — plain card. */
              <div className="rounded-xl border border-tertiary bg-secondary/40 px-4 py-3 flex flex-col gap-1.5">
                {current.asset.key_message && (
                  <p className="paragraph-sm text-primary whitespace-pre-line">
                    {current.asset.key_message}
                  </p>
                )}
                {current.asset.cta && (
                  <p className="paragraph-sm text-tertiary">CTA: {current.asset.cta}</p>
                )}
                {current.asset.asset_type && (
                  <p className="paragraph-sm text-quaternary">{current.asset.asset_type}</p>
                )}
              </div>
            )}

            {/* Mobile: explicit entry into Mia-editing — arms tap-to-select pick mode. */}
            {canEditText && !selection && (current.asset.key_message ?? '').trim() && (
              <div className="md:hidden mt-4">
                {pickMode ? (
                  <div className="flex items-center gap-2">
                    <p className="flex-1 min-w-0 paragraph-sm text-secondary">
                      <MagicWand02 size={14} className="inline mr-1.5 text-utility-brand-600" />
                      Tap any line of text to edit it
                    </p>
                    <button
                      type="button"
                      onClick={() => selectAll(current.asset.key_message ?? '')}
                      className="shrink-0 paragraph-sm text-secondary rounded-full border border-tertiary px-3 py-1.5 active:bg-tertiary transition-colors"
                    >
                      Whole copy
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickMode(false)}
                      className="shrink-0 paragraph-sm text-quaternary rounded-full px-2 py-1.5 active:bg-tertiary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickMode(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-tertiary py-2.5 paragraph-sm font-medium text-secondary active:bg-tertiary transition-colors"
                  >
                    <MagicWand02 size={15} className="text-utility-brand-600" />
                    Edit copy with Mia
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Highlight → ask Mia (saved assets only) */}
      {selection && canEditText && (
        <HighlightToolbar
          anchorRect={selection.rect}
          selectionText={selection.text}
          onSubmit={submitEdit}
          onClose={closeToolbarAndPick}
          ignoreOutsideRef={pickMode ? previewRef : undefined}
        />
      )}
    </aside>
  )
}
