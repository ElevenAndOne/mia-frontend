import { useState } from 'react'
import { EditableText } from '../../../../components/editable-text'
import { EditableTextarea } from '../../../../components/editable-textarea'
import { AskMiaButton } from '../ask-mia/ask-mia-button'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import { buildAssetFinalUrl } from '../../services/campaign-api'
import { DrivePickerModal } from './drive-picker-modal'
import { creativeThumbnail, isDriveFolderUrl, onThumbError, splitCreativeUrls } from '../../utils/drive'
import type { Asset, AssetStatus, DriveFile, KeywordSpec } from '../../types'
import { ASSET_TYPES, ASSET_TYPE_GROUPS } from '../../constants/asset-types'

// Ad lifecycle → ClickUp status. Colour keys the pipeline stage at a glance.
const ASSET_STATUSES: { value: AssetStatus; label: string; cls: string }[] = [
  { value: 'draft', label: 'Draft', cls: 'text-quaternary' },
  { value: 'in_production', label: 'In production', cls: 'text-utility-warning-600' },
  { value: 'ready', label: 'Ready to launch', cls: 'text-utility-brand-600' },
  { value: 'scheduled', label: 'Scheduled', cls: 'text-utility-brand-600' },
  { value: 'live', label: 'Live', cls: 'text-utility-success-600' },
]

const inputCls =
  'w-full px-2 py-1.5 border border-tertiary rounded-lg text-xs bg-secondary-subtle text-secondary outline-none focus:border-utility-brand-400'
const numCls = `${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden`
const fieldLabel = 'text-[9.5px] font-semibold text-quaternary uppercase tracking-[0.12em] mb-1 block'

interface AssetCardProps {
  asset: Asset
  channel?: string
  phaseName?: string
  onPatch: (fields: Partial<Asset>) => void
  onDelete: () => void
}

// One creative deliverable. Asset-level budget + flight roll up to the channel
// total (see budget-math). Presentational — edits delegate to the channel editor.
export const AssetCard = ({ asset, channel, phaseName, onPatch, onDelete }: AssetCardProps) => {
  const details = (asset.details as Record<string, unknown>) ?? {}
  const askCtx = { phaseName, channel, assetName: asset.asset_name, assetType: asset.asset_type }
  const launch = String(details.launch_date ?? '')
  const bestTime = String(details.optimal_post_time ?? '')

  const patchDetails = (key: string, value: string) =>
    onPatch({ details: { ...details, [key]: value || undefined } })

  // RSA / PMax variant pools — stored as string arrays in details, edited as
  // one-per-line text.
  const isRsa = asset.asset_type === 'responsive_search_ad' || asset.asset_type === 'pmax'
  // Text-only Google Search ads: no creative to attach (hide Final Asset), no
  // single Meta-style headline (the pool replaces it) — but they DO need keywords.
  const isSearchText = asset.asset_type === 'responsive_search_ad' || asset.asset_type === 'search_ad'
  const detailLines = (key: string): string =>
    Array.isArray(details[key])
      ? (details[key] as unknown[]).filter((s) => typeof s === 'string').join('\n')
      : ''
  const patchDetailList = (key: string, raw: string, cap: number) => {
    const list = raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, cap)
    onPatch({ details: { ...details, [key]: list.length ? list : undefined } })
  }

  // Keywords (Search ads): stored structured on the asset, edited one per line
  // in the same "text | EXACT" format as the push preflight.
  const keywordLines = (asset.keywords ?? [])
    .map((k) => (k.match && k.match !== 'BROAD' ? `${k.text} | ${k.match}` : k.text))
    .join('\n')
  const patchKeywords = (raw: string) => {
    const list = raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(.*?)\s*\|\s*(BROAD|PHRASE|EXACT)\s*$/i)
        return m
          ? { text: m[1].trim(), match: m[2].toUpperCase() as KeywordSpec['match'] }
          : { text: line, match: 'BROAD' as KeywordSpec['match'] }
      })
    onPatch({ keywords: list.length ? list : null })
  }

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const { openAssetPreview, sessionId, tenantId, campaign } = useCampaignWorkspace()

  // ── UTM builder ────────────────────────────────────────────────────────
  // Appends the team convention (utm_source=meta, utm_medium=paid_social,
  // campaign/asset auto) to the current Final URL. Opt-in per asset — a bare
  // URL is correct when the destination has no analytics (e.g. Google Forms).
  const [buildingUtm, setBuildingUtm] = useState(false)
  const [utmError, setUtmError] = useState('')
  const addUtms = async () => {
    if (!asset.final_url || buildingUtm) return
    setBuildingUtm(true)
    setUtmError('')
    try {
      const url = await buildAssetFinalUrl(
        sessionId, tenantId, campaign.campaign_id, asset.asset_id, asset.final_url,
      )
      onPatch({ final_url: url })
    } catch (e) {
      setUtmError(e instanceof Error ? e.message : 'Failed to build UTM URL')
    } finally {
      setBuildingUtm(false)
    }
  }

  // ── Drive creative picker ──────────────────────────────────────────────
  // deliverable_url either holds a Drive *folder* link (from ClickUp sync or
  // hand-paste → offer the picker) or the picked direct-download URLs, one per
  // line in carousel-card order. The folder link survives in details so the
  // picker can be reopened after a selection replaces it.
  const creativeUrls = splitCreativeUrls(asset.deliverable_url)
  const mediaUrls = creativeUrls.filter((u) => !isDriveFolderUrl(u))
  const driveFolder =
    creativeUrls.find(isDriveFolderUrl) ??
    (typeof details.drive_folder_url === 'string' ? details.drive_folder_url : undefined)
  const maxSelect = asset.asset_type === 'carousel' ? 10 : 1
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  const savePicked = (files: DriveFile[]) => {
    setPickerOpen(false)
    if (!files.length) return
    onPatch({
      deliverable_url: files.map((f) => f.download_url).join('\n'),
      details: { ...details, drive_folder_url: driveFolder },
    })
  }

  const reorderMedia = (to: number) => {
    if (dragFrom == null || dragFrom === to) return
    const next = [...mediaUrls]
    const [moved] = next.splice(dragFrom, 1)
    next.splice(to, 0, moved)
    setDragFrom(to)
    onPatch({ deliverable_url: next.join('\n') })
  }

  const removeMedia = (i: number) => {
    const next = mediaUrls.filter((_, idx) => idx !== i)
    // Removing the last picked file falls back to the Drive folder link (if any)
    // so the picker stays reachable and the field isn't silently emptied.
    onPatch({ deliverable_url: next.length ? next.join('\n') : driveFolder ?? null })
  }

  return (
    <div className="rounded-xl border border-secondary bg-primary p-3.5 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <EditableText
            value={asset.asset_name}
            onSave={(v) => onPatch({ asset_name: v })}
            className="paragraph-sm text-primary font-semibold"
          />
        </div>
        <button
          type="button"
          onClick={() => openAssetPreview(asset.asset_id)}
          className="px-2 py-1 border border-tertiary rounded-lg text-xs text-secondary hover:bg-tertiary transition-colors"
          title="Open the platform preview canvas"
        >
          Preview
        </button>
        <select
          value={asset.status ?? 'draft'}
          onChange={(e) => onPatch({ status: e.target.value as AssetStatus })}
          title="Ad status — syncs to the ClickUp task"
          className={`text-xs font-semibold border border-tertiary rounded-md px-1.5 py-0.5 bg-secondary-subtle ${
            ASSET_STATUSES.find((s) => s.value === (asset.status ?? 'draft'))?.cls ?? 'text-tertiary'
          }`}
        >
          {ASSET_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={asset.asset_type ?? ''}
          onChange={(e) => onPatch({ asset_type: e.target.value || null })}
          className="text-xs border border-tertiary rounded-md px-1.5 py-0.5 bg-secondary-subtle text-tertiary capitalize"
        >
          <option value="">type</option>
          {/* Free-text legacy value not in the vocabulary — keep it selectable. */}
          {asset.asset_type && !ASSET_TYPES.includes(asset.asset_type) && (
            <option value={asset.asset_type}>{asset.asset_type}</option>
          )}
          {ASSET_TYPE_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {confirmingDelete ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onDelete}
              className="label-xs font-semibold text-utility-error-600 hover:text-utility-error-700"
              title="Confirm — removes this asset"
            >
              Remove
            </button>
            <span className="text-quaternary">·</span>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="label-xs text-quaternary hover:text-secondary"
              title="Keep asset"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmingDelete(true)} className="p-0.5 text-quaternary hover:text-utility-error-500" title="Remove asset">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9.5px] font-semibold text-quaternary uppercase tracking-[0.12em]">Copy</span>
          <AskMiaButton context={{ ...askCtx, fieldLabel: 'asset copy / key message' }} currentValue={asset.key_message ?? ''} onInsert={(t) => onPatch({ key_message: t })} />
        </div>
        <EditableTextarea value={asset.key_message ?? ''} onSave={(v) => onPatch({ key_message: v || null })} placeholder="Asset copy…" rows={2} className="paragraph-xs text-secondary" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9.5px] font-semibold text-quaternary uppercase tracking-[0.12em]">Caption</span>
          <AskMiaButton context={{ ...askCtx, fieldLabel: 'caption / call-to-action' }} currentValue={asset.cta ?? ''} onInsert={(t) => onPatch({ cta: t })} />
        </div>
        <EditableTextarea value={asset.cta ?? ''} onSave={(v) => onPatch({ cta: v || null })} placeholder="Caption…" rows={2} className="paragraph-xs text-tertiary" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className={fieldLabel}>Budget</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              key={`${asset.asset_id}-b-${asset.budget ?? ''}`}
              defaultValue={asset.budget ?? ''}
              onBlur={(e) => {
                const v = e.target.value ? parseFloat(e.target.value) : null
                if (v !== asset.budget) {
                  onPatch(v != null && !asset.budget_period ? { budget: v, budget_period: 'monthly' } : { budget: v })
                }
              }}
              placeholder="—"
              className={numCls}
            />
            <select
              value={asset.budget_period ?? 'monthly'}
              onChange={(e) => onPatch({ budget_period: e.target.value })}
              className="shrink-0 px-1 py-1.5 border border-tertiary rounded-md text-xs bg-secondary-subtle text-secondary outline-none"
            >
              <option value="monthly">/mo</option>
              <option value="total">total</option>
            </select>
          </div>
        </div>
        <div>
          <span className={fieldLabel}>Flight</span>
          <div className="space-y-1">
            <input type="date" key={`${asset.asset_id}-sd-${asset.start_date ?? ''}`} defaultValue={asset.start_date ?? ''}
              onChange={(e) => { if (e.target.value !== (asset.start_date ?? '')) onPatch({ start_date: e.target.value || null }) }}
              className={inputCls} />
            <input type="date" key={`${asset.asset_id}-ed-${asset.end_date ?? ''}`} defaultValue={asset.end_date ?? ''}
              onChange={(e) => { if (e.target.value !== (asset.end_date ?? '')) onPatch({ end_date: e.target.value || null }) }}
              className={inputCls} />
          </div>
        </div>
        <div>
          <span className={fieldLabel}>Launch</span>
          <input type="date" defaultValue={launch} onBlur={(e) => patchDetails('launch_date', e.target.value)} className={inputCls} />
        </div>
        <div>
          <span className={fieldLabel}>Best time to post</span>
          <input type="text" defaultValue={bestTime} onBlur={(e) => patchDetails('optimal_post_time', e.target.value)}
            placeholder="e.g. Tuesday 09:30" className={inputCls} />
        </div>
      </div>

      {asset.clickup_task_url && (
        <a
          href={asset.clickup_task_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 label-xs font-semibold hover:underline"
          style={{ color: '#7B68EE' }}
          onClick={(e) => e.stopPropagation()}
        >
          Open in ClickUp ↗
        </a>
      )}

      <div className="space-y-2 pt-3 border-t border-secondary">
        {!isRsa && (
          <div>
            <span className={fieldLabel}>Ad headline</span>
            <EditableText
              value={asset.headline ?? ''}
              onSave={(v) => onPatch({ headline: v || null })}
              placeholder="Shown next to the CTA (defaults to the asset name)"
              className="paragraph-xs text-secondary"
            />
          </div>
        )}
        {isRsa && (
          <>
            <div>
              <span className={fieldLabel}>Headlines — one per line (≤30 chars, max 15)</span>
              <textarea
                key={`${asset.asset_id}-rsah-${detailLines('headlines')}`}
                defaultValue={detailLines('headlines')}
                onBlur={(e) => patchDetailList('headlines', e.target.value, 15)}
                rows={4}
                placeholder={'Sell at KersieFees 2026\nReach 15,000+ Visitors\n…'}
                className={inputCls}
              />
            </div>
            <div>
              <span className={fieldLabel}>Descriptions — one per line (≤90 chars, max 4)</span>
              <textarea
                key={`${asset.asset_id}-rsad-${detailLines('descriptions')}`}
                defaultValue={detailLines('descriptions')}
                onBlur={(e) => patchDetailList('descriptions', e.target.value, 4)}
                rows={3}
                placeholder="One description per line…"
                className={inputCls}
              />
            </div>
          </>
        )}
        {isSearchText && (
          <div>
            <span className={fieldLabel}>Keywords — one per line (add "| EXACT" or "| PHRASE")</span>
            <textarea
              key={`${asset.asset_id}-kw-${keywordLines}`}
              defaultValue={keywordLines}
              onBlur={(e) => patchKeywords(e.target.value)}
              rows={4}
              placeholder={'buy apples online | EXACT\nfresh apples delivered'}
              className={inputCls}
            />
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9.5px] font-semibold text-quaternary uppercase tracking-[0.12em]">
              Final URL (destination + tracking)
            </span>
            {asset.final_url && (
              <button
                type="button"
                onClick={addUtms}
                disabled={buildingUtm}
                title="Append the channel's UTM convention (meta/paid_social or google/cpc, campaign + asset auto). Skip for destinations with no analytics, e.g. Google Forms."
                className="label-xs font-semibold text-utility-brand-600 hover:underline disabled:opacity-50"
              >
                {buildingUtm ? 'Building…' : asset.final_url.includes('utm_') ? '↻ UTMs' : '+ UTMs'}
              </button>
            )}
          </div>
          <EditableText
            value={asset.final_url ?? ''}
            onSave={(v) => onPatch({ final_url: v || null })}
            placeholder="https://… (UTMs included)"
            className="paragraph-xs text-secondary break-all"
          />
          {utmError && <p className="label-xs text-utility-error-600 mt-0.5">{utmError}</p>}
        </div>
        {!isSearchText && (
        <div>
          <span className={fieldLabel}>Final asset (approved creative)</span>
          <EditableText
            value={asset.deliverable_url ?? ''}
            onSave={(v) => onPatch({ deliverable_url: v || null })}
            placeholder="Drive folder link — or one image URL per line"
            className="paragraph-xs text-secondary break-all"
          />
          {mediaUrls.length > 0 && (
            <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1" onDragOver={(e) => e.preventDefault()}>
              {mediaUrls.map((u, i) => (
                <div
                  key={u}
                  draggable={mediaUrls.length > 1}
                  onDragStart={() => setDragFrom(i)}
                  onDragEnter={() => reorderMedia(i)}
                  onDragEnd={() => setDragFrom(null)}
                  title={mediaUrls.length > 1 ? `Card ${i + 1} — drag to reorder` : undefined}
                  className={`relative shrink-0 w-12 h-12 rounded-md overflow-hidden border border-secondary ${
                    mediaUrls.length > 1 ? 'cursor-grab' : ''
                  } ${dragFrom === i ? 'opacity-50' : ''}`}
                >
                  <img src={creativeThumbnail(u, 120)} onError={(e) => onThumbError(e, u, 120)} alt="" loading="lazy" className="w-full h-full object-cover bg-tertiary" />
                  {mediaUrls.length > 1 && (
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-black/70 text-white label-xs font-bold">
                      {i + 1}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeMedia(i) }}
                    title="Remove this creative"
                    className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-black/70 text-white/80 hover:bg-utility-error-600 hover:text-white"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          {driveFolder && (
            <button
              onClick={() => setPickerOpen(true)}
              className="mt-1.5 inline-flex items-center gap-1 label-xs font-semibold text-utility-brand-600 hover:underline"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              {mediaUrls.length > 0 ? 'Change Drive selection' : 'Choose creatives from Drive'}
            </button>
          )}
        </div>
        )}
      </div>

      {pickerOpen && driveFolder && (
        <DrivePickerModal
          folderUrl={driveFolder}
          maxSelect={maxSelect}
          onSave={savePicked}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
