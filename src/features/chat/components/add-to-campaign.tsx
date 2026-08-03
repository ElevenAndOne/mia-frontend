import { useCallback, useEffect, useRef, useState } from 'react'
import { FilePlus02 } from '../../../components/icon/file-plus-02'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { clearTrackerCache } from '../../campaign/services/campaign-tracker-service'
import { clearCampaignDetailCache } from '../../campaigns/campaign-detail-cache'
import { fetchCampaignDetail, fetchCampaignList } from '../../campaigns/services/campaign-api'
import type { CampaignSummary } from '../../campaigns/types'
import { confirmAction, type CanvasDocument } from '../services/chat-service'
import type { CreativeSpec } from './previews/creative-spec'

interface AddToCampaignProps {
  doc: CanvasDocument
  spec: CreativeSpec | null
  conversationId: string | null
}

/** CreativeSpec → campaign channel key. */
const specChannel = (spec: CreativeSpec | null): string => {
  if (!spec) return 'organic_social'
  if (spec.platform === 'google') return spec.format === 'display_ad' ? 'google_display' : 'google_ads'
  if (spec.platform === 'linkedin') return spec.isPaid ? 'linkedin_ads' : 'linkedin_organic'
  if (spec.platform === 'tiktok') return 'tiktok_ads'
  if (spec.platform === 'email') return 'email'
  return spec.isPaid ? 'meta_ads' : 'organic_social'
}

/**
 * "Add to campaign" on the chat canvas: writes the deliverable into a campaign
 * phase as a real Asset via the existing campaign_add_channel_action executor —
 * so it lands in the builder, calendar and ClickUp flow like builder-made assets.
 */
export const AddToCampaign = ({ doc, spec, conversationId }: AddToCampaignProps) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const tenantId = activeWorkspace?.tenant_id

  const [open, setOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null)
  const [campaignId, setCampaignId] = useState('')
  const [phases, setPhases] = useState<string[] | null>(null)
  const [phaseName, setPhaseName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Load the campaign list when the popover opens.
  useEffect(() => {
    if (!open || campaigns || !sessionId || !tenantId) return
    fetchCampaignList(sessionId, tenantId)
      .then((list) => {
        const usable = list.filter((c) => c.status !== 'archived')
        setCampaigns(usable)
        if (usable.length === 1) setCampaignId(usable[0].campaign_id)
      })
      .catch(() => setCampaigns([]))
  }, [open, campaigns, sessionId, tenantId])

  // Load the chosen campaign's phases.
  useEffect(() => {
    if (!campaignId || !sessionId || !tenantId) return
    setPhases(null)
    setPhaseName('')
    fetchCampaignDetail(sessionId, tenantId, campaignId)
      .then((d) => setPhases(d.phases.map((p) => p.phase_name)))
      .catch(() => setPhases([]))
  }, [campaignId, sessionId, tenantId])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const submit = useCallback(async () => {
    if (!sessionId || !campaignId || !phaseName || submitting) return
    setSubmitting(true)
    // Map the deliverable → the executor's asset shape. Best time (if Mia noted
    // one) rides along; uploaded Media: images become the approved creative.
    const bestTime = spec?.notes.find((n) => /best time/i.test(n.label))?.value
    const asset: Record<string, unknown> = {
      asset_name: doc.title || 'Chat canvas post',
      asset_type: spec
        ? spec.platform === 'google' && spec.format === 'search_ad'
          ? 'responsive_search_ad'
          : spec.format
        : 'static',
      key_message: spec
        ? [spec.primaryText, spec.hashtags].filter(Boolean).join('\n\n')
        : doc.content,
      ...(spec?.cta ? { cta: spec.cta } : {}),
      ...(spec?.headline ? { headline: spec.headline } : {}),
      // RSA/PMax variant pools — the executor stores these in asset.details.
      ...(spec && spec.headlines.length > 1 ? { headlines: spec.headlines } : {}),
      ...(spec && spec.descriptions.length > 1 ? { descriptions: spec.descriptions } : {}),
      // Search keyword theme ("text" / "text | EXACT") → structured keywords on the asset.
      ...(spec && spec.keywords.length ? { keywords: spec.keywords } : {}),
      ...(spec?.media.length ? { deliverable_url: spec.media.join('\n') } : {}),
      ...(bestTime ? { optimal_post_time: bestTime } : {}),
    }
    try {
      const result = await confirmAction(sessionId, {
        action_type: 'campaign_add_channel_action',
        platform: 'campaign',
        summary: `Add "${doc.title}" to ${phaseName}`,
        params: {
          campaign_id: campaignId,
          phase_name: phaseName,
          ...(conversationId ? { source_conversation_id: conversationId } : {}),
          channel_actions: [
            {
              channel: specChannel(spec),
              objective: `Publish "${doc.title || 'chat canvas post'}"`,
              strategy: spec?.primaryText
                ? `${spec.primaryText.split('\n')[0].slice(0, 180)}`
                : 'Deliverable drafted in the chat canvas.',
              action_notes: 'Added from the chat canvas — copy and creative live on the asset.',
              assets: [asset],
            },
          ],
        },
      })
      if (!result.success) throw new Error(result.error || 'Failed')
      clearTrackerCache()
      clearCampaignDetailCache()
      const name = campaigns?.find((c) => c.campaign_id === campaignId)?.campaign_name ?? 'campaign'
      showToast('success', `Added to ${name} · ${phaseName}`)
      setOpen(false)
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to add to campaign')
    } finally {
      setSubmitting(false)
    }
  }, [sessionId, campaignId, phaseName, submitting, spec, doc, conversationId, campaigns, showToast])

  if (!tenantId) return null

  const selectCls =
    'w-full px-2 py-1.5 border border-tertiary rounded-lg paragraph-sm bg-primary text-primary outline-none focus:border-utility-brand-400'

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Add to campaign"
        aria-expanded={open}
        title="Add this post to a campaign"
        className="w-8 h-8 max-md:w-10 max-md:h-10 rounded-lg flex items-center justify-center text-quaternary hover:text-secondary hover:bg-tertiary transition-colors"
      >
        <FilePlus02 size={16} />
      </button>

      {open && (
        <div className="absolute z-40 top-full right-0 mt-1 w-64 rounded-xl border border-tertiary bg-primary shadow-lg p-3 flex flex-col gap-2.5">
          <p className="paragraph-sm font-semibold text-primary">Add to campaign</p>

          {campaigns === null ? (
            <p className="paragraph-sm text-quaternary">Loading campaigns…</p>
          ) : campaigns.length === 0 ? (
            <p className="paragraph-sm text-quaternary">No campaigns in this workspace yet.</p>
          ) : (
            <>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className={selectCls}
              >
                <option value="">Choose a campaign…</option>
                {campaigns.map((c) => (
                  <option key={c.campaign_id} value={c.campaign_id}>
                    {c.campaign_name}
                  </option>
                ))}
              </select>

              {campaignId &&
                (phases === null ? (
                  <p className="paragraph-sm text-quaternary">Loading phases…</p>
                ) : (
                  <select
                    value={phaseName}
                    onChange={(e) => setPhaseName(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Choose a phase…</option>
                    {phases.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                ))}

              <button
                type="button"
                disabled={!campaignId || !phaseName || submitting}
                onClick={() => void submit()}
                className="w-full py-1.5 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium disabled:opacity-40 transition-opacity"
              >
                {submitting ? 'Adding…' : 'Add to phase'}
              </button>
              <p className="paragraph-xs text-quaternary">
                Lands in the builder & calendar like any campaign asset.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
