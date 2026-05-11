import { useRef, useState } from 'react'
import { Icon } from '../../../components/icon'
import { Spinner } from '../../../components/spinner'
import { TopBar } from '../../../components/top-bar'
import { useSession } from '../../../contexts/session-context'
import { MarketingContextPage } from '../../marketing-context/views/marketing-context-page'
import { uploadWorkspaceLogo, deleteWorkspaceLogo } from '../services/workspace-service'
import { CreateInviteModal } from './create-invite-modal'
import { DeleteWorkspaceModal } from './delete-workspace-modal'
import { RenameWorkspaceModal } from './rename-workspace-modal'
import { WorkspaceMembersPanel } from './workspace-members-panel'
import type { WorkspacePersonRow } from '../utils/workspace-settings'
import type { Workspace } from '../types'

type SettingsTab = 'members' | 'brand'

interface WorkspaceSettingsDetailProps {
  canManage: boolean
  isOwner: boolean
  workspace: Workspace
  error: string | null
  loading: boolean
  people: WorkspacePersonRow[]
  onBack: () => void
  showCreateInviteModal: boolean
  createdInviteLink: string | null
  createdInviteEmail: string | null
  inviteRole: string
  inviteEmail: string
  isLinkInvite: boolean
  creatingInvite: boolean
  copySuccess: boolean
  isCreateInviteDisabled: boolean
  onOpenCreateInviteModal: () => void
  onCloseCreateInviteModal: () => void
  onInviteTypeChange: (isLinkInvite: boolean) => void
  onInviteEmailChange: (value: string) => void
  onInviteRoleChange: (role: string) => void
  onCreateInvite: () => void
  onCopyInvite: (inviteLink: string) => void
  onCompleteInviteFlow: () => void
  onRevokeInvite: (inviteId: string) => void
  onUpdateRole: (userId: string, role: string) => void
  onRemoveMember: (userId: string) => void
  showRenameModal: boolean
  onOpenRenameModal: () => void
  onCloseRenameModal: () => void
  onRenameWorkspace: (newName: string) => Promise<boolean>
  renaming: boolean
  showDeleteModal: boolean
  onOpenDeleteModal: () => void
  onCloseDeleteModal: () => void
  onDeleteWorkspace: () => Promise<boolean>
  onLeaveWorkspace?: () => Promise<boolean>
}

export const WorkspaceSettingsDetail = ({
  canManage,
  isOwner,
  workspace,
  error,
  loading,
  people,
  onBack,
  showCreateInviteModal,
  createdInviteLink,
  createdInviteEmail,
  inviteRole,
  inviteEmail,
  isLinkInvite,
  creatingInvite,
  copySuccess,
  isCreateInviteDisabled,
  onOpenCreateInviteModal,
  onCloseCreateInviteModal,
  onInviteTypeChange,
  onInviteEmailChange,
  onInviteRoleChange,
  onCreateInvite,
  onCopyInvite,
  onCompleteInviteFlow,
  onRevokeInvite,
  onUpdateRole,
  onRemoveMember,
  showRenameModal,
  onOpenRenameModal,
  onCloseRenameModal,
  onRenameWorkspace,
  renaming,
  showDeleteModal,
  onOpenDeleteModal,
  onCloseDeleteModal,
  onDeleteWorkspace,
  onLeaveWorkspace,
}: WorkspaceSettingsDetailProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('members')
  const { sessionId, refreshWorkspaces } = useSession()
  const [logoUrl, setLogoUrl] = useState<string | null>(workspace.logo_url ?? null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (file: File) => {
    if (!sessionId) return
    setUploadingLogo(true)
    setLogoError(null)
    try {
      const url = await uploadWorkspaceLogo(sessionId, workspace.tenant_id, file)
      setLogoUrl(url)
      await refreshWorkspaces()
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoRemove = async () => {
    if (!sessionId) return
    setUploadingLogo(true)
    setLogoError(null)
    try {
      await deleteWorkspaceLogo(sessionId, workspace.tenant_id)
      setLogoUrl(null)
      await refreshWorkspaces()
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : 'Remove failed')
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
      <TopBar title="Workspace Settings" onBack={onBack} className="border-b border-tertiary" />

      {/* Tab strip */}
      <div className="flex border-b border-tertiary px-4">
        {(['members', 'brand'] as SettingsTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-3 paragraph-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-brand-solid text-brand-solid'
                : 'border-transparent text-secondary hover:text-primary',
            ].join(' ')}
          >
            {tab === 'members' ? 'Members' : 'Brand Guide'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 max-w-3xl mx-auto w-full">

        {/* Brand Profile tab */}
        {activeTab === 'brand' && (
          <MarketingContextPage sessionId={sessionId} tenantId={workspace.tenant_id} />
        )}

        {/* Members tab */}
        {activeTab === 'members' && (
          <>
        {error && (
          <div className="mb-4 p-3 bg-error-primary border border-error-subtle rounded-lg">
            <p className="paragraph-sm text-error">{error}</p>
          </div>
        )}

        {canManage && (
          <button
            onClick={onOpenCreateInviteModal}
            className="w-full py-3 px-4 bg-brand-solid text-primary-onbrand rounded-xl subheading-md flex items-center justify-center gap-2 hover:bg-brand-solid-hover transition-colors mb-4"
          >
            <Icon.plus size={20} />
            Invite Member
          </button>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" variant="dark" />
          </div>
        ) : (
          <WorkspaceMembersPanel
            people={people}
            onUpdateRole={onUpdateRole}
            onRemoveMember={onRemoveMember}
            onCopyInvite={onCopyInvite}
            onRevokeInvite={onRevokeInvite}
          />
        )}

        {/* Workspace Settings - Owner Only */}
        {isOwner && (
          <div className="mt-8 pt-6 border-t border-tertiary">
            <h3 className="subheading-md text-primary mb-2">Workspace</h3>

            {/* Rename */}
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg mb-3">
              <div>
                <p className="subheading-md text-primary">{workspace.name}</p>
                <p className="paragraph-sm text-quaternary">Workspace name</p>
              </div>
              <button
                onClick={onOpenRenameModal}
                className="px-3 py-1.5 border border-primary rounded-lg paragraph-sm text-secondary hover:bg-tertiary transition-colors"
              >
                Rename
              </button>
            </div>

            {/* Logo */}
            <div className="p-3 bg-secondary rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-tertiary flex items-center justify-center shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Workspace logo" className="w-full h-full object-contain" />
                    ) : (
                      <Icon.image_01 size={20} className="text-quaternary" />
                    )}
                  </div>
                  <div>
                    <p className="subheading-md text-primary">Logo</p>
                    <p className="paragraph-sm text-quaternary">SVG or PNG, max 500 KB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {logoUrl && (
                    <button
                      onClick={handleLogoRemove}
                      disabled={uploadingLogo}
                      className="px-3 py-1.5 border border-primary rounded-lg paragraph-sm text-error hover:bg-error-primary transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="px-3 py-1.5 border border-primary rounded-lg paragraph-sm text-secondary hover:bg-tertiary transition-colors disabled:opacity-50"
                  >
                    {uploadingLogo ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload'}
                  </button>
                </div>
              </div>
              {logoError && (
                <p className="paragraph-sm text-error mt-2">{logoError}</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/svg+xml,image/png,image/webp,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleLogoUpload(file)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        )}

        {/* Danger Zone - Owner Only */}
        {isOwner && (
          <div className="mt-8 pt-6 border-t border-tertiary">
            <h3 className="subheading-md text-error mb-2">Danger Zone</h3>
            <p className="paragraph-sm text-tertiary mb-4">
              Permanently delete this workspace and all its data.
            </p>
            <button
              onClick={onOpenDeleteModal}
              className="px-4 py-2 border border-error text-error hover:bg-error hover:text-white rounded-lg subheading-md transition-colors"
            >
              Delete Workspace
            </button>
          </div>
        )}

        {/* Leave Workspace - Non-Owners Only (Feb 2026) */}
        {!isOwner && onLeaveWorkspace && (
          <div className="mt-8 pt-6 border-t border-tertiary">
            <h3 className="subheading-md text-error mb-2">Leave Workspace</h3>
            <p className="paragraph-sm text-tertiary mb-4">
              Remove yourself from this workspace. You'll lose access to all workspace data.
            </p>
            <button
              onClick={onLeaveWorkspace}
              className="px-4 py-2 border border-error text-error hover:bg-error hover:text-white rounded-lg subheading-md transition-colors"
            >
              Leave Workspace
            </button>
          </div>
        )}
          </>
        )}
      </div>

      <CreateInviteModal
        isOpen={showCreateInviteModal}
        onClose={onCloseCreateInviteModal}
        inviteRole={inviteRole}
        inviteEmail={inviteEmail}
        isLinkInvite={isLinkInvite}
        creatingInvite={creatingInvite}
        createdInviteLink={createdInviteLink}
        createdInviteEmail={createdInviteEmail}
        copySuccess={copySuccess}
        isCreateInviteDisabled={isCreateInviteDisabled}
        onInviteTypeChange={onInviteTypeChange}
        onInviteEmailChange={onInviteEmailChange}
        onInviteRoleChange={onInviteRoleChange}
        onCreateInvite={onCreateInvite}
        onCopyInvite={onCopyInvite}
        onComplete={onCompleteInviteFlow}
      />

      <RenameWorkspaceModal
        isOpen={showRenameModal}
        onClose={onCloseRenameModal}
        currentName={workspace.name}
        onConfirm={onRenameWorkspace}
        renaming={renaming}
      />

      <DeleteWorkspaceModal
        isOpen={showDeleteModal}
        onClose={onCloseDeleteModal}
        workspace={workspace}
        onConfirm={onDeleteWorkspace}
      />
    </div>
  )
}
