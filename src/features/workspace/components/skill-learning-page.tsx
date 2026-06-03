import { useCallback, useEffect, useState } from 'react'
import { Spinner } from '../../../components/spinner'
import { apiFetch } from '../../../utils/api'

interface WorkspaceDef {
  id: string
  label: string
  description: string
}

const WORKSPACES: WorkspaceDef[] = [
  { id: 'landing_pages', label: 'Landing Pages', description: 'Landing page copy decks, page structure, copy briefs' },
  { id: 'copy_content', label: 'Copy & Content', description: 'Ad copy, social posts, captions, blog, scripts' },
  { id: 'paid_performance', label: 'Paid & Performance', description: 'Google Ads, Meta Ads, ROAS, CTR, ad spend analysis' },
  { id: 'email_outreach', label: 'Email & Outreach', description: 'Brevo, email campaigns, subject lines, drip sequences' },
  { id: 'conversion_growth', label: 'Conversion & Growth', description: 'CRO, landing pages, lead generation, signup flows' },
  { id: 'strategy_planning', label: 'Strategy & Planning', description: 'Channel strategy, go-to-market, RACE planning, budget allocation' },
  { id: 'sales_revenue', label: 'Sales & Revenue', description: 'HubSpot, sales pipeline, CRM, deal stages' },
  { id: 'audience_targeting', label: 'Audience & Targeting', description: 'Audience segmentation, Meta/Google audiences, retargeting' },
  { id: 'seo_ai_search', label: 'AI Search & SEO', description: 'SEO, AI Overviews, schema markup, organic rankings' },
]

interface FeedbackCount {
  positive: number
  negative: number
}

interface Props {
  sessionId: string | null
  tenantId: string
}

export function SkillLearningPage({ sessionId }: Props) {
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [feedbackCounts, setFeedbackCounts] = useState<Record<string, FeedbackCount>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!sessionId) return
    apiFetch(`/api/marketing-context/skill-notes?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setNotes(data.notes ?? {})
          setFeedbackCounts(data.feedback_counts ?? {})
          setDrafts(data.notes ?? {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  const handleSave = useCallback(async (workspaceId: string) => {
    if (!sessionId) return
    setSaving(workspaceId)
    try {
      const res = await apiFetch(`/api/marketing-context/skill-notes/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, note: drafts[workspaceId] ?? '' }),
      })
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes ?? {})
      }
    } catch { /* non-critical */ }
    finally { setSaving(null) }
  }, [sessionId, drafts])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" variant="dark" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="heading-sm text-primary">Skill Learning</h2>
        <p className="paragraph-sm text-secondary mt-1">
          Add client-specific notes for each skill area. Mia injects these alongside the skill framework
          whenever that skill fires in chat — so her output gets sharper for this client over time.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {WORKSPACES.map((ws) => {
          const counts = feedbackCounts[ws.id]
          const hasNote = Boolean(notes[ws.id])
          const isDirty = (drafts[ws.id] ?? '') !== (notes[ws.id] ?? '')

          return (
            <div key={ws.id} className="rounded-xl border border-tertiary bg-primary overflow-hidden">
              <div className="flex items-start justify-between gap-4 px-4 py-3 border-b border-tertiary">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="subheading-sm text-primary">{ws.label}</p>
                    {hasNote && (
                      <span className="px-1.5 py-0.5 rounded bg-utility-brand-100 text-utility-brand-700 label-xs shrink-0">note saved</span>
                    )}
                  </div>
                  <p className="paragraph-xs text-tertiary mt-0.5">{ws.description}</p>
                </div>
                {counts && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 label-xs text-success">
                      <span>👍</span> {counts.positive}
                    </span>
                    <span className="flex items-center gap-1 label-xs text-error">
                      <span>👎</span> {counts.negative}
                    </span>
                  </div>
                )}
              </div>

              <div className="px-4 py-3">
                <textarea
                  value={drafts[ws.id] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [ws.id]: e.target.value }))}
                  placeholder={`Add client-specific notes for ${ws.label.toLowerCase()}... e.g. "For this client: the trust signal is X, avoid Y, always mention Z"`}
                  rows={3}
                  className="w-full paragraph-sm text-primary bg-secondary border border-tertiary rounded-lg px-3 py-2 outline-none focus:border-utility-brand-400 resize-none placeholder:text-quaternary"
                />
                {isDirty && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleSave(ws.id)}
                      disabled={saving === ws.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-solid text-primary-onbrand rounded-lg label-sm hover:bg-brand-solid-hover transition-colors disabled:opacity-50"
                    >
                      {saving === ws.id ? <Spinner size="sm" /> : 'Save'}
                    </button>
                    <button
                      onClick={() => setDrafts((prev) => ({ ...prev, [ws.id]: notes[ws.id] ?? '' }))}
                      className="px-3 py-1.5 label-sm text-tertiary hover:text-primary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
