import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilePlus02 } from '../../../components/icon/file-plus-02'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
import { clearTrackerCache } from '../../campaign/services/campaign-tracker-service'
import { addFromCanvas } from '../../campaign-builder/api'
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

/** A builder campaign that takes jobs now: approved (draft, live or paused). One still being planned, or ended, doesn't. */
const takesJobs = (c: CampaignSummary) => c.builder === 'v2' && ['draft', 'live', 'paused'].includes(c.status)

/**
 * "Add to campaign" on the chat canvas. An older campaign: writes the deliverable into a phase as a real Asset via
 * the campaign_add_channel_action executor. A builder campaign: one card on its page, checked and priced like a job
 * Mia proposes there, added only when the PM presses Apply (step 5, audit 9 Nov §4.1).
 */
export const AddToCampaign = ({ doc, spec, conversationId }: AddToCampaignProps) => {
  const { sessionId, activeWorkspace } = useSession()
  const { showToast } = useToast()
  const tenantId = activeWorkspace?.tenant_id

  const [open, setOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null)
  // Builder campaigns that can't take a job now (still being planned, or ended) are links to their page, not choices
  const [inBuilder, setInBuilder] = useState<CampaignSummary[]>([])
  const [campaignId, setCampaignId] = useState('')
  const [jobName, setJobName] = useState(doc.title || '')
  // a builder campaign's card is made: the PM applies it on the campaign's page
  const [carded, setCarded] = useState<{ campaignId: string; name: string } | null>(null)
  const [phases, setPhases] = useState<string[] | null>(null)
  const [phaseName, setPhaseName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Load the campaign list when the popover opens.
  useEffect(() => {
    if (!open || campaigns || !sessionId || !tenantId) return
    fetchCampaignList(sessionId, tenantId)
      .then((list) => {
        const open = list.filter((c) => c.status !== 'archived')
        const usable = open.filter((c) => c.builder !== 'v2' || takesJobs(c))
        setInBuilder(open.filter((c) => c.builder === 'v2' && !takesJobs(c)))
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

  const chosen = campaigns?.find((c) => c.campaign_id === campaignId)
  const toBuilder = !!chosen && takesJobs(chosen)

  const submit = useCallback(async () => {
    if (!sessionId || !tenantId || !campaignId || !phaseName || submitting) return
    setSubmitting(true)
    if (toBuilder) {
      try {
        await addFromCanvas(sessionId, tenantId, campaignId, {
          phase: phaseName,
          // the server's cap is 200; a long canvas title used to fail the whole add
          name: (jobName.trim() || doc.title || 'Chat canvas job').slice(0, 200),
          channel: specChannel(spec),
          ...(spec ? { format: spec.format } : {}),
          primary_text: spec ? spec.primaryText : doc.content,
          ...(spec?.hashtags ? { hashtags: spec.hashtags } : {}),
          ...(spec?.headline ? { headline: spec.headline } : {}),
          ...(spec?.description ? { description: spec.description } : {}),
          ...(spec && spec.headlines.length > 1 ? { headlines: spec.headlines } : {}),
          ...(spec && spec.descriptions.length > 1 ? { descriptions: spec.descriptions } : {}),
          ...(spec?.keywords.length ? { keywords: spec.keywords } : {}),
          ...(spec?.cta ? { cta: spec.cta } : {}),
          ...(spec?.linkUrl ? { link: spec.linkUrl } : {}),
          ...(spec?.visuals.length ? { visuals: spec.visuals } : {}),
          ...(spec?.media.length ? { media: spec.media } : {}),
          // Budget, Flight dates, Measure, Best time: kept on the job, never turned into credits
          ...(spec?.notes.length ? { notes: spec.notes } : {}),
          ...(conversationId ? { conversation_id: conversationId } : {}),
          document_id: doc.id,
        })
        setCarded({ campaignId, name: chosen?.campaign_name ?? 'the campaign' })
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'Failed to add to campaign')
      } finally {
        setSubmitting(false)
      }
      return
    }
    // Map the deliverable → the executor's asset shape. Best time (if Mia noted
    // one) rides along; uploaded Media: images become the approved creative.
    const bestTime = spec?.notes.find((n) => /best time/i.test(n.label))?.value
    const asset: Record<string, unknown> = {
      asset_name: jobName.trim() || doc.title || 'Chat canvas post',
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
  }, [sessionId, tenantId, campaignId, phaseName, submitting, spec, doc, conversationId, campaigns, showToast,
      toBuilder, jobName, chosen])

  if (!tenantId) return null

  const selectCls =
    'w-full px-2 py-1.5 border border-tertiary rounded-lg paragraph-sm bg-primary text-primary outline-none focus:border-utility-brand-400'

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          setCarded(null) // a reopened picker starts again, not on the last card's message
        }}
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

          {carded ? (
            <div className="flex flex-col gap-1.5">
              <p className="paragraph-sm text-primary">
                It's on a card on {carded.name}'s page. Check it there and press Apply to add the job.
              </p>
              <Link
                to={`/campaign-builder/${carded.campaignId}/studio`}
                className="paragraph-sm text-brand-secondary hover:underline"
                onClick={() => setOpen(false)}
              >
                Open the campaign
              </Link>
            </div>
          ) : campaigns === null ? (
            <p className="paragraph-sm text-quaternary">Loading campaigns…</p>
          ) : campaigns.length === 0 ? (
            <p className="paragraph-sm text-quaternary">
              {inBuilder.length ? 'No campaigns to add to from here.' : 'No campaigns in this workspace yet.'}
            </p>
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

              <input
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                maxLength={200}
                aria-label="Job name"
                placeholder="Job name"
                className={selectCls}
              />

              <button
                type="button"
                disabled={!campaignId || !phaseName || submitting}
                onClick={() => void submit()}
                className="w-full py-1.5 rounded-lg bg-brand-solid text-primary-onbrand paragraph-sm font-medium disabled:opacity-40 transition-opacity"
              >
                {submitting ? 'Adding…' : toBuilder ? 'Send to its page' : 'Add to phase'}
              </button>
              <p className="paragraph-xs text-quaternary">
                {toBuilder
                  ? 'Shows on the campaign’s page as a card. Nothing is added until you press Apply there.'
                  : 'Lands in the builder & calendar like any campaign asset.'}
              </p>
            </>
          )}
          {!carded && campaigns !== null && inBuilder.length ? (
            <div className="border-t border-secondary pt-2 flex flex-col gap-1">
              <p className="paragraph-xs text-tertiary">
                Being planned or ended in the campaign builder: open its page to add work there.
              </p>
              {inBuilder.map((c) => (
                <Link
                  key={c.campaign_id}
                  to={`/campaign-builder/${c.campaign_id}`}
                  className="paragraph-xs text-brand-secondary hover:underline truncate"
                  onClick={() => setOpen(false)}
                >
                  {c.campaign_name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
