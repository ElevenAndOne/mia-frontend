import { useCallback, useEffect, useState } from 'react'
import { Spinner } from '../../../components/spinner'
import { useToast } from '../../../contexts/toast-context'
import { apiFetch } from '../../../utils/api'

/**
 * Brand → "Facts Mia can state" (services/brand_facts, 11 Nov 2026).
 *
 * An award, certification, founding year, years in business, price, percentage or ranking only
 * goes into Mia's copy when it is in the business's own words: their guide, website, Page, what
 * they typed in Settings, a fact confirmed here, or what they told Mia in chat. Here the owner
 * confirms or rejects what Mia found in those words, adds facts, and sees what Mia saved from
 * chat. A rejected fact is never stated, even where a source still says it.
 */

interface Fact {
  id: string
  kind: string
  text: string
  claim: string | null
  status: 'confirmed' | 'rejected'
  source: string
  source_ref: string | null
}

interface Suggestion {
  kind: string
  claim: string
  text: string
  source: string
  source_ref: string | null
}

interface FactsPayload {
  confirmed: Fact[]
  rejected: Fact[]
  suggested: Suggestion[]
}

const SOURCE_LABEL: Record<string, string> = {
  guide: 'your brand guide',
  website: 'your website',
  page: 'your Facebook Page',
  brand_fields: 'what you typed in Settings',
  pm: 'added here',
  chat: 'you told Mia in chat',
}

interface Props {
  sessionId: string | null
  tenantId: string
  canManage: boolean
}

export const BrandFactsCard = ({ sessionId, tenantId, canManage }: Props) => {
  const { showToast } = useToast()
  const [data, setData] = useState<FactsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const base = `/api/tenants/${tenantId}/brand-kit/facts`
  const headers = { 'X-Session-ID': sessionId ?? '' }

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    apiFetch(base, { headers: { 'X-Session-ID': sessionId } })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as FactsPayload
        if (!cancelled) setData(body)
      })
      .catch(() => {
        if (!cancelled) showToast('error', "Couldn't load the brand facts.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [base, sessionId, showToast])

  const send = useCallback(
    async (key: string, init: RequestInit) => {
      setBusy(key)
      try {
        const res = await apiFetch(init.method === 'DELETE' ? key : base, init)
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'That didn’t save.' }))
          throw new Error(err.detail || 'That didn’t save.')
        }
        setData((await res.json()) as FactsPayload)
        return true
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'That didn’t save.')
        return false
      } finally {
        setBusy(null)
      }
    },
    [base, showToast],
  )

  const decide = (s: { text: string; claim?: string | null; kind?: string; source?: string; source_ref?: string | null }, status: 'confirmed' | 'rejected') =>
    send(`${status}:${s.claim ?? s.text}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: s.text, claim: s.claim ?? null, kind: s.kind, source: s.source, source_ref: s.source_ref, status }),
    })

  const forget = (f: Fact) => send(`${base}/${f.id}`, { method: 'DELETE', headers })

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Spinner size="sm" variant="dark" />
        <p className="paragraph-xs text-quaternary">Loading…</p>
      </div>
    )
  }
  if (!data) return null

  const empty = !data.confirmed.length && !data.rejected.length && !data.suggested.length

  return (
    <div className="space-y-4 pt-1">
      <p className="paragraph-xs text-quaternary">
        Awards, certifications, dates, years in business, prices and percentages only go into Mia’s
        copy when they’re in your own words or confirmed here. When she needs one that isn’t, she asks
        you and remembers the answer.
      </p>

      {empty && (
        <p className="paragraph-sm text-quaternary">
          Nothing yet. Upload your brand guide or read your website, and the facts Mia finds will show here
          for you to confirm.
        </p>
      )}

      {data.confirmed.length > 0 && (
        <div>
          <p className="subheading-sm text-primary mb-1.5">Mia can state</p>
          <ul className="space-y-1.5">
            {data.confirmed.map((f) => (
              <li key={f.id} className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="paragraph-sm text-primary leading-snug">{f.text}</p>
                  <p className="paragraph-xs text-quaternary">{SOURCE_LABEL[f.source] ?? f.source}</p>
                </div>
                {canManage && (
                  <button
                    onClick={() => forget(f)}
                    disabled={busy !== null}
                    className="paragraph-xs text-quaternary hover:text-secondary disabled:opacity-50 shrink-0"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.suggested.length > 0 && (
        <div>
          <p className="subheading-sm text-primary mb-1.5">Found in your own words. Right?</p>
          <ul className="space-y-2">
            {data.suggested.map((s) => (
              <li key={s.claim} className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="paragraph-sm text-primary leading-snug">
                    <span className="font-semibold">{s.claim}</span>
                    <span className="text-tertiary"> · “{s.text}”</span>
                  </p>
                  <p className="paragraph-xs text-quaternary">From {SOURCE_LABEL[s.source] ?? s.source}</p>
                </div>
                {canManage && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => decide(s, 'confirmed')}
                      disabled={busy !== null}
                      className="px-2.5 py-1 rounded-md paragraph-xs bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover disabled:opacity-50"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => decide(s, 'rejected')}
                      disabled={busy !== null}
                      className="px-2.5 py-1 rounded-md paragraph-xs border border-tertiary text-secondary hover:bg-secondary disabled:opacity-50"
                    >
                      Wrong
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.rejected.length > 0 && (
        <div>
          <p className="subheading-sm text-primary mb-1.5">Never say</p>
          <ul className="space-y-1.5">
            {data.rejected.map((f) => (
              <li key={f.id} className="flex items-start gap-3">
                <p className="paragraph-sm text-tertiary line-through leading-snug min-w-0 flex-1">
                  {f.claim ?? f.text}
                </p>
                {canManage && (
                  <button
                    onClick={() => forget(f)}
                    disabled={busy !== null}
                    className="paragraph-xs text-quaternary hover:text-secondary disabled:opacity-50 shrink-0"
                  >
                    Undo
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            const text = draft.trim()
            if (!text) return
            if (await decide({ text }, 'confirmed')) setDraft('')
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={300}
            placeholder="Add a fact, e.g. Family-run since 1965"
            className="flex-1 min-w-0 bg-primary text-primary paragraph-sm rounded-lg px-2.5 py-1.5 border border-tertiary focus:border-brand-primary outline-none"
          />
          <button
            type="submit"
            disabled={busy !== null || !draft.trim()}
            className="px-3 py-1.5 rounded-lg subheading-sm bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}
    </div>
  )
}
