import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../../utils/api'
import { useToast } from '../../../contexts/toast-context'
import { CampaignIdentityHeader } from '../components/campaign-identity-header'
import { LinkedContentContent } from '../components/builder/linked-content-panel'
import { LaunchReadinessContent } from '../components/builder/launch-readiness-panel'
import { NotesPanel } from '../../notes/components/notes-panel'
import { useCampaignWorkspace } from '../contexts/campaign-context'
import { useCampaignMutations } from '../hooks/use-campaign-mutations'
import { useWorkspaceLists } from '../hooks/use-workspace-lists'
import {
  deleteKpiSourceDoc,
  fetchKpiSourceDocs,
  patchKpi,
  uploadKpiSourceFile,
  type KpiSourceDoc,
} from '../services/campaign-api'
import type { KPI, SetupSection } from '../types'
import {
  fetchPhaseActuals,
  isAbort,
  type KPIActual,
} from '../../campaign/services/campaign-tracker-service'

// Everything that is configuration or connection for one campaign, behind one tab
// with a sub-nav — the builder keeps only what you edit while building.
// Sections are deep-linkable (/campaigns/:id/setup/sources) so chat and nudge
// banners can land people on the exact thing that needs fixing.

const SECTIONS: Array<{ value: SetupSection; label: string }> = [
  { value: 'measurement', label: 'Measurement' },
  { value: 'sources', label: 'Data sources' },
  { value: 'linked', label: 'Linked content' },
  { value: 'readiness', label: 'Readiness' },
  { value: 'rules', label: 'Rules' },
]

const btnText = 'cursor-pointer'
const inputCls =
  'paragraph-xs text-secondary bg-primary border border-tertiary rounded-lg px-2 py-1.5 outline-none focus:border-utility-brand-400'
const selectCls =
  'paragraph-xs text-tertiary bg-transparent border-b border-tertiary focus:border-utility-brand-400 outline-none cursor-pointer max-w-[280px]'

export const SetupView = () => {
  const { section } = useParams<{ section: string }>()
  const navigate = useNavigate()
  const { campaign } = useCampaignWorkspace()
  const active: SetupSection = SECTIONS.some((s) => s.value === section)
    ? (section as SetupSection)
    : 'measurement'

  return (
    <div className="space-y-6">
      <CampaignIdentityHeader view="setup" />

      <div className="bg-secondary rounded-2xl border border-secondary overflow-hidden">
        <div className="px-4 sm:px-5 pt-3 border-b border-tertiary overflow-x-auto">
          <div className="flex gap-5 w-max">
            {SECTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => navigate(`/campaigns/${campaign.campaign_id}/setup/${s.value}`)}
                className={`cursor-pointer label-sm pb-2.5 border-b-2 whitespace-nowrap transition-colors ${
                  active === s.value
                    ? 'text-primary border-utility-brand-500'
                    : 'text-quaternary border-transparent hover:text-secondary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {active === 'measurement' && <MeasurementSection />}
        {active === 'sources' && <DataSourcesSection />}
        {active === 'linked' && <LinkedSection />}
        {active === 'readiness' && <ReadinessSection />}
      </div>

      {/* Rules keeps its own card look (composer + list) rather than living inside the strip card */}
      {active === 'rules' && <RulesSection />}
    </div>
  )
}

// ── Measurement — GA4 property, UTM tag, campaign guide ─────────────────────

interface GA4Option { property_id: string; display_name: string }

// GA4 options are expensive (live platform discovery), so cache them at module level —
// switching Setup sections unmounts the component and must not refetch.
let ga4OptionsCache: { ts: number; options: GA4Option[] } | null = null
const GA4_CACHE_TTL_MS = 10 * 60 * 1000

const MeasurementSection = () => {
  const { campaign, sessionId } = useCampaignWorkspace()
  const { patchCampaign, linkGuide } = useCampaignMutations()
  const { guides } = useWorkspaceLists()

  const [ga4Options, setGa4Options] = useState<GA4Option[] | null>(() =>
    ga4OptionsCache && Date.now() - ga4OptionsCache.ts < GA4_CACHE_TTL_MS
      ? ga4OptionsCache.options
      : null,
  )
  const [ga4Loading, setGa4Loading] = useState(false)
  // Loads only when the dropdown itself is opened — never on hover or section mount.
  const loadGa4Options = async () => {
    if (ga4Options || ga4Loading) return
    if (ga4OptionsCache && Date.now() - ga4OptionsCache.ts < GA4_CACHE_TTL_MS) {
      setGa4Options(ga4OptionsCache.options)
      return
    }
    setGa4Loading(true)
    try {
      const res = await apiFetch('/api/accounts/available', { headers: { 'X-Session-ID': sessionId } })
      const data = await res.json()
      const options = ((data.ga4_properties ?? []) as GA4Option[]).sort((a, b) =>
        a.display_name.localeCompare(b.display_name),
      )
      ga4OptionsCache = { ts: Date.now(), options }
      setGa4Options(options)
    } catch {
      setGa4Options([])
    } finally {
      setGa4Loading(false)
    }
  }

  const [utmDraft, setUtmDraft] = useState(campaign.utm_campaign ?? '')

  return (
    <div className="p-4 sm:p-5 space-y-5">
      <div className="space-y-1">
        <p className="label-sm text-primary">GA4 property</p>
        <p className="paragraph-xs text-quaternary">
          Which site's traffic counts toward this campaign's website KPIs.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <select
            value={campaign.ga4_property_id ?? ''}
            onFocus={() => void loadGa4Options()}
            onMouseDown={() => void loadGa4Options()}
            onChange={(e) => {
              const id = e.target.value || null
              const name = id
                ? (ga4Options?.find((p) => p.property_id === id)?.display_name ?? null)
                : null
              void patchCampaign({ ga4_property_id: id, ga4_property_name: name })
            }}
            className={selectCls}
          >
            <option value="">Workspace default</option>
            {campaign.ga4_property_id &&
              !ga4Options?.some((p) => p.property_id === campaign.ga4_property_id) && (
                <option value={campaign.ga4_property_id}>
                  {campaign.ga4_property_name ?? campaign.ga4_property_id}
                </option>
              )}
            {ga4Options?.map((p) => (
              <option key={p.property_id} value={p.property_id}>
                {ga4Options.filter((o) => o.display_name === p.display_name).length > 1
                  ? `${p.display_name} · ${p.property_id}`
                  : p.display_name}
              </option>
            ))}
          </select>
          {ga4Loading && <span className="label-xs text-quaternary">loading properties…</span>}
          {campaign.ga4_property_id && (
            <span className="label-xs px-1.5 py-0.5 rounded bg-utility-brand-100 text-utility-brand-700">
              override
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="label-sm text-primary">UTM campaign tag</p>
        <p className="paragraph-xs text-quaternary">
          The <span className="cw-mono">utm_campaign</span> value this campaign's links carry —
          comma-separate several (e.g. <span className="cw-mono">cable_tray, y26_onvlee</span>) and
          traffic matching any of them counts. When empty, website KPIs count all site traffic and
          say so.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <input
            value={utmDraft}
            onChange={(e) => setUtmDraft(e.target.value)}
            placeholder="e.g. juicy_gems — or tag1, tag2"
            className={`${inputCls} w-64 cw-mono`}
          />
          {utmDraft !== (campaign.utm_campaign ?? '') && (
            <button
              onClick={() => void patchCampaign({ utm_campaign: utmDraft.trim() || null })}
              className={`${btnText} label-xs text-utility-brand-600 hover:text-utility-brand-700`}
            >
              Save
            </button>
          )}
          {campaign.utm_campaign && (
            <span className="label-xs px-1.5 py-0.5 rounded bg-utility-success-100 text-utility-success-700">
              attributed traffic only
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="label-sm text-primary">Campaign guide</p>
        <p className="paragraph-xs text-quaternary">
          The deck this campaign was built from — Mia cites it when a recommendation contradicts
          the plan. Guides are uploaded in Workspace Settings → Campaign Guides.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <select
            value={campaign.campaign_guide_id ?? ''}
            onChange={(e) => void linkGuide(e.target.value || null)}
            className={selectCls}
            disabled={guides.length === 0}
          >
            <option value="">{guides.length === 0 ? 'No guides uploaded yet' : '— None —'}</option>
            {guides.map((g) => (
              <option key={g.id} value={g.id}>
                {g.campaign_name ?? g.filename}
              </option>
            ))}
          </select>
          {campaign.campaign_guide_id && (
            <span className="label-xs px-1.5 py-0.5 rounded bg-utility-brand-100 text-utility-brand-700">
              linked
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Data sources — uploaded documents + what each KPI reads from ────────────

interface BindDraft {
  kpiId: number
  kpiName: string
  docId: string
  mode: 'value' | 'sum' | 'count'
  path: string
  itemsPath: string
  valueField: string
  startField: string
  endField: string
}

// What an unbound KPI's row should say depends on whether the platforms actually
// measure it — the tracker's actuals know (state 'live' vs 'none'). Until they load,
// stay neutral.
const describeBinding = (
  kpi: KPI,
  actual: KPIActual | undefined,
): { label: string; kind: 'source' | 'legacy' | 'manual' | 'live' | 'none' | 'unknown' } => {
  const src = kpi.kpi_source as Record<string, any> | null | undefined
  if (src?.provider === 'json') {
    const ref = src.ref ?? {}
    return { label: `JSON · ${ref.path ?? ref.value_field ?? 'mapped'}`, kind: 'source' }
  }
  if (src?.provider === 'ratio') return { label: 'ratio of two fields', kind: 'source' }
  if (src?.provider === 'ga4') return { label: `GA4 event · ${src.ref?.event_name ?? ''}`, kind: 'source' }
  if (kpi.manual_actual != null) return { label: 'manual entry', kind: 'manual' }
  if (kpi.hubspot_list_name) return { label: `HubSpot · ${kpi.hubspot_list_name}`, kind: 'legacy' }
  if (kpi.brevo_list_name) return { label: `Brevo · ${kpi.brevo_list_name}`, kind: 'legacy' }
  if (actual?.state === 'none') return { label: 'nothing measures this — shows "Not tracked"', kind: 'none' }
  if (actual && actual.actual_value !== null) return { label: 'measured from connected platforms', kind: 'live' }
  return { label: 'auto (connected platforms)', kind: 'unknown' }
}

const DataSourcesSection = () => {
  const { campaign, sessionId, tenantId, reloadDetail } = useCampaignWorkspace()
  const { showToast } = useToast()
  const [docs, setDocs] = useState<KpiSourceDoc[] | null>(null)
  const [bind, setBind] = useState<BindDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadDocs = useCallback(async () => {
    try {
      setDocs(await fetchKpiSourceDocs(sessionId, tenantId, campaign.campaign_id))
    } catch {
      setDocs([])
    }
  }, [sessionId, tenantId, campaign.campaign_id])

  useEffect(() => {
    void loadDocs()
  }, [loadDocs])

  // Cached tracker actuals tell us whether the platforms really measure each unbound
  // KPI, so the table can say "nothing measures this" instead of a vague "auto".
  const [actualsByPhase, setActualsByPhase] = useState<Record<string, KPIActual[] | null>>({})
  useEffect(() => {
    const controller = new AbortController()
    for (const phase of campaign.phases) {
      void fetchPhaseActuals(
        sessionId, tenantId, campaign.campaign_id, phase.phase_name,
        null, null, controller.signal,
      )
        .then((rows) => setActualsByPhase((prev) => ({ ...prev, [phase.phase_name]: rows })))
        .catch((err) => {
          if (!isAbort(err)) setActualsByPhase((prev) => ({ ...prev, [phase.phase_name]: null }))
        })
    }
    return () => controller.abort()
  }, [sessionId, tenantId, campaign.campaign_id, campaign.phases])

  const onUpload = async (file: File) => {
    setBusy(true)
    try {
      const res = await uploadKpiSourceFile(sessionId, tenantId, campaign.campaign_id, file)
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        showToast('error', data?.detail ?? 'Upload failed')
        return
      }
      showToast('success', data.replaced ? `Updated ${data.name}` : `Uploaded ${data.name}`)
      // The dangers, as promised — PII and truncation warnings from the server.
      for (const w of data.warnings ?? []) showToast('warning', w, 12000)
      await loadDocs()
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const saveBinding = async () => {
    if (!bind) return
    const doc = docs?.find((d) => d.doc_id === bind.docId)
    const itemsPath = bind.itemsPath.trim() || (doc?.picker?.bucket_lists?.[0]?.path ?? '')
    const ref: Record<string, unknown> =
      bind.mode === 'value'
        ? { doc_id: bind.docId, path: bind.path.trim() }
        : {
            doc_id: bind.docId,
            items_path: itemsPath,
            ...(bind.mode === 'sum' ? { value_field: bind.valueField.trim() } : {}),
            start_field: bind.startField.trim(),
            ...(bind.mode === 'sum' ? { end_field: bind.endField.trim() } : {}),
          }
    const body = { provider: 'json', metric: bind.mode, ref }
    setBusy(true)
    try {
      const res = await patchKpi(sessionId, tenantId, campaign.campaign_id, bind.kpiId, {
        kpi_source: body,
      })
      if (!res.ok) {
        showToast('error', 'Failed to save the binding')
        return
      }
      showToast('success', 'KPI bound — the tracker picks it up on next refresh')
      setBind(null)
      await reloadDetail()
    } finally {
      setBusy(false)
    }
  }

  const unbind = async (kpiId: number) => {
    const res = await patchKpi(sessionId, tenantId, campaign.campaign_id, kpiId, { kpi_source: null })
    if (res.ok) {
      showToast('success', 'Unbound')
      await reloadDetail()
    }
  }

  return (
    <div className="p-4 sm:p-5 space-y-5">
      <div className="space-y-2">
        <div>
          <p className="label-sm text-primary">Files for this campaign</p>
          <p className="paragraph-xs text-quaternary">
            Whatever the client or vendor sends — JSON, CSV or Excel. KPIs read numbers straight
            out of these files. Re-uploading a file with the same name replaces it, so bindings
            keep working when a new period arrives. Aggregate exports are safest; files with
            personal details get a warning and are visible to everyone in this workspace.
          </p>
        </div>

        {docs === null ? (
          <p className="paragraph-xs text-quaternary">Loading…</p>
        ) : (
          docs.map((d) => (
            <div key={d.doc_id} className="flex items-center gap-3 bg-primary border border-tertiary rounded-xl px-3 py-2.5 flex-wrap">
              <span className="cw-mono label-xs text-tertiary shrink-0">{'{ }'}</span>
              <div className="flex-1 min-w-[180px]">
                <p className="paragraph-xs text-secondary">{d.name}</p>
                <p className="label-xs text-quaternary">
                  {d.uploaded_by ?? ''}
                  {d.updated_at
                    ? ` · updated ${new Date(d.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                    : ''}
                  {d.top_level_keys.length > 0 ? ` · keys: ${d.top_level_keys.join(', ')}` : ''}
                </p>
              </div>
              <button
                onClick={async () => {
                  const res = await deleteKpiSourceDoc(sessionId, tenantId, campaign.campaign_id, d.doc_id)
                  if (res.ok) {
                    showToast('success', 'Deleted — bound KPIs show "Not tracked" until re-pointed')
                    await loadDocs()
                  }
                }}
                className={`${btnText} label-xs text-quaternary hover:text-utility-error-500 shrink-0`}
              >
                delete
              </button>
            </div>
          ))
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && void onUpload(e.target.files[0])}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="cursor-pointer w-full border border-dashed border-tertiary rounded-xl py-4 paragraph-xs text-quaternary hover:text-secondary hover:border-utility-brand-400 disabled:opacity-50 disabled:cursor-default"
        >
          {busy ? 'Working…' : 'Upload a file (JSON, CSV or Excel) — click to browse'}
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <p className="label-sm text-primary">What each KPI reads from</p>
          <p className="paragraph-xs text-quaternary">
            Unbound KPIs use the connected platforms automatically; a KPI nothing can measure shows
            "Not tracked" on the tracker until a source is wired here.
          </p>
        </div>
        <div className="rounded-xl border border-tertiary overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="bg-primary">
                <th className="text-left label-xs text-quaternary px-3 py-2">Phase</th>
                <th className="text-left label-xs text-quaternary px-3 py-2">KPI</th>
                <th className="text-left label-xs text-quaternary px-3 py-2">Source</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {campaign.phases.flatMap((phase) =>
                phase.kpis.map((kpi) => {
                  const rows = actualsByPhase[phase.phase_name]
                  const actual = rows?.find((r) => r.kpi_name.toLowerCase() === kpi.kpi_name.toLowerCase())
                  const b = describeBinding(kpi, actual)
                  const firstBuckets = docs?.[0]?.picker?.bucket_lists?.[0]
                  return (
                    <tr key={kpi.kpi_id} className="border-t border-tertiary">
                      <td className="px-3 py-2 paragraph-xs text-quaternary whitespace-nowrap">{phase.phase_name}</td>
                      <td className="px-3 py-2 paragraph-xs text-secondary">{kpi.kpi_name}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`label-xs px-1.5 py-0.5 rounded ${
                            b.kind === 'source'
                              ? 'bg-utility-brand-100 text-utility-brand-700'
                              : b.kind === 'manual'
                                ? 'bg-utility-warning-100 text-utility-warning-700'
                                : b.kind === 'legacy' || b.kind === 'live'
                                  ? 'bg-utility-success-100 text-utility-success-700'
                                  : b.kind === 'none'
                                    ? 'bg-utility-error-100 text-utility-error-700'
                                    : 'text-quaternary'
                          }`}
                        >
                          {b.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {kpi.kpi_source ? (
                          <button onClick={() => void unbind(kpi.kpi_id)} className={`${btnText} label-xs text-quaternary hover:text-utility-error-500`}>
                            unbind
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              setBind({
                                kpiId: kpi.kpi_id,
                                kpiName: kpi.kpi_name,
                                docId: docs?.[0]?.doc_id ?? '',
                                mode: 'value',
                                path: '',
                                itemsPath: firstBuckets?.path ?? '',
                                valueField: '',
                                startField: firstBuckets?.date_fields?.[0] ?? '',
                                endField: firstBuckets?.date_fields?.[1] ?? '',
                              })
                            }
                            disabled={!docs || docs.length === 0}
                            className={`${btnText} label-xs text-utility-brand-600 hover:text-utility-brand-700 disabled:opacity-40 disabled:cursor-default`}
                            title={!docs || docs.length === 0 ? 'Upload a file first' : 'Point this KPI at an uploaded file'}
                          >
                            bind…
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                }),
              )}
            </tbody>
          </table>
        </div>
      </div>

      {bind && (() => {
        const doc = docs?.find((d) => d.doc_id === bind.docId)
        const paths = doc?.picker?.numeric_paths ?? []
        const buckets = doc?.picker?.bucket_lists ?? []
        const bucket = buckets.find((b) => b.path === bind.itemsPath) ?? buckets[0]
        return (
          <div className="bg-primary border border-tertiary rounded-xl p-4 space-y-3">
            <p className="label-sm text-primary">
              Bind <span className="text-utility-brand-600">{bind.kpiName}</span> to a file
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="label-xs text-quaternary w-24">File</span>
              <select
                value={bind.docId}
                onChange={(e) => setBind({ ...bind, docId: e.target.value, path: '', valueField: '' })}
                className={`${selectCls} cursor-pointer`}
              >
                {docs?.map((d) => (
                  <option key={d.doc_id} value={d.doc_id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="label-xs text-quaternary w-24">Read as</span>
              <select
                value={bind.mode}
                onChange={(e) => setBind({ ...bind, mode: e.target.value as 'value' | 'sum' | 'count' })}
                className={`${selectCls} cursor-pointer`}
              >
                <option value="value">Single value (a number in the file)</option>
                <option value="sum" disabled={buckets.length === 0}>
                  Sum a column over the date range{buckets.length === 0 ? ' (no tables in this file)' : ''}
                </option>
                <option value="count" disabled={buckets.length === 0}>
                  Count rows in the date range{buckets.length === 0 ? ' (no tables in this file)' : ''}
                </option>
              </select>
            </div>
            {bind.mode === 'value' ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="label-xs text-quaternary w-24">Value</span>
                {paths.length > 0 ? (
                  <select
                    value={bind.path}
                    onChange={(e) => setBind({ ...bind, path: e.target.value })}
                    className={`${selectCls} cursor-pointer cw-mono`}
                  >
                    <option value="">— pick a value from the file —</option>
                    {paths.map((pp) => (
                      <option key={pp.path} value={pp.path}>
                        {pp.path} = {pp.value.toLocaleString()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={bind.path}
                    onChange={(e) => setBind({ ...bind, path: e.target.value })}
                    placeholder="e.g. summary.totalRedeemedCodes"
                    className={`${inputCls} w-72 cw-mono`}
                  />
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="label-xs text-quaternary w-24">Table</span>
                  <select
                    value={bind.itemsPath || (bucket?.path ?? '')}
                    onChange={(e) => setBind({ ...bind, itemsPath: e.target.value, valueField: '' })}
                    className={`${selectCls} cursor-pointer cw-mono`}
                  >
                    {buckets.map((bl) => (
                      <option key={bl.path} value={bl.path}>
                        {bl.path} ({bl.count} rows)
                      </option>
                    ))}
                  </select>
                  {bind.mode === 'sum' && (
                    <>
                      <span className="label-xs text-quaternary">Column</span>
                      <select
                        value={bind.valueField}
                        onChange={(e) => setBind({ ...bind, valueField: e.target.value })}
                        className={`${selectCls} cursor-pointer cw-mono`}
                      >
                        <option value="">— pick a column —</option>
                        {(bucket?.value_fields ?? []).map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="label-xs text-quaternary w-24">
                    {bind.mode === 'count' ? 'Date column' : 'Period dates'}
                  </span>
                  <select
                    value={bind.startField}
                    onChange={(e) => setBind({ ...bind, startField: e.target.value })}
                    className={`${selectCls} cursor-pointer cw-mono`}
                  >
                    <option value="">start field</option>
                    {(bucket?.date_fields ?? []).map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  {bind.mode === 'sum' && (
                    <select
                      value={bind.endField}
                      onChange={(e) => setBind({ ...bind, endField: e.target.value })}
                      className={`${selectCls} cursor-pointer cw-mono`}
                    >
                      <option value="">end field</option>
                      {(bucket?.date_fields ?? []).map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  )}
                  {bind.mode === 'count' && (
                    <span className="label-xs text-quaternary">
                      rows dated inside the tracker's window are counted
                    </span>
                  )}
                </div>
              </>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => void saveBinding()}
                disabled={busy || !bind.docId || (bind.mode === 'value' ? !bind.path.trim() : bind.mode === 'sum' ? !bind.valueField.trim() : false)}
                className={`${btnText} label-xs px-3 py-1.5 rounded-lg bg-utility-brand-500 text-white disabled:opacity-50 disabled:cursor-default`}
              >
                Save binding
              </button>
              <button onClick={() => setBind(null)} className={`${btnText} label-xs text-quaternary hover:text-secondary`}>
                Cancel
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Relocated existing pages ────────────────────────────────────────────────

const LinkedSection = () => {
  const { campaign, reloadDetail } = useCampaignWorkspace()
  return (
    <>
      <div className="p-4 sm:p-5 border-b border-tertiary">
        <p className="label-sm text-primary">Linked content</p>
        <p className="paragraph-xs text-quaternary mt-0.5">
          What counts towards this campaign's KPIs. Anything not linked is not measured.
        </p>
      </div>
      <LinkedContentContent campaignId={campaign.campaign_id} onSaved={() => void reloadDetail()} />
    </>
  )
}

const ReadinessSection = () => {
  const { campaign } = useCampaignWorkspace()
  return (
    <>
      <div className="p-4 sm:p-5 border-b border-tertiary">
        <p className="label-sm text-primary">Launch readiness</p>
        <p className="paragraph-xs text-quaternary mt-0.5">
          What the preflight found on every pushable channel, kept with each push — who checked,
          what passed, what was accepted.
        </p>
      </div>
      <LaunchReadinessContent campaignId={campaign.campaign_id} />
    </>
  )
}

const RulesSection = () => {
  const { campaign, sessionId, tenantId } = useCampaignWorkspace()
  return (
    <NotesPanel
      sessionId={sessionId}
      tenantId={tenantId}
      scope="campaign"
      campaignId={campaign.campaign_id}
      title="Rules"
      description="What Mia has been told to follow for this campaign. Say it once in chat or add it here; she follows it in every conversation and cites it when it shapes a recommendation. Brand-wide rules live in Workspace Settings → Rules."
      placeholder="Add a rule for this campaign… e.g. “No giveaway in September — test a different wildcard.”"
    />
  )
}
