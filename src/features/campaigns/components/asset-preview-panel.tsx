import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '../../../contexts/session-context'
import { CreativePreview } from '../../chat/components/previews/creative-preview'
import { HighlightToolbar } from '../../chat/components/highlight-toolbar'
import { sendChatMessageStreaming, type AssetContext } from '../../chat/services/chat-service'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import { assetToCreativeSpec } from '../utils/asset-preview'
import { channelLabel } from '../utils/channel-colors'
import { fetchAssetVersions, patchAsset, restoreAssetVersion, uploadAssetMedia, type AssetVersionRow } from '../services/campaign-api'
import { clearCampaignDetailCache } from '../campaign-detail-cache'

/** Roles that may edit assets from the canvas (matches backend require_analyst). */
const EDIT_ROLES = new Set(['owner', 'admin', 'analyst'])

interface AssetPreviewPanelProps {
  assetId: string
  onClose: () => void
}

/**
 * Slide-over canvas on the campaign workspace: any teammate opens an asset as
 * its platform-native preview; owner/admin/analyst can upload creative and
 * highlight-to-edit (Mia span-patches the Asset row via edit_asset_field);
 * viewers get preview only. Reachable from asset cards and the calendar.
 */
export const AssetPreviewPanel = ({ assetId, onClose }: AssetPreviewPanelProps) => {
  const { campaign, tenantId, sessionId, reloadDetail } = useCampaignWorkspace()
  const { activeWorkspace, user } = useSession()
  const canEdit = EDIT_ROLES.has(activeWorkspace?.role ?? '')

  const found = useMemo(() => {
    for (const phase of campaign.phases) {
      for (const ca of phase.channel_actions) {
        for (const asset of ca.assets) {
          if (asset.asset_id === assetId) return { asset, channel: ca.channel }
        }
      }
    }
    return null
  }, [campaign, assetId])

  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [selection, setSelection] = useState<{ rect: DOMRect; text: string } | null>(null)
  const [editStatus, setEditStatus] = useState<string | null>(null)
  const [versions, setVersions] = useState<AssetVersionRow[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  // One throwaway conversation per panel session — the edit turns are self-contained.
  const convRef = useRef<string>(crypto.randomUUID())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Shared edit timeline (refreshed after every write via refresh()).
  useEffect(() => {
    let cancelled = false
    fetchAssetVersions(sessionId, tenantId, campaign.campaign_id, assetId)
      .then((v) => !cancelled && setVersions(v))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [sessionId, tenantId, campaign, assetId])

  const restore = useCallback(
    async (version: number) => {
      await restoreAssetVersion(sessionId, tenantId, campaign.campaign_id, assetId, version).catch(() => {})
      setShowHistory(false)
      clearCampaignDetailCache()
      void reloadDetail()
    },
    [sessionId, tenantId, campaign.campaign_id, assetId, reloadDetail]
  )
  // Per-user undo: instant only while YOUR edit is the newest version (locked design —
  // otherwise you restore from history, so you can't blindly wipe someone else's work).
  const canUndoMine = canEdit && versions.length > 1 && versions[0].is_me

  const refresh = useCallback(() => {
    clearCampaignDetailCache()
    void reloadDetail()
  }, [reloadDetail])

  const uploadMedia = useCallback(
    async (files: File[]) => {
      if (!found || isUploadingMedia) return
      setIsUploadingMedia(true)
      try {
        for (const f of files) {
          await uploadAssetMedia(sessionId, tenantId, campaign.campaign_id, assetId, f)
        }
        refresh()
      } catch {
        /* upload failed — slot stays as it was */
      } finally {
        setIsUploadingMedia(false)
      }
    },
    [found, isUploadingMedia, sessionId, tenantId, campaign.campaign_id, assetId, refresh]
  )

  const removeMedia = useCallback(
    async (url: string) => {
      if (!found) return
      const remaining = (found.asset.deliverable_url ?? '')
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((u) => u !== url)
        .join('\n')
      try {
        await patchAsset(sessionId, tenantId, campaign.campaign_id, assetId, {
          deliverable_url: remaining,
        })
        refresh()
      } catch {
        /* removal failed — keep showing the image */
      }
    },
    [found, sessionId, tenantId, campaign.campaign_id, assetId, refresh]
  )

  const handleMouseUp = useCallback(() => {
    if (!canEdit) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !sel.rangeCount) return setSelection(null)
    const text = sel.toString().trim()
    if (!text) return setSelection(null)
    const range = sel.getRangeAt(0)
    if (!previewRef.current?.contains(range.commonAncestorContainer)) return
    setSelection({ rect: range.getBoundingClientRect(), text })
  }, [canEdit])

  const closeToolbar = useCallback(() => {
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  // Highlight-to-edit without a visible chat: fire a self-contained edit turn with
  // asset_context; Mia calls edit_asset_field, asset_updated triggers the refetch,
  // and her one-line reply lands in the panel footer.
  const submitEdit = useCallback(
    async (instruction: string) => {
      if (!found || !selection) return
      const assetContext: AssetContext = {
        asset_id: assetId,
        campaign_id: campaign.campaign_id,
        asset_name: found.asset.asset_name,
        fields: {
          key_message: found.asset.key_message,
          cta: found.asset.cta,
          headline: found.asset.headline ?? null,
        },
        selection: { text: selection.text },
      }
      closeToolbar()
      setEditStatus('Asking Mia…')
      let reply = ''
      try {
        await sendChatMessageStreaming(
          {
            message: instruction,
            session_id: sessionId,
            user_id: user?.google_user_id ?? '',
            date_range: '30_days',
            conversation_id: convRef.current,
            asset_context: assetContext,
            no_track: true,
          },
          (chunk) => {
            if (chunk.text) reply += chunk.text
            else if (chunk.asset_updated) refresh()
            else if (chunk.status && chunk.status !== 'thinking') setEditStatus(chunk.status)
          }
        )
        setEditStatus(reply.trim() || 'Done.')
      } catch {
        setEditStatus('Something went wrong — try again.')
      }
    },
    [found, selection, assetId, campaign.campaign_id, sessionId, user, closeToolbar, refresh]
  )

  const spec = found ? assetToCreativeSpec(found.asset, found.channel) : null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close preview"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 cursor-default"
      />
      <aside className="absolute top-0 right-0 bottom-0 w-[480px] max-w-[94vw] bg-primary border-l border-tertiary shadow-2xl flex flex-col">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-tertiary">
          <div className="min-w-0">
            <h2 className="paragraph-md font-semibold text-primary truncate">
              {found?.asset.asset_name ?? 'Asset'}
            </h2>
            <span className="paragraph-sm text-quaternary uppercase tracking-wide">
              {found ? channelLabel(found.channel) : ''}
              {canEdit ? ' · highlight text to edit with Mia' : ' · preview'}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 relative">
            {canUndoMine && (
              <button
                type="button"
                onClick={() => void restore(versions[1].version)}
                className="paragraph-sm text-secondary border border-tertiary rounded-full px-2.5 py-0.5 hover:bg-tertiary transition-colors"
                title="Revert your latest edit"
              >
                Undo my edit
              </button>
            )}
            {versions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory((o) => !o)}
                aria-expanded={showHistory}
                className="paragraph-sm text-secondary rounded-full bg-tertiary px-2 py-0.5 hover:text-primary transition-colors"
              >
                v{versions[0].version} ▾
              </button>
            )}
            {showHistory && (
              <div className="absolute z-40 top-full right-0 mt-1 w-72 max-h-72 overflow-y-auto rounded-xl border border-tertiary bg-primary shadow-lg py-1">
                {versions.map((v, i) => (
                  <div key={v.version} className="px-3 py-2 flex items-center gap-2">
                    <span className="paragraph-sm font-medium text-primary">v{v.version}</span>
                    <span className="paragraph-sm text-quaternary truncate">
                      {v.edited_by === 'origin' ? 'original' : v.is_me ? 'You' : (v.edited_by_email ?? 'teammate')}
                    </span>
                    {i === 0 ? (
                      <span className="paragraph-xs text-quaternary ml-auto">current</span>
                    ) : (
                      canEdit && (
                        <button
                          type="button"
                          onClick={() => void restore(v.version)}
                          className="paragraph-xs text-utility-brand-600 ml-auto hover:underline"
                        >
                          restore
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!found ? (
            <p className="paragraph-sm text-quaternary text-center pt-16">
              This asset is no longer in the campaign.
            </p>
          ) : spec ? (
            <div ref={previewRef} onMouseUp={handleMouseUp}>
              <CreativePreview
                spec={spec}
                brandName={activeWorkspace?.name}
                onUploadMedia={canEdit ? uploadMedia : undefined}
                onRemoveMedia={canEdit ? removeMedia : undefined}
                isUploadingMedia={isUploadingMedia}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-tertiary bg-secondary/40 px-4 py-3 flex flex-col gap-1.5">
              {found.asset.key_message && (
                <p className="paragraph-sm text-primary whitespace-pre-line">
                  {found.asset.key_message}
                </p>
              )}
              {found.asset.cta && (
                <p className="paragraph-sm text-tertiary">CTA: {found.asset.cta}</p>
              )}
            </div>
          )}
        </div>

        {editStatus && (
          <div className="px-5 py-2.5 border-t border-tertiary paragraph-sm text-secondary flex items-start gap-2">
            <span className="shrink-0 text-utility-brand-600">✦</span>
            <span className="min-w-0">{editStatus}</span>
          </div>
        )}
        <div className="px-5 py-2.5 border-t border-tertiary paragraph-sm text-quaternary">
          Edits update the builder, calendar and the linked ClickUp task automatically.
        </div>
      </aside>

      {selection && canEdit && (
        <HighlightToolbar
          anchorRect={selection.rect}
          selectionText={selection.text}
          onSubmit={(instruction) => void submitEdit(instruction)}
          onClose={closeToolbar}
        />
      )}
    </div>
  )
}
