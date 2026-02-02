import { useSession } from '../contexts/session-context'
import { UserAvatar } from './user-avatar'
import { WorkspaceRoleIcon } from '../features/workspace/components/workspace-role-icon'
import { getWorkspaceRoleDescription } from '../features/workspace/utils/role'
import { useInviteLanding } from '../features/workspace/hooks/use-invite-landing'

interface InviteLandingPageProps {
  inviteId: string
  onAccepted: (tenantId: string, skipAccountSelection?: boolean) => void
  onBack: () => void
}

const InviteLandingPage = ({ inviteId, onAccepted, onBack }: InviteLandingPageProps) => {
  const { isAuthenticated, isMetaAuthenticated, sessionId, user } = useSession()
  const isAnyAuthenticated = isAuthenticated || isMetaAuthenticated

  const {
    inviteDetails,
    loading,
    error,
    accepting,
    showLoginPrompt,
    dismissLoginPrompt,
    handleSignIn,
    handleAccept,
  } = useInviteLanding({
    inviteId,
    sessionId,
    isAuthenticated: isAnyAuthenticated,
    onAccepted,
    onSignIn: onBack,
  })

  if (loading) {
    return (
      <div className="min-h-screen-dvh bg-linear-to-br from-utility-gray-100 to-utility-gray-200 flex items-center justify-center p-4">
        <div className="bg-primary rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="paragraph-sm text-tertiary">Loading invite...</p>
        </div>
      </div>
    )
  }

  if (error && !inviteDetails?.is_valid) {
    return (
      <div className="min-h-screen-dvh bg-linear-to-br from-utility-gray-100 to-utility-gray-200 flex items-center justify-center p-4">
        <div className="bg-primary rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-error-secondary flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="title-h6 text-primary mb-2">Invalid Invite</h1>
          <p className="paragraph-sm text-tertiary mb-6">{error}</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-brand-solid text-primary-onbrand rounded-xl subheading-bg hover:bg-brand-solid-hover transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  if (showLoginPrompt) {
    return (
      <div className="min-h-screen-dvh bg-linear-to-br from-utility-gray-100 to-utility-gray-200 flex items-center justify-center p-4">
        <div className="bg-primary rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-utility-info-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-utility-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="title-h6 text-primary mb-2">Sign In Required</h1>
          <p className="paragraph-sm text-tertiary mb-6">
            Please sign in to accept this invite and join <span className="font-semibold">{inviteDetails?.tenant_name}</span>.
          </p>
          <button
            onClick={handleSignIn}
            className="w-full px-6 py-3 bg-brand-solid text-primary-onbrand rounded-xl subheading-bg hover:bg-brand-solid-hover transition-colors mb-3"
          >
            Sign In
          </button>
          <button
            onClick={dismissLoginPrompt}
            className="paragraph-sm text-quaternary hover:text-secondary"
          >
            Back to invite
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen-dvh bg-linear-to-br from-utility-gray-100 to-utility-gray-200 flex items-center justify-center p-4">
      <div className="bg-primary rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-utility-info-500 to-utility-purple-600 flex items-center justify-center label-lg text-primary-onbrand mx-auto mb-4">
            {inviteDetails?.tenant_name?.charAt(0).toUpperCase()}
          </div>
          <h1 className="title-h5 text-primary mb-1">
            Join {inviteDetails?.tenant_name}
          </h1>
          <p className="paragraph-sm text-quaternary">
            You've been invited to collaborate
          </p>
        </div>

        {/* Role info */}
        <div className="bg-secondary rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            <WorkspaceRoleIcon role={inviteDetails?.role || ''} variant="badge" size="lg" />
            <div>
              <p className="label-md text-primary capitalize">
                {inviteDetails?.role} Role
              </p>
              <p className="paragraph-sm text-tertiary">
                {getWorkspaceRoleDescription(inviteDetails?.role || '')}
              </p>
            </div>
          </div>
        </div>

        {/* User info (if logged in) */}
        {isAnyAuthenticated && user && (
          <div className="border border-secondary rounded-xl p-4 mb-6">
            <p className="paragraph-sm text-quaternary mb-2">Joining as</p>
            <div className="flex items-center gap-3">
              <UserAvatar
                name={user.name}
                imageUrl={user.picture_url}
                size="md"
                fallbackClassName="bg-quaternary text-tertiary"
              />
              <div>
                <p className="subheading-bg text-primary">{user.name}</p>
                <p className="paragraph-sm text-quaternary">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-error-primary border border-error-subtle rounded-xl p-4 mb-6">
            <p className="paragraph-sm text-error">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full px-6 py-3 bg-brand-solid text-primary-onbrand rounded-xl subheading-bg hover:bg-brand-solid-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Accepting...
              </span>
            ) : isAnyAuthenticated ? (
              'Accept Invite'
            ) : (
              'Sign In to Accept'
            )}
          </button>

          <button
            onClick={onBack}
            className="w-full px-6 py-3 border border-primary text-secondary rounded-xl subheading-bg hover:bg-secondary transition-colors"
          >
            Decline
          </button>
        </div>

        {/* Invite type badge */}
        {inviteDetails?.is_link_invite && (
          <p className="text-center paragraph-xs text-placeholder-subtle mt-4">
            This is a public invite link
          </p>
        )}
      </div>
    </div>
  )
}

export default InviteLandingPage
