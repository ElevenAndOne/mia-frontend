import { useEffect, useState } from 'react'
import {
  fetchGooglePushPreview,
  patchAsset,
  patchChannelAction,
  pushChannelActionToGoogle,
  suggestGoogleSearch,
} from '../../services/campaign-api'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import type { GooglePushPreview, GooglePushResult, KeywordSpec, RsaText } from '../../types'

const GOOGLE = '#4285F4'

const H_MAX = 30
const D_MAX = 90
const PATH_MAX = 15

const BIDDING_OPTIONS: { value: string; label: string }[] = [
  { value: 'MAXIMIZE_CONVERSIONS', label: 'Maximize conversions' },
  { value: 'TARGET_SPEND', label: 'Maximize clicks' },
  { value: 'MANUAL_CPC', label: 'Manual CPC' },
]

interface Props {
  actionId: string
  onClose: () => void
}

// One editable ad group (asset) in the modal. Line-based editors: one entry per
// line; keywords accept "text | EXACT" / "text | PHRASE" (default BROAD), and
// headlines accept "text | HEADLINE_1" to pin.
interface AdGroupDraft {
  assetId: string
  name: string
  finalUrl: string | null
  keywords: string
  headlines: string
  descriptions: string
  path1: string
  path2: string
}

const linesOf = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)

const keywordsToLines = (kws: KeywordSpec[]) =>
  kws.map((k) => (k.match && k.match !== 'BROAD' ? `${k.text} | ${k.match}` : k.text)).join('\n')

const parseKeywords = (s: string): KeywordSpec[] =>
  linesOf(s).map((line) => {
    const m = line.match(/^(.*?)\s*\|\s*(BROAD|PHRASE|EXACT)\s*$/i)
    return m
      ? { text: m[1].trim(), match: m[2].toUpperCase() as KeywordSpec['match'] }
      : { text: line, match: 'BROAD' }
  })

const rsaToLines = (items: RsaText[]) =>
  items.map((h) => (h.pinned_field ? `${h.text} | ${h.pinned_field}` : h.text)).join('\n')

const parseRsa = (s: string): RsaText[] =>
  linesOf(s).map((line) => {
    const m = line.match(/^(.*?)\s*\|\s*(HEADLINE_[123])\s*$/i)
    return m ? { text: m[1].trim(), pinned_field: m[2].toUpperCase() } : { text: line }
  })

// Client-side mirror of the backend's hard limits so fixes unblock the button
// without a round trip (the backend re-validates on push regardless).
const draftProblems = (d: AdGroupDraft): string[] => {
  const problems: string[] = []
  const hs = parseRsa(d.headlines)
  const ds = parseRsa(d.descriptions)
  if (hs.length < 3 || hs.length > 15) problems.push(`needs 3-15 headlines (has ${hs.length})`)
  if (ds.length < 2 || ds.length > 4) problems.push(`needs 2-4 descriptions (has ${ds.length})`)
  hs.filter((h) => h.text.length > H_MAX).forEach((h) => problems.push(`headline over ${H_MAX} chars: "${h.text.slice(0, 34)}…"`))
  ds.filter((x) => x.text.length > D_MAX).forEach(() => problems.push(`a description is over ${D_MAX} chars`))
  // Mirrors the backend validators so the button state matches the real push:
  // a pipe trips Google's SYMBOLS policy (PROHIBITED) and repeated text is
  // rejected as DUPLICATE_ASSET — either one kills the whole atomic push.
  ;([['headline', hs], ['description', ds]] as const).forEach(([label, items]) => {
    items
      .filter((x) => x.text.includes('|'))
      .forEach((x) => problems.push(`${label} contains "|" — Google rejects it (SYMBOLS policy): "${x.text.slice(0, 34)}"`))
    const seen = new Set<string>()
    items.forEach((x) => {
      const key = x.text.trim().toLowerCase()
      if (seen.has(key)) problems.push(`duplicate ${label} — each must be unique: "${x.text.slice(0, 34)}"`)
      seen.add(key)
    })
  })
  if (parseKeywords(d.keywords).length === 0) problems.push('no keywords')
  if (d.path1.length > PATH_MAX) problems.push(`path1 over ${PATH_MAX} chars`)
  if (d.path2.length > PATH_MAX) problems.push(`path2 over ${PATH_MAX} chars`)
  if (d.path2 && !d.path1) problems.push('path2 requires path1')
  if (!d.finalUrl) problems.push('no final URL on the asset')
  return problems
}

// Preflight modal for Push to Google: shows the derived campaign (daily budget,
// bidding, flight, negatives) and a per-asset editor for each ad group's
// keywords + RSA copy. Approved copy persists onto the assets (patchAsset) and
// campaign settings onto google_push_config before the push reads them back.
export const GooglePushPreflight = ({ actionId, onClose }: Props) => {
  const { tenantId, sessionId, campaign, reloadDetail } = useCampaignWorkspace()

  const [preview, setPreview] = useState<GooglePushPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pushing, setPushing] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [result, setResult] = useState<GooglePushResult | null>(null)

  // Editable campaign-level fields (seeded from the preview)
  const [dailyBudget, setDailyBudget] = useState<string>('')
  const [bidding, setBidding] = useState('MAXIMIZE_CONVERSIONS')
  const [targetCpa, setTargetCpa] = useState<string>('')
  const [searchPartners, setSearchPartners] = useState(false)
  const [negatives, setNegatives] = useState('')
  const [sharedLists, setSharedLists] = useState<string[]>([])
  const [drafts, setDrafts] = useState<AdGroupDraft[]>([])

  useEffect(() => {
    fetchGooglePushPreview(sessionId, tenantId, campaign.campaign_id, actionId)
      .then((p) => {
        setPreview(p)
        setDailyBudget(p.daily_budget != null ? String(p.daily_budget) : '')
        setBidding(p.bidding_strategy || 'MAXIMIZE_CONVERSIONS')
        setTargetCpa(p.target_cpa != null ? String(p.target_cpa) : '')
        setSearchPartners(!!p.networks?.search_partners)
        setNegatives((p.negative_keywords || []).join(', '))
        setSharedLists(p.shared_negative_lists || [])
        setDrafts(
          p.ad_groups.map((g) => ({
            assetId: g.asset_id,
            name: g.name,
            finalUrl: g.final_url,
            keywords: keywordsToLines(g.keywords || []),
            headlines: rsaToLines(g.headlines || []),
            descriptions: rsaToLines(g.descriptions || []),
            path1: g.path1 || '',
            path2: g.path2 || '',
          })),
        )
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load preview'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionId])

  const setDraft = (assetId: string, patch: Partial<AdGroupDraft>) =>
    setDrafts((ds) => ds.map((d) => (d.assetId === assetId ? { ...d, ...patch } : d)))

  const suggest = async () => {
    setSuggesting(true)
    setError('')
    try {
      const s = await suggestGoogleSearch(sessionId, tenantId, campaign.campaign_id, actionId)
      setDrafts((ds) =>
        ds.map((d) => {
          const match = s.assets.find((a) => a.asset_id === d.assetId)
          if (!match) return d
          return {
            ...d,
            keywords: keywordsToLines(match.keywords || []),
            headlines: rsaToLines(match.headlines || []),
            descriptions: rsaToLines(match.descriptions || []),
            path1: match.path1 || d.path1,
            path2: match.path2 || d.path2,
          }
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suggestion failed')
    } finally {
      setSuggesting(false)
    }
  }

  const push = async () => {
    setPushing(true)
    setError('')
    try {
      // 1. Persist the PM-approved copy + keywords onto each asset.
      for (const d of drafts) {
        await patchAsset(sessionId, tenantId, campaign.campaign_id, d.assetId, {
          rsa_headlines: parseRsa(d.headlines),
          rsa_descriptions: parseRsa(d.descriptions),
          rsa_path1: d.path1 || null,
          rsa_path2: d.path2 || null,
          keywords: parseKeywords(d.keywords),
        })
      }
      // 2. Persist campaign-level settings onto the action's push profile.
      const existing = (preview?.google_push_config as Record<string, unknown>) || {}
      await patchChannelAction(sessionId, tenantId, campaign.campaign_id, actionId, {
        google_push_config: {
          ...existing,
          bidding: { strategy: bidding, target_cpa: targetCpa ? Number(targetCpa) : null },
          networks: { search_partners: searchPartners },
          negative_keywords: negatives.split(',').map((x) => x.trim()).filter(Boolean),
          shared_negative_lists: sharedLists,
        },
      })
      // 3. Push (the backend re-derives from what we just saved).
      const r = await pushChannelActionToGoogle(sessionId, tenantId, campaign.campaign_id, actionId, {
        daily_budget: dailyBudget ? Number(dailyBudget) : undefined,
      })
      setResult(r)
      if (r.success) await reloadDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Push to Google failed')
    } finally {
      setPushing(false)
    }
  }

  const fieldLabel = 'block label-xs text-tertiary mb-0.5'
  const inputCls =
    'w-full bg-primary border border-secondary rounded-lg px-2.5 py-1.5 paragraph-xs text-primary focus:outline-none focus:border-brand'
  const textareaCls = `${inputCls} font-mono leading-relaxed`

  // Errors fixable IN this modal must not permanently block the button:
  // copy/keyword problems are re-validated client-side as you type, and the
  // budget errors clear once a daily budget is entered (it's sent as the push
  // override). Every other server error stays blocking.
  const FIXABLE = new Set(['invalid_rsa_copy', 'missing_keywords'])
  const BUDGET_ERRORS = new Set(['no_budget', 'budget_needs_end'])
  const hardErrors =
    preview?.errors?.filter(
      (e) => !FIXABLE.has(e.code) && !(BUDGET_ERRORS.has(e.code) && dailyBudget),
    ) ?? []
  const draftIssues = drafts.some((d) => draftProblems(d).length > 0)
  const missingBudget = !dailyBudget && (preview?.errors ?? []).some((e) => BUDGET_ERRORS.has(e.code))
  const blocked = hardErrors.length > 0 || draftIssues || missingBudget

  return (
    <div className="campaign-workspace fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-secondary rounded-2xl border border-secondary p-6 max-w-3xl w-full shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${GOOGLE}26` }}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={GOOGLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </div>
          <div>
            <h2 className="title-h6 text-primary">Push to Google — preflight</h2>
            {preview && (
              <p className="paragraph-xs text-tertiary">
                {preview.campaign_name}
                {preview.reuses_existing ? ' · adds ad groups to the existing campaign' : ' · new paused Search campaign'}
              </p>
            )}
          </div>
        </div>

        {loading && <p className="paragraph-sm text-tertiary py-6 text-center">Building preview…</p>}

        {result ? (
          result.success ? (
            <div className="bg-utility-success-100 border border-utility-success-300 rounded-lg p-4 mb-4">
              <p className="subheading-md text-utility-success-700">
                Created {result.data?.ad_groups?.length ?? 0} ad group{(result.data?.ad_groups?.length ?? 0) === 1 ? '' : 's'} in a paused Search campaign.
              </p>
              <p className="paragraph-xs text-utility-success-700 mt-1">
                Review and enable the campaign in Google Ads — nothing is live yet. Ads also go through Google's policy review.
              </p>
            </div>
          ) : (
            <div className="bg-utility-error-100 border border-utility-error-300 rounded-lg p-4 mb-4">
              <p className="subheading-md text-utility-error-700">Push failed — nothing was created (the push is all-or-nothing).</p>
              {result.error && <p className="paragraph-xs text-utility-error-700 mt-1">{result.error}</p>}
            </div>
          )
        ) : preview ? (
          <>
            {hardErrors.map((e, i) => (
              <p key={i} className="mb-2 paragraph-xs text-utility-error-700 bg-utility-error-100 border border-utility-error-300 rounded-lg px-3 py-2">{e.message}</p>
            ))}
            {/* Advisory checks live in Launch readiness, where they can be accepted
                on the record or fixed in place. Repeating them here in a second
                format was the duplication that made readiness feel like two
                different answers. */}
            {preview.warnings.length > 0 && (
              <p className="mb-2 paragraph-xs text-tertiary">
                {preview.warnings.length} advisory check
                {preview.warnings.length === 1 ? '' : 's'} on this channel — see Launch readiness to
                accept or fix them.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-primary border border-secondary rounded-lg p-3">
                <span className={fieldLabel}>Bidding</span>
                <select value={bidding} onChange={(e) => setBidding(e.target.value)} className={inputCls}>
                  {BIDDING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {bidding === 'MAXIMIZE_CONVERSIONS' && (
                  <div className="mt-2">
                    <span className={fieldLabel}>Target CPA (optional, R)</span>
                    <input type="number" min={0} value={targetCpa} onChange={(e) => setTargetCpa(e.target.value)} placeholder="no cap" className={inputCls} />
                  </div>
                )}
                {preview.capabilities.conversion_actions.length === 0 && (
                  <p className="paragraph-xs text-tertiary mt-1">No conversion actions on this account — Maximize clicks recommended</p>
                )}
                <label className="flex items-center gap-1.5 mt-2 paragraph-xs text-secondary">
                  <input type="checkbox" checked={searchPartners} onChange={(e) => setSearchPartners(e.target.checked)} />
                  Include search partners
                </label>
              </div>
              <div className="bg-primary border border-secondary rounded-lg p-3">
                <span className={fieldLabel}>Daily budget (R) & flight</span>
                <input type="number" min={0} value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} className={inputCls} />
                <p className="paragraph-xs text-tertiary mt-1.5">
                  {preview.flight_start ?? 'now'} → {preview.flight_end ?? 'always-on'} · Google Search budgets are per-day
                </p>
              </div>
            </div>

            <div className="mb-4">
              <span className={fieldLabel}>Campaign negative keywords (comma-separated)</span>
              <input value={negatives} onChange={(e) => setNegatives(e.target.value)} placeholder="e.g. free, jobs, diy" className={inputCls} />
              {preview.capabilities.shared_negative_lists.length > 0 && (
                <div className="mt-1.5">
                  <span className={fieldLabel}>
                    Shared negative lists — click to attach or detach (the account's list is
                    attached by default)
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {preview.capabilities.shared_negative_lists.map((l) => {
                      const active = sharedLists.includes(l.name)
                      return (
                        <button
                          key={l.name}
                          type="button"
                          onClick={() =>
                            setSharedLists((v) => (active ? v.filter((n) => n !== l.name) : [...v, l.name]))
                          }
                          className={`px-2 py-0.5 rounded-full border label-xs ${active ? 'text-white border-transparent' : 'border-secondary text-secondary hover:bg-tertiary'}`}
                          style={active ? { backgroundColor: GOOGLE } : undefined}
                        >
                          {l.name} ({l.member_count})
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-secondary pt-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="subheading-sm text-primary">Ad groups — one keyword theme + search ad per asset</span>
                <button
                  onClick={suggest}
                  disabled={suggesting}
                  className="px-2.5 py-1 rounded-lg label-xs font-semibold border border-secondary text-secondary hover:bg-tertiary disabled:opacity-50"
                >
                  {suggesting ? 'Thinking…' : '✦ Suggest with Mia'}
                </button>
              </div>
              <div className="space-y-3">
                {drafts.map((d) => {
                  const problems = draftProblems(d)
                  const hCount = parseRsa(d.headlines).length
                  const dCount = parseRsa(d.descriptions).length
                  const kCount = parseKeywords(d.keywords).length
                  return (
                    <div key={d.assetId} className="bg-primary border border-secondary rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="subheading-xs text-primary">{d.name}</span>
                        <span className="paragraph-xs text-tertiary">
                          {kCount} keywords · {hCount}/15 headlines · {dCount}/4 descriptions
                        </span>
                      </div>
                      {d.finalUrl && <p className="paragraph-xs text-tertiary mb-1.5 truncate">→ {d.finalUrl}</p>}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className={fieldLabel}>Keywords (one per line; add "| EXACT" or "| PHRASE")</span>
                          <textarea rows={6} value={d.keywords} onChange={(e) => setDraft(d.assetId, { keywords: e.target.value })} placeholder={'steel fabrication near me | EXACT\nsteel fabrication'} className={textareaCls} />
                        </div>
                        <div>
                          <span className={fieldLabel}>Headlines (one per line, ≤{H_MAX} chars; "| HEADLINE_1" to pin)</span>
                          <textarea rows={6} value={d.headlines} onChange={(e) => setDraft(d.assetId, { headlines: e.target.value })} className={textareaCls} />
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className={fieldLabel}>Descriptions (one per line, ≤{D_MAX} chars)</span>
                        <textarea rows={3} value={d.descriptions} onChange={(e) => setDraft(d.assetId, { descriptions: e.target.value })} className={textareaCls} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <span className={fieldLabel}>Display path 1 (≤{PATH_MAX})</span>
                          <input value={d.path1} onChange={(e) => setDraft(d.assetId, { path1: e.target.value })} placeholder="e.g. steel" className={inputCls} />
                        </div>
                        <div>
                          <span className={fieldLabel}>Display path 2</span>
                          <input value={d.path2} onChange={(e) => setDraft(d.assetId, { path2: e.target.value })} placeholder="e.g. quote" className={inputCls} />
                        </div>
                      </div>
                      {problems.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {problems.map((p, i) => (
                            <li key={i} className="paragraph-xs text-utility-error-700">• {p}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="paragraph-xs text-tertiary mt-2">
                The campaign is created PAUSED — one switch in Google Ads activates the flight.
                Google mixes headlines/descriptions per search; ads also pass policy review first.
              </p>
            </div>
          </>
        ) : null}

        {error && <p className="mb-3 paragraph-xs text-utility-error-700">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={pushing} className="flex-1 px-4 py-3 border border-secondary rounded-lg subheading-md text-secondary hover:bg-tertiary disabled:opacity-50">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && preview && (
            <button
              onClick={push}
              disabled={pushing || blocked}
              className="flex-1 px-4 py-3 text-white rounded-lg subheading-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: GOOGLE }}
            >
              {pushing ? 'Pushing… (continues even if you close)' : `Push ${drafts.length} ad group${drafts.length === 1 ? '' : 's'} to Google`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
