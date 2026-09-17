import { Navigate, useParams } from 'react-router-dom'

/**
 * `/p/<conversation id>` → the home view with those drafts on the canvas.
 *
 * Exists only to keep the link Mia sends short. The first version pointed straight at
 * `/home?drafts=<24 hex characters>`; WhatsApp wrapped it and linkified the trailing digits
 * separately as a phone number, so tapping either half went somewhere wrong. A link that fits
 * on one line is the whole feature.
 *
 * No auth of its own — it redirects into the protected route, so an unauthenticated visitor
 * lands at sign-in and arrives here afterwards, exactly as any other deep link behaves.
 */
export const DraftsShortLink = () => {
  const { draftsId } = useParams<{ draftsId: string }>()
  if (!draftsId) return <Navigate to="/home" replace />
  return <Navigate to={`/home?drafts=${encodeURIComponent(draftsId)}`} replace />
}

export default DraftsShortLink
