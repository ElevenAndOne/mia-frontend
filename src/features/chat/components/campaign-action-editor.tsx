type Json = Record<string, unknown>

const CHANNEL_LABELS: Record<string, string> = {
  organic_social: 'Organic Social', meta_ads: 'Meta Ads', google_ads: 'Google Ads',
  linkedin_ads: 'LinkedIn Ads', email: 'Email', website: 'Website', brevo: 'Brevo',
  hubspot: 'HubSpot', offline_event: 'Offline Event', packaging: 'Packaging',
  point_of_sale: 'Point of Sale', printing: 'Printing',
}

const input = 'px-2 py-1 border border-tertiary rounded text-xs bg-primary text-secondary outline-none focus:border-utility-brand-400'
const lbl = 'text-[10px] font-semibold text-quaternary uppercase tracking-wide'

interface Props {
  params: Json
  onChange: (next: Json) => void
}

// Editable preview for a proposed campaign_add_channel_action before Confirm.
// Lets the user tweak field VALUES (phase, per-channel budget + flight dates, per
// -asset launch date + best time) — the edited params are what gets written.
export const CampaignActionEditor = ({ params, onChange }: Props) => {
  const phaseName = (params.phase_name as string) ?? ''
  const cas = (params.channel_actions as Json[]) ?? []

  const setPhase = (v: string) => onChange({ ...params, phase_name: v })
  const setCA = (i: number, patch: Json) =>
    onChange({ ...params, channel_actions: cas.map((ca, idx) => (idx === i ? { ...ca, ...patch } : ca)) })
  const setAssetDetail = (ci: number, ai: number, key: string, value: string) => {
    const assets = ((cas[ci].assets as Json[]) ?? []).map((a, idx) => {
      if (idx !== ai) return a
      const details = { ...((a.details as Json) ?? {}), [key]: value || undefined }
      return { ...a, details }
    })
    setCA(ci, { assets })
  }

  return (
    <div className="bg-primary/50 rounded-lg p-3 mb-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className={lbl}>Phase</span>
        <input value={phaseName} onChange={(e) => setPhase(e.target.value)} className={`${input} flex-1`} placeholder="Phase name" />
      </div>

      {cas.map((ca, ci) => {
        const channel = ca.channel as string
        const assets = (ca.assets as Json[]) ?? []
        const period = (ca.budget_period as string) ?? 'total'
        return (
          <div key={ci} className="pl-2 border-l-2 border-tertiary space-y-2">
            <span className="label-xs text-secondary font-semibold">{CHANNEL_LABELS[channel] || channel}</span>

            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <span className={lbl}>Budget</span>
                <div className="flex gap-1 mt-0.5">
                  <input type="number" value={(ca.budget as number) ?? ''} onChange={(e) => setCA(ci, { budget: e.target.value ? Number(e.target.value) : undefined })} placeholder="—" className={`${input} w-24 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden`} />
                  <select value={period} onChange={(e) => setCA(ci, { budget_period: e.target.value })} className={input}>
                    <option value="total">total</option>
                    <option value="monthly">/mo</option>
                  </select>
                </div>
              </div>
              <div>
                <span className={lbl}>Flight start</span>
                <input type="date" value={(ca.start_date as string) ?? ''} onChange={(e) => setCA(ci, { start_date: e.target.value || undefined })} className={`${input} block mt-0.5`} />
              </div>
              <div>
                <span className={lbl}>Flight end</span>
                <input type="date" value={(ca.end_date as string) ?? ''} onChange={(e) => setCA(ci, { end_date: e.target.value || undefined })} className={`${input} block mt-0.5`} />
              </div>
            </div>

            {assets.map((a, ai) => {
              const details = (a.details as Json) ?? {}
              return (
                <div key={ai} className="space-y-1">
                  <span className="paragraph-xs text-primary">{(a.asset_name as string) || 'Asset'}{a.asset_type ? <span className="text-quaternary"> ({a.asset_type as string})</span> : null}</span>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div>
                      <span className={lbl}>Launch</span>
                      <input type="date" value={(details.launch_date as string) ?? ''} onChange={(e) => setAssetDetail(ci, ai, 'launch_date', e.target.value)} className={`${input} block mt-0.5`} />
                    </div>
                    <div>
                      <span className={lbl}>Best time</span>
                      <input type="text" value={(details.optimal_post_time as string) ?? ''} onChange={(e) => setAssetDetail(ci, ai, 'optimal_post_time', e.target.value)} placeholder="e.g. Tue 09:30" className={`${input} block mt-0.5 w-32`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
