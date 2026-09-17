import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../utils/api'
import type { CanvasDocument } from '../chat/services/chat-service'
import { parseCreativeSpec } from '../chat/components/previews/creative-spec'
import { FacebookPreview, InstagramPreview } from '../chat/components/previews/platform-previews'

/**
 * Standalone card route (/post-card?token=&doc=) used by the backend Playwright renderer to
 * screenshot ONE post as it will appear on its platform, for sending over WhatsApp.
 *
 * Not behind ProtectedRoute — it authenticates with a signed, five-minute, single-document
 * token, the same shape /report-print uses. The token carries the workspace, so this page
 * never sends a tenant id of its own.
 *
 * It renders the app's own preview components rather than a WhatsApp-specific copy of them.
 * That is the point: a second set of mocks would drift from the canvas within a month, and
 * then the picture a client approves on their phone stops matching what they see in Mia.
 *
 * Width is fixed at CARD_WIDTH CSS pixels and the renderer scales up with a device pixel
 * ratio, so the type scale stays the one these components were designed at — forcing the
 * layout to 1080 CSS px instead would leave the text tiny inside a huge card.
 */

export const CARD_WIDTH = 420

interface CardPayload {
  document: CanvasDocument
  brand_name: string
}

export const PostCardPage = () => {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const doc = params.get('doc') || ''
  const [payload, setPayload] = useState<CardPayload | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    // The platforms' own chrome is light. The renderer opens a fresh browser with no stored
    // preference, but be explicit rather than rely on that.
    document.documentElement.classList.remove('dark')
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])

  useEffect(() => {
    let active = true
    if (!token || !doc) {
      setError(true)
      return
    }
    apiFetch(`/api/post-card?token=${encodeURIComponent(token)}&doc=${encodeURIComponent(doc)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: CardPayload) => active && setPayload(d))
      .catch(() => active && setError(true))
    return () => {
      active = false
    }
  }, [token, doc])

  const spec = payload ? parseCreativeSpec(payload.document) : null
  const ready = !!spec || error
  const Preview = spec?.platform === 'instagram' ? InstagramPreview : FacebookPreview

  return (
    <div
      data-card-ready={ready ? 'true' : 'false'}
      style={{ background: '#fff', width: CARD_WIDTH, overflow: 'hidden' }}
    >
      {spec ? (
        <div
          data-card-root
          data-card-media={spec.media.length}
          data-card-platform={spec.platform}
          style={{ width: CARD_WIDTH }}
        >
          <Preview spec={spec} brandName={payload?.brand_name} />
        </div>
      ) : error ? (
        <div style={{ padding: 16, fontFamily: 'system-ui' }}>Post unavailable.</div>
      ) : null}
    </div>
  )
}

export default PostCardPage
