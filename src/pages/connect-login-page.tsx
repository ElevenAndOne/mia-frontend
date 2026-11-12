import { useState } from 'react'
import { useSession } from '../contexts/session-context'
import { Spinner } from '../components/spinner'
import { UserAvatar } from '../components/user-avatar'
import { createApiUrl, createSessionHeaders } from '../utils/api'
import { clearExternalAuthId, readExternalAuthId } from '../features/connect/external-auth-id'

const EXPIRED = 'This connection link has expired or was already used. Go back to Claude and connect again.'
const FAILED = "That didn't work. Go back to Claude and try connecting again."
// The session's own error text is for developers ("Failed to fetch"); the person gets this.
const SIGN_IN_FAILED = "Signing in to Mia didn't work. Please try again."

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="h-full flex items-center justify-center p-4">
    <div className="bg-primary rounded-2xl shadow-xl p-8 max-w-md w-full text-center">{children}</div>
  </div>
)

/**
 * Where Claude sends a person to sign in to Mia (WorkOS Standalone Connect's Login URI).
 *
 * Mia is the login: the person signs in the usual way, then clicks Connect. The click is
 * the point. Nothing is sent to the backend on load, so a link someone else started can
 * never connect a signed-in person without them choosing to.
 */
const ConnectLoginPage = () => {
  const {
    isAuthenticated,
    isMetaAuthenticated,
    isLoading: sessionLoading,
    sessionId,
    user,
    error: sessionError,
    login,
    loginMeta,
    logout,
  } = useSession()
  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated
  const [externalAuthId] = useState(() => readExternalAuthId())
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    if (!externalAuthId || connecting) return
    setConnecting(true)
    setError(null)
    try {
      const response = await fetch(createApiUrl('/api/connect/complete'), {
        method: 'POST',
        headers: createSessionHeaders(sessionId, true),
        body: JSON.stringify({ external_auth_id: externalAuthId }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(typeof body?.detail === 'string' ? body.detail : FAILED)
        setConnecting(false)
        return
      }
      const target = typeof body?.redirect_uri === 'string' ? body.redirect_uri : ''
      if (!target.startsWith('https://')) {
        setError(FAILED)
        setConnecting(false)
        return
      }
      // The id is single-use: gone from this tab before the browser leaves.
      clearExternalAuthId()
      window.location.assign(target)
    } catch {
      setError(FAILED)
      setConnecting(false)
    }
  }

  if (!externalAuthId) {
    return (
      <Card>
        <h1 className="title-h6 text-primary mb-2">Connect Claude to Mia</h1>
        <p className="paragraph-sm text-tertiary">{EXPIRED}</p>
      </Card>
    )
  }

  if (sessionLoading) {
    return (
      <Card>
        <div className="flex justify-center mb-4">
          <Spinner size="lg" />
        </div>
        <p className="paragraph-sm text-tertiary">Checking your Mia sign-in...</p>
      </Card>
    )
  }

  if (!isAnyAuthenticated) {
    return (
      <Card>
        <h1 className="title-h6 text-primary mb-2">Connect Claude to Mia</h1>
        <p className="paragraph-sm text-tertiary mb-6">Sign in to Mia first.</p>
        {/* A failed or cancelled sign-in used to leave this page looking untouched. */}
        {sessionError && (
          <div className="bg-error-primary border border-error-subtle rounded-xl p-4 mb-6">
            <p className="paragraph-sm text-error">{SIGN_IN_FAILED}</p>
          </div>
        )}
        <button
          onClick={() => login()}
          className="w-full px-6 py-3 bg-brand-solid text-primary-onbrand rounded-xl subheading-bg hover:bg-brand-solid-hover transition-colors mb-3"
        >
          Continue with Google
        </button>
        <button
          onClick={() => void loginMeta()}
          className="w-full px-6 py-3 border border-primary text-secondary rounded-xl subheading-bg hover:bg-secondary transition-colors"
        >
          Continue with Facebook
        </button>
      </Card>
    )
  }

  return (
    <Card>
      <h1 className="title-h6 text-primary mb-2">Connect Claude to Mia</h1>
      <p className="paragraph-sm text-tertiary mb-2">
        Claude will be able to read the workspaces you can see in Mia.
      </p>
      {/* The page can't tell who started the connection, so the person is told to check. */}
      <p className="paragraph-sm text-tertiary mb-6">
        Only continue if you just started this from Claude yourself.
      </p>

      <div className="border border-secondary rounded-xl p-4 mb-6 text-left">
        <p className="paragraph-sm text-quaternary mb-2">Connecting as</p>
        <div className="flex items-center gap-3">
          <UserAvatar
            name={user?.name || ''}
            imageUrl={user?.picture_url}
            size="md"
            fallbackClassName="bg-quaternary text-tertiary"
          />
          <div>
            <p className="subheading-bg text-primary">{user?.name}</p>
            <p className="paragraph-sm text-quaternary">{user?.email}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-error-primary border border-error-subtle rounded-xl p-4 mb-6">
          <p className="paragraph-sm text-error">{error}</p>
        </div>
      )}

      <button
        onClick={() => void handleConnect()}
        disabled={connecting}
        className="w-full px-6 py-3 bg-brand-solid text-primary-onbrand rounded-xl subheading-bg hover:bg-brand-solid-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
      >
        {connecting ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size="sm" variant="light" />
            Connecting...
          </span>
        ) : (
          'Connect Claude'
        )}
      </button>
      <button
        onClick={() => void logout()}
        disabled={connecting}
        className="paragraph-sm text-quaternary hover:text-secondary"
      >
        Not you? Sign out
      </button>
    </Card>
  )
}

export default ConnectLoginPage
