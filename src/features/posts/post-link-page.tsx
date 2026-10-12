import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/button'
import { Spinner } from '../../components/spinner'
import { useSession } from '../../contexts/session-context'
import { apiFetch } from '../../utils/api'
import type { CanvasDocument } from '../chat/services/chat-service'
import { parseCreativeSpec } from '../chat/components/previews/creative-spec'
import type { CreativeSpec } from '../chat/components/previews/creative-spec'
import { FacebookPreview, InstagramPreview } from '../chat/components/previews/platform-previews'
import type { PostStatus } from './types'

/**
 * `/p/<code>`: the posts behind the link Mia puts in a WhatsApp message, with no sign-in.
 *
 * A staff member has no login, and an owner on a phone rarely has a session, so the old
 * redirect into the signed-in app ended at a sign-in wall for exactly the people the link was
 * for (gap analysis §6.4). The code is opaque and expires; the backend scopes everything to
 * the workspace it was minted for. Read-only here; "Open in Mia" is there for anyone who is
 * signed in. An old-style link (a conversation id) still falls through to the drafts view.
 */

interface Booking {
  status: PostStatus
  platform: string
  scheduled_at: string | null
  published_at: string | null
  permalink: string | null
}

interface LinkPayload {
  conversation_id: string
  brand_name: string
  identity?: { facebook?: { name?: string | null; avatar?: string | null }; instagram?: { handle?: string | null; avatar?: string | null } } | null
  posts: Array<{ document: CanvasDocument; bookings: Booking[] }>
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const statusLine = (b: Booking | undefined) => {
  if (!b) return 'Not booked yet'
  if (b.status === 'published') return `Live${b.published_at ? ` since ${fmtWhen(b.published_at)}` : ''}`
  if (b.status === 'scheduled' || b.status === 'reminded') return `Going out ${b.scheduled_at ? fmtWhen(b.scheduled_at) : 'soon'}`
  if (b.status === 'failed') return 'Didn’t go out'
  if (b.status === 'canceled') return 'Cancelled'
  return b.status
}

export const PostLinkPage = () => {
  const { draftsId } = useParams<{ draftsId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useSession()
  const [payload, setPayload] = useState<LinkPayload | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'gone' | 'legacy'>('loading')

  useEffect(() => {
    let active = true
    if (!draftsId) return
    // A conversation id from an older message: the signed-in drafts view still answers it.
    if (draftsId.length > 12) {
      setState('legacy')
      return
    }
    apiFetch(`/api/post-link/${encodeURIComponent(draftsId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: LinkPayload) => {
        if (!active) return
        setPayload(d)
        setState('ok')
      })
      .catch(() => active && setState('gone'))
    return () => {
      active = false
    }
  }, [draftsId])

  if (!draftsId) return <Navigate to="/home" replace />
  if (state === 'legacy') return <Navigate to={`/home?drafts=${encodeURIComponent(draftsId)}`} replace />

  const posts = (payload?.posts ?? [])
    .map((p) => {
      try {
        return { spec: parseCreativeSpec(p.document) as CreativeSpec, bookings: p.bookings, id: p.document.id }
      } catch {
        return null
      }
    })
    .filter((x): x is { spec: CreativeSpec; bookings: Booking[]; id: string } => !!x)

  return (
    <div className="min-h-screen bg-primary text-primary">
      <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="label-xs text-quaternary uppercase tracking-wide">Mia</p>
            <h1 className="subheading-md text-primary truncate">{payload?.brand_name || 'Your posts'}</h1>
          </div>
          {isAuthenticated && payload && (
            <Button size="sm" variant="secondary" onClick={() => navigate(`/home?drafts=${encodeURIComponent(payload.conversation_id)}`)}>
              Open in Mia
            </Button>
          )}
        </div>

        {state === 'loading' && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}
        {state === 'gone' && (
          <div className="rounded-xl border border-secondary bg-secondary p-6 text-center">
            <p className="paragraph-sm font-semibold text-primary">This link has expired</p>
            <p className="paragraph-xs text-quaternary mt-1">Ask Mia on WhatsApp for the posts again and she’ll send a fresh one.</p>
          </div>
        )}
        {state === 'ok' && posts.length === 0 && (
          <p className="paragraph-sm text-quaternary">No posts here yet.</p>
        )}
        {state === 'ok' &&
          posts.map(({ spec, bookings, id }, i) => {
            const latest = bookings[bookings.length - 1]
            return (
              <section key={id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="label-xs font-semibold text-quaternary">Post {'AB'[i] ?? i + 1}</p>
                  <p className="paragraph-xs text-quaternary">{statusLine(latest)}</p>
                </div>
                <div className="rounded-xl border border-secondary overflow-hidden bg-white">
                  {spec.platform === 'instagram' ? (
                    <InstagramPreview
                      spec={spec}
                      brandName={payload?.brand_name}
                      handle={payload?.identity?.instagram?.handle ?? undefined}
                      avatarUrl={payload?.identity?.instagram?.avatar ?? undefined}
                    />
                  ) : (
                    <FacebookPreview
                      spec={spec}
                      brandName={payload?.identity?.facebook?.name || payload?.brand_name}
                      avatarUrl={payload?.identity?.facebook?.avatar ?? undefined}
                    />
                  )}
                </div>
                {latest?.permalink && (
                  <a href={latest.permalink} target="_blank" rel="noreferrer" className="paragraph-xs text-utility-brand-600 hover:underline self-start">
                    View on {latest.platform === 'instagram' ? 'Instagram' : 'Facebook'} ↗
                  </a>
                )}
              </section>
            )
          })}
        {state === 'ok' && !isAuthenticated && (
          <p className="paragraph-xs text-quaternary">To change anything, reply to Mia on WhatsApp.</p>
        )}
      </div>
    </div>
  )
}

export default PostLinkPage
