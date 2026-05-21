import { useRef, useState, useEffect } from 'react'
import { Icon } from '../../../components/icon'
import { Spinner } from '../../../components/spinner'
import { TopBar } from '../../../components/top-bar'
import { useSession } from '../../../contexts/session-context'
import { CampaignGuidesPage } from '../../campaign-guides/views/campaign-guides-page'
import { MarketingContextPage } from '../../marketing-context/views/marketing-context-page'
import { uploadWorkspaceLogo, deleteWorkspaceLogo } from '../services/workspace-service'
import {
  fetchWorkspaceAlertSettings,
  updateWorkspaceAlertsEnabled,
  updateMySubscription,
  sendTestAlert,
} from '../../whatsapp-alerts/whatsapp-alert-service'
import type { WorkspaceAlertSettings } from '../../whatsapp-alerts/types'
import { CreateInviteModal } from './create-invite-modal'
import { DeleteWorkspaceModal } from './delete-workspace-modal'
import { RenameWorkspaceModal } from './rename-workspace-modal'
import { WorkspaceMembersPanel } from './workspace-members-panel'
import type { WorkspacePersonRow } from '../utils/workspace-settings'
import type { Workspace } from '../types'

type SettingsTab = 'members' | 'brand' | 'campaigns' | 'whatsapp'

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

  // WhatsApp alerts tab state
  const [alertSettings, setAlertSettings] = useState<WorkspaceAlertSettings | null>(null)
  const [alertSettingsLoading, setAlertSettingsLoading] = useState(false)
  const [alertSettingsError, setAlertSettingsError] = useState<string | null>(null)
  const [myWaNumber, setMyWaNumber] = useState('')
  const [mySubscribed, setMySubscribed] = useState(false)
  const [savingSubscription, setSavingSubscription] = useState(false)
  const [subscriptionSaved, setSubscriptionSaved] = useState(false)
  const [togglingWorkspace, setTogglingWorkspace] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testSentTo, setTestSentTo] = useState<string | null>(null)
  const [removingSubscription, setRemovingSubscription] = useState(false)
  const [saveToAll, setSaveToAll] = useState(false)

  const loadAlertSettings = (showSpinner = false) => {
    if (!sessionId) return
    if (showSpinner) setAlertSettingsLoading(true)
    setAlertSettingsError(null)
    fetchWorkspaceAlertSettings(sessionId, workspace.tenant_id)
      .then((s) => {
        setAlertSettings(s)
        const me = s.members.find((m) => m.is_current_user)
        if (me) {
          setMyWaNumber(me.whatsapp_number || '')
          setMySubscribed(me.whatsapp_alerts_subscribed)
        }
      })
      .catch(() => setAlertSettingsError('Failed to load alert settings.'))
      .finally(() => { if (showSpinner) setAlertSettingsLoading(false) })
  }

  useEffect(() => {
    if (activeTab !== 'whatsapp') return
    loadAlertSettings(true)
  }, [activeTab, sessionId, workspace.tenant_id])

  const handleToggleWorkspaceAlerts = async (enabled: boolean) => {
    if (!sessionId || togglingWorkspace) return
    setTogglingWorkspace(true)
    try {
      await updateWorkspaceAlertsEnabled(sessionId, workspace.tenant_id, enabled)
      setAlertSettings((prev) => prev ? { ...prev, whatsapp_alerts_enabled: enabled } : prev)
    } catch {
      setAlertSettingsError('Failed to update workspace setting.')
    } finally {
      setTogglingWorkspace(false)
    }
  }

  const handleSaveSubscription = async () => {
    if (!sessionId || savingSubscription) return
    setSavingSubscription(true)
    setSubscriptionSaved(false)
    try {
      await updateMySubscription(sessionId, {
        whatsapp_number: myWaNumber || undefined,
        subscribed: mySubscribed,
        all_workspaces: saveToAll,
      })
      setSubscriptionSaved(true)
      setTimeout(() => setSubscriptionSaved(false), 3000)
      loadAlertSettings()
    } catch {
      setAlertSettingsError('Failed to save subscription.')
    } finally {
      setSavingSubscription(false)
    }
  }

  const handleRemoveSubscription = async () => {
    if (!sessionId || removingSubscription) return
    setRemovingSubscription(true)
    try {
      await updateMySubscription(sessionId, { whatsapp_number: undefined, subscribed: false })
      setMyWaNumber('')
      setMySubscribed(false)
      loadAlertSettings()
    } catch {
      setAlertSettingsError('Failed to remove subscription.')
    } finally {
      setRemovingSubscription(false)
    }
  }

  const handleSendTest = async () => {
    if (!sessionId || sendingTest) return
    setSendingTest(true)
    setTestSentTo(null)
    try {
      const res = await sendTestAlert(sessionId)
      setTestSentTo(res.sent_to)
      setTimeout(() => setTestSentTo(null), 6000)
    } catch (e) {
      setAlertSettingsError(e instanceof Error ? e.message : 'Failed to send test message.')
    } finally {
      setSendingTest(false)
    }
  }

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
      <div className="flex border-b border-tertiary px-4 overflow-x-auto">
        {(['members', 'brand', 'campaigns', 'whatsapp'] as SettingsTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-3 paragraph-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'border-brand-solid text-brand-solid'
                : 'border-transparent text-secondary hover:text-primary',
            ].join(' ')}
          >
            {tab === 'members'
              ? 'Members'
              : tab === 'brand'
              ? 'Brand Guide'
              : tab === 'campaigns'
              ? 'Campaign Guides'
              : 'WhatsApp Alerts'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 max-w-3xl mx-auto w-full">

        {/* WhatsApp Alerts tab */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            {alertSettingsError && (
              <div className="p-3 bg-error-primary border border-error-subtle rounded-lg">
                <p className="paragraph-sm text-error">{alertSettingsError}</p>
              </div>
            )}

            {alertSettingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="md" variant="dark" />
              </div>
            ) : alertSettings ? (
              <>
                {/* Workspace-level toggle (owner/admin only) */}
                {canManage && (
                  <div className="p-4 bg-secondary rounded-xl border border-tertiary">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="subheading-md text-primary">Enable alerts for this workspace</p>
                        <p className="paragraph-sm text-tertiary mt-0.5">
                          When enabled, opted-in members receive WhatsApp messages when campaign
                          KPIs fall behind target for 3+ days.
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleToggleWorkspaceAlerts(!alertSettings.whatsapp_alerts_enabled)
                        }
                        disabled={togglingWorkspace}
                        className={[
                          'relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50',
                          alertSettings.whatsapp_alerts_enabled
                            ? 'bg-brand-solid'
                            : 'bg-quaternary',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                            alertSettings.whatsapp_alerts_enabled ? 'translate-x-5' : '',
                          ].join(' ')}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* My subscription */}
                <div className="p-4 bg-secondary rounded-xl border border-tertiary space-y-4">
                  <div>
                    <p className="subheading-md text-primary">My WhatsApp Alerts</p>
                    <p className="paragraph-sm text-tertiary mt-0.5">
                      Add your number to receive campaign alerts on WhatsApp.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="paragraph-sm text-secondary block mb-1.5">
                        WhatsApp number (with country code)
                      </label>
                      <input
                        type="tel"
                        value={myWaNumber}
                        onChange={(e) => setMyWaNumber(e.target.value)}
                        placeholder="+27 82 123 4567"
                        className="w-full px-3 py-2.5 bg-primary border border-primary rounded-lg paragraph-sm text-primary placeholder:text-quaternary focus:outline-none focus:border-brand-solid"
                      />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mySubscribed}
                        onChange={(e) => setMySubscribed(e.target.checked)}
                        className="w-4 h-4 rounded accent-brand-solid"
                      />
                      <span className="paragraph-sm text-primary">Receive KPI alert messages</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveToAll}
                        onChange={(e) => setSaveToAll(e.target.checked)}
                        className="w-4 h-4 rounded accent-brand-solid"
                      />
                      <span className="paragraph-sm text-secondary">Save to all my workspaces</span>
                    </label>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleSaveSubscription}
                        disabled={savingSubscription}
                        className="px-4 py-2 bg-brand-solid text-primary-onbrand rounded-lg subheading-md hover:bg-brand-solid-hover transition-colors disabled:opacity-50"
                      >
                        {savingSubscription ? 'Saving…' : subscriptionSaved ? 'Saved!' : 'Save'}
                      </button>
                      {(myWaNumber || mySubscribed) && (
                        <button
                          onClick={handleRemoveSubscription}
                          disabled={removingSubscription}
                          className="px-4 py-2 border border-error-subtle text-error rounded-lg subheading-md hover:bg-error-primary transition-colors disabled:opacity-50"
                        >
                          {removingSubscription ? 'Removing…' : 'Remove'}
                        </button>
                      )}
                      {mySubscribed && myWaNumber && (
                        <button
                          onClick={handleSendTest}
                          disabled={sendingTest}
                          className="px-4 py-2 border border-primary text-secondary rounded-lg subheading-md hover:bg-tertiary transition-colors disabled:opacity-50"
                        >
                          {sendingTest ? 'Sending…' : testSentTo ? `Sent to ${testSentTo}` : 'Send test message'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Member overview (admin/owner only) */}
                {canManage && alertSettings.members.length > 0 && (
                  <div>
                    <p className="subheading-md text-primary mb-3">Member Subscriptions</p>
                    <div className="space-y-2">
                      {alertSettings.members.map((m) => (
                        <div
                          key={m.user_id}
                          className="flex items-center justify-between px-4 py-3 bg-secondary rounded-lg border border-tertiary"
                        >
                          <div>
                            <p className="paragraph-sm text-primary">
                              {m.is_current_user ? 'You' : (m.name || m.email || m.user_id)}
                              <span className="ml-2 text-quaternary">({m.role})</span>
                            </p>
                            {m.whatsapp_number && (
                              <p className="paragraph-sm text-tertiary">{m.whatsapp_number}</p>
                            )}
                          </div>
                          <span
                            className={[
                              'px-2 py-0.5 rounded-full paragraph-sm',
                              m.whatsapp_alerts_subscribed
                                ? 'bg-success-subtle text-success'
                                : 'bg-tertiary text-quaternary',
                            ].join(' ')}
                          >
                            {m.whatsapp_alerts_subscribed ? 'Opted in' : 'Not subscribed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Brand Guide tab */}
        {activeTab === 'brand' && (
          <MarketingContextPage sessionId={sessionId} tenantId={workspace.tenant_id} />
        )}

        {/* Campaign Guides tab */}
        {activeTab === 'campaigns' && (
          <CampaignGuidesPage sessionId={sessionId} tenantId={workspace.tenant_id} />
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
                      <img src={logoUrl} alt="Workspace logo" className="w-full h-full object-contain p-1.5" />
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
