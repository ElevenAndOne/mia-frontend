import { useEffect, useState } from 'react'
import {
  fetchMetaCustomAudiences,
  fetchMetaPushPreview,
  patchChannelAction,
  pushChannelActionToMeta,
  suggestMetaAudience,
} from '../../services/campaign-api'
import { useCampaignWorkspace } from '../../contexts/campaign-context'
import type { MetaPushPreview, MetaPushResult } from '../../types'

const META = '#0866FF'

interface Props {
  actionId: string
  onClose: () => void
}

// Preflight modal for Push to Meta: shows everything the push will build
// (objective/optimization, lifetime budget + flight, per-ad creative types) and
// lets the PM review/edit the Advantage+ audience seeds before confirming.
// The approved audience persists to the channel action's meta_push_config, so
// the next push (and the cron/poller world) reuses it.
export const MetaPushPreflight = ({ actionId, onClose }: Props) => {
  const { tenantId, sessionId, campaign, reloadDetail } = useCampaignWorkspace()

  const [preview, setPreview] = useState<MetaPushPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pushing, setPushing] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [rationale, setRationale] = useState('')
  const [result, setResult] = useState<MetaPushResult | null>(null)

  // Editable audience fields (seeded from the preview)
  const [interests, setInterests] = useState('')
  const [behaviors, setBehaviors] = useState('')
  const [includeAud, setIncludeAud] = useState('')
  const [excludeAud, setExcludeAud] = useState('')
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(65)
  const [gender, setGender] = useState<'all' | 'women' | 'men'>('all')
  const [savedAudiences, setSavedAudiences] = useState<{ name: string; subtype: string }[]>([])

  useEffect(() => {
    fetchMetaPushPreview(sessionId, tenantId, campaign.campaign_id, actionId)
      .then((p) => {
        setPreview(p)
        setInterests(p.audience.interest_seeds.join(', '))
        setBehaviors(p.audience.behavior_seeds.join(', '))
        setIncludeAud(p.audience.include_custom_audiences.join(', '))
        setExcludeAud(p.audience.exclude_custom_audiences.join(', '))
        setAgeMin(p.audience.age_min ?? 18)
        setAgeMax(p.audience.age_max ?? 65)
        setGender(p.audience.genders?.[0] === 2 ? 'women' : p.audience.genders?.[0] === 1 ? 'men' : 'all')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load preview'))
      .finally(() => setLoading(false))
    // Saved custom audiences feed the include/exclude pickers (best-effort).
    fetchMetaCustomAudiences(sessionId, tenantId, campaign.campaign_id)
      .then(setSavedAudiences)
      .catch(() => setSavedAudiences([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionId])

  const appendName = (setter: (fn: (v: string) => string) => void, name: string) =>
    setter((v) => (v.split(',').map((x) => x.trim()).includes(name) ? v : v ? `${v}, ${name}` : name))

  const splitNames = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

  const suggest = async () => {
    setSuggesting(true)
    setError('')
    try {
      const s = await suggestMetaAudience(sessionId, tenantId, campaign.campaign_id, actionId)
      setInterests(s.interest_seeds.join(', '))
      setBehaviors(s.behavior_seeds.join(', '))
      setAgeMin(s.age_min)
      setAgeMax(s.age_max)
      setGender(s.genders?.[0] === 2 ? 'women' : s.genders?.[0] === 1 ? 'men' : 'all')
      setRationale(s.rationale)
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
      // Persist the PM-approved audience onto the action, then push (which reads it).
      const audience = {
        advantage_plus: true,
        age_min: ageMin,
        age_max: ageMax,
        genders: gender === 'women' ? [2] : gender === 'men' ? [1] : null,
        interest_seeds: splitNames(interests),
        behavior_seeds: splitNames(behaviors),
        include_custom_audiences: splitNames(includeAud),
        exclude_custom_audiences: splitNames(excludeAud),
      }
      const existing = (preview?.meta_push_config as Record<string, unknown>) || {}
      await patchChannelAction(sessionId, tenantId, campaign.campaign_id, actionId, {
        meta_push_config: { ...existing, audience },
      })
      const r = await pushChannelActionToMeta(sessionId, tenantId, campaign.campaign_id, actionId)
      setResult(r)
      if (r.success) await reloadDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Push to Meta failed')
    } finally {
      setPushing(false)
    }
  }

  const fieldLabel = 'block label-xs text-tertiary mb-0.5'
  const inputCls =
    'w-full bg-primary border border-secondary rounded-lg px-2.5 py-1.5 paragraph-xs text-primary focus:outline-none focus:border-brand'
  const blocked = !!preview?.errors?.length

  return (
    <div className="campaign-workspace fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-secondary rounded-2xl border border-secondary p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: `${META}26` }}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={META} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </div>
          <div>
            <h2 className="title-h6 text-primary">Push to Meta — preflight</h2>
            {preview && <p className="paragraph-xs text-tertiary">{preview.campaign_name}{preview.reuses_existing ? ' · adds to the existing campaign/ad set' : ' · new paused campaign'}</p>}
          </div>
        </div>

        {loading && <p className="paragraph-sm text-tertiary py-6 text-center">Building preview…</p>}

        {result ? (
          result.success ? (
            <div className="bg-utility-success-100 border border-utility-success-300 rounded-lg p-4 mb-4">
              <p className="subheading-md text-utility-success-700">
                Created {result.ads_created ?? 0} paused ad{(result.ads_created ?? 0) === 1 ? '' : 's'}.
              </p>
              <p className="paragraph-xs text-utility-success-700 mt-1">Review and publish in Meta Ads Manager — nothing is live yet.</p>
            </div>
          ) : (
            <div className="bg-utility-error-100 border border-utility-error-300 rounded-lg p-4 mb-4">
              <p className="subheading-md text-utility-error-700">Push failed at the {result.stage} step.</p>
            </div>
          )
        ) : preview ? (
          <>
            {preview.errors.map((e, i) => (
              <p key={i} className="mb-2 paragraph-xs text-utility-error-700 bg-utility-error-100 border border-utility-error-300 rounded-lg px-3 py-2">{e.message}</p>
            ))}
            {preview.warnings.map((w, i) => (
              <p key={i} className="mb-2 paragraph-xs text-utility-warning-700">{w}</p>
            ))}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-primary border border-secondary rounded-lg p-3">
                <span className={fieldLabel}>Goal</span>
                <p className="paragraph-xs text-primary">{preview.objective} · {preview.optimization_goal}</p>
                {preview.custom_conversion_name && (
                  <p className="paragraph-xs text-tertiary mt-0.5">Optimising to: {preview.custom_conversion_name}</p>
                )}
                {!preview.capabilities.has_pixel && (
                  <p className="paragraph-xs text-tertiary mt-0.5">No pixel on this account — link clicks only</p>
                )}
              </div>
              <div className="bg-primary border border-secondary rounded-lg p-3">
                <span className={fieldLabel}>Budget & flight</span>
                <p className="paragraph-xs text-primary">
                  {preview.lifetime_budget ? `R${preview.lifetime_budget.toLocaleString()} lifetime` : '—'}
                </p>
                <p className="paragraph-xs text-tertiary mt-0.5">{preview.flight_start ?? 'now'} → {preview.flight_end ?? '?'}</p>
              </div>
            </div>

            <div className="mb-4">
              <span className={fieldLabel}>Ads ({preview.ads.length})</span>
              <ul className="space-y-1">
                {preview.ads.map((a) => (
                  <li key={a.asset_id} className="paragraph-xs text-secondary">
                    <span className="text-primary">{a.name}</span> — {a.creative_type}{a.cards ? ` (${a.cards} cards)` : ''} · "{a.headline}"
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-secondary pt-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="subheading-sm text-primary">Audience — Advantage+ starting signals</span>
                <button
                  onClick={suggest}
                  disabled={suggesting}
                  className="px-2.5 py-1 rounded-lg label-xs font-semibold border border-secondary text-secondary hover:bg-tertiary disabled:opacity-50"
                >
                  {suggesting ? 'Thinking…' : '✦ Suggest with Mia'}
                </button>
              </div>
              {rationale && <p className="paragraph-xs text-tertiary mb-2 italic">{rationale}</p>}
              <div className="space-y-2">
                <div>
                  <span className={fieldLabel}>Interests (comma-separated — exact Meta names)</span>
                  <input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g. Cooking, Recipes, Online shopping" className={inputCls} />
                </div>
                <div>
                  <span className={fieldLabel}>Behaviors</span>
                  <input value={behaviors} onChange={(e) => setBehaviors(e.target.value)} placeholder="e.g. Engaged Shoppers" className={inputCls} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className={fieldLabel}>Age min</span>
                    <input type="number" min={18} max={65} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <span className={fieldLabel}>Age max</span>
                    <input type="number" min={18} max={65} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <span className={fieldLabel}>Gender</span>
                    <select value={gender} onChange={(e) => setGender(e.target.value as 'all' | 'women' | 'men')} className={inputCls}>
                      <option value="all">All</option>
                      <option value="women">Women</option>
                      <option value="men">Men</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className={fieldLabel}>Include custom audiences (names)</span>
                    <input value={includeAud} onChange={(e) => setIncludeAud(e.target.value)} placeholder="e.g. Website visitors 180d" className={inputCls} />
                  </div>
                  <div>
                    <span className={fieldLabel}>Exclude custom audiences</span>
                    <input value={excludeAud} onChange={(e) => setExcludeAud(e.target.value)} placeholder="e.g. All lead submitters 365d" className={inputCls} />
                  </div>
                </div>
                {savedAudiences.length > 0 && (
                  <div>
                    <span className={fieldLabel}>Saved audiences on this ad account — click to include, ⌥-click to exclude</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {savedAudiences.slice(0, 16).map((a) => (
                        <button
                          key={a.name}
                          type="button"
                          onClick={(e) =>
                            e.altKey ? appendName(setExcludeAud, a.name) : appendName(setIncludeAud, a.name)
                          }
                          title={`${a.subtype} — click to include, alt/option-click to exclude`}
                          className="px-2 py-0.5 rounded-full border border-secondary label-xs text-secondary hover:bg-tertiary"
                        >
                          {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="paragraph-xs text-tertiary">
                  Location, minimum age and exclusions are hard rules; the rest steer Meta's AI.
                  Unrecognised names are skipped, never guessed.
                </p>
              </div>
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
              style={{ backgroundColor: META }}
            >
              {pushing ? 'Pushing… (continues even if you close)' : `Push ${preview.ads.length} to Meta`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
