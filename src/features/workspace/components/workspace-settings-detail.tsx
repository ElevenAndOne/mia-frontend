import { Suspense, lazy, useRef, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Image01 } from '../../../components/icon/image-01'
import { Plus } from '../../../components/icon/plus'
import { Spinner } from '../../../components/spinner'
import { TopBar } from '../../../components/top-bar'
import { useSession } from '../../../contexts/session-context'
import { useToast } from '../../../contexts/toast-context'
// Each tab is its own chunk, fetched the first time it is opened. The Workspace tab (the one
// Settings opens on) therefore renders without waiting for the brand guide editor, brand kit,
// campaign guides, notes, skill learning or Mia style code.
const CampaignGuidesPage = lazy(() =>
  import('../../campaign-guides/views/campaign-guides-page').then((m) => ({
    default: m.CampaignGuidesPage,
  }))
)
const MarketingContextPage = lazy(() =>
  import('../../marketing-context/views/marketing-context-page').then((m) => ({
    default: m.MarketingContextPage,
  }))
)
const BrandKitTab = lazy(() => import('./brand-kit-tab').then((m) => ({ default: m.BrandKitTab })))
const SkillLearningPage = lazy(() =>
  import('./skill-learning-page').then((m) => ({ default: m.SkillLearningPage }))
)
const NotesPanel = lazy(() =>
  import('../../notes/components/notes-panel').then((m) => ({ default: m.NotesPanel }))
)
const MiaStyleTab = lazy(() => import('./mia-style-tab').then((m) => ({ default: m.MiaStyleTab })))

const TabFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Spinner size="md" variant="dark" />
  </div>
)
import {
  uploadWorkspaceLogo,
  deleteWorkspaceLogo,
  fetchWorkspaceDetails,
  updateWorkspaceWebsiteUrl,
  updateWorkspaceFramework,
  updateWorkspaceExperience,
} from '../services/workspace-service'
import {
  fetchWorkspaceAlertSettings,
  updateWorkspaceAlertsEnabled,
  updateMySubscription,
  sendTestAlert,
} from '../../whatsapp-alerts/whatsapp-alert-service'
import type { WorkspaceAlertSettings } from '../../whatsapp-alerts/types'
import { normalizeWhatsAppNumber } from '../../whatsapp-alerts/normalize-number'
import { CreateInviteModal } from './create-invite-modal'
import { DeleteWorkspaceModal } from './delete-workspace-modal'
import { RenameWorkspaceModal } from './rename-workspace-modal'
import { WorkspaceMembersPanel } from './workspace-members-panel'
import { FeatureFlagsPanel } from './feature-flags-panel'
import { WebsiteReadCard } from './website-read-card'
import { CollapsibleSection } from '../../../components/collapsible-section'
import { BasicWorkspaceSettings } from './basic-workspace-settings'
import { WhatsAppNumberCard } from './whatsapp-number-card'
import { BrandFactsSection } from './brand-facts-section'
import {
  SegmentedControl,
  type SegmentedControlOption,
} from '../../../components/segmented-control'
import { useTheme } from '../../../contexts/theme-context'
import { Monitor01 } from '../../../components/icon/monitor-01'
import { Sun } from '../../../components/icon/sun'
import { Moon01 } from '../../../components/icon/moon-01'
import type { WorkspacePersonRow } from '../utils/workspace-settings'
import type { Workspace } from '../types'
import { useExperience } from '../hooks/use-experience'
import { EXPERIENCES, EXPERIENCE_COPY, EXPERIENCE_LABEL, type Experience } from '../feature-keys'

type SettingsTab =
  | 'members'
  | 'brand'
  | 'brandkit'
  | 'campaigns'
  | 'notes'
  | 'whatsapp'
  | 'skills'
  | 'mia'

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
  onTransferOwnership: (userId: string) => void
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
  onTransferOwnership,
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
  // Non-managers (analyst/viewer) get a read-only view limited to the guide tabs.
  // Basic keeps Settings short: Workspace · Brand Guide · Brand Kit · WhatsApp · Mia.
  const navigate = useNavigate()
  const { isBasic } = useExperience()
  const { theme, setTheme } = useTheme()
  const themeOptions: Array<SegmentedControlOption<typeof theme>> = [
    { value: 'system', label: 'Auto', icon: <Monitor01 size={16} /> },
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon01 size={16} /> },
  ]
  const visibleTabs: SettingsTab[] = canManage
    ? isBasic
      ? ['brand', 'members']
      : ['members', 'brand', 'brandkit', 'campaigns', 'notes', 'skills', 'whatsapp', 'mia']
    : isBasic
      ? ['brand']
      : ['brand', 'brandkit', 'campaigns', 'notes', 'mia']
  // The tab lives in the URL (?tab=brand) so a refresh or a shared link lands on the same tab,
  // and the breadcrumb can name it.
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = ((): SettingsTab => {
    const t = searchParams.get('tab') as SettingsTab | null
    const ok: SettingsTab[] = [
      'members',
      'brand',
      'brandkit',
      'campaigns',
      'notes',
      'whatsapp',
      'skills',
      'mia',
    ]
    const wanted = t && ok.includes(t) ? t : null
    // Basic has no Mia tab any more; an old ?tab=mia link lands on Workspace, where her
    // style now lives, rather than on a tab that renders nothing.
    if (wanted === 'mia' && isBasic) return canManage ? 'members' : 'brand'
    return wanted ?? (canManage ? 'members' : 'brand')
  })()
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  // Tabs stay mounted once visited (hidden, not unmounted): each one used to refetch and
  // show a spinner on every switch. Members and Notes only looked instant because their
  // data was cached elsewhere.
  const [visited, setVisited] = useState<Set<SettingsTab>>(() => new Set<SettingsTab>([initialTab]))

  // The tab was only ever read from the URL on first mount, so tapping "My brand" in the
  // workspace menu while already on Settings changed the address bar and nothing else.
  // The URL is the source of truth; follow it whenever it moves.
  useEffect(() => {
    if (initialTab !== activeTab) {
      setActiveTab(initialTab)
      setVisited((v) => (v.has(initialTab) ? v : new Set(v).add(initialTab)))
    }
    // initialTab is derived from searchParams, so this runs on every URL change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab])
  const tabLabel = (tab: SettingsTab): string => {
    if (tab === 'members') return isBasic ? 'Workspace' : 'Members'
    if (tab === 'brand') return isBasic ? 'Brand' : 'Brand Guide'
    if (tab === 'brandkit') return 'Brand Kit'
    if (tab === 'campaigns') return 'Campaign Guides'
    if (tab === 'notes') return 'Rules'
    if (tab === 'skills') return 'Skill Learning'
    if (tab === 'whatsapp') return 'WhatsApp Alerts'
    return 'Mia'
  }
  const selectTab = (tab: SettingsTab) => {
    setActiveTab(tab)
    setSearchParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.set('tab', tab)
        return next
      },
      { replace: true }
    )
    setVisited((v) => (v.has(tab) ? v : new Set(v).add(tab)))
  }
  const { sessionId, refreshWorkspaces } = useSession()
  const { showToast } = useToast()
  const [logoUrl, setLogoUrl] = useState<string | null>(workspace.logo_url ?? null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Website URL (GSC property)
  const [websiteUrl, setWebsiteUrl] = useState<string>('')
  const [websiteUrlInput, setWebsiteUrlInput] = useState<string>('')
  const [editingWebsite, setEditingWebsite] = useState(false)
  const [savingWebsite, setSavingWebsite] = useState(false)
  const [websiteError, setWebsiteError] = useState<string | null>(null)

  // Campaign-builder framework: 'race' (Reach/Act/Convert/Engage) | 'generic'
  // (Awareness/Consideration/Conversion/Retention)
  const [framework, setFramework] = useState<'race' | 'generic'>('race')
  const [savingFramework, setSavingFramework] = useState(false)

  // Experience profile (Sep 2026): the preset of feature-flag defaults for this workspace.
  const [experience, setExperience] = useState<Experience>('team')
  const [savingExperience, setSavingExperience] = useState(false)
  const [featuresVersion, setFeaturesVersion] = useState(0)

  useEffect(() => {
    if (!sessionId || !canManage) return
    fetchWorkspaceDetails(sessionId, workspace.tenant_id)
      .then((d) => {
        setWebsiteUrl(d.website_url || '')
        setWebsiteUrlInput(d.website_url || '')
        setFramework(d.active_framework || 'race')
        setExperience(d.experience_profile || 'team')
      })
      .catch(() => showToast('error', "Couldn't load your workspace settings. Please try again."))
  }, [sessionId, workspace.tenant_id, canManage, showToast])

  const handleChangeFramework = async (next: 'race' | 'generic') => {
    if (!sessionId || savingFramework || next === framework) return
    const prev = framework
    setFramework(next) // optimistic
    setSavingFramework(true)
    try {
      await updateWorkspaceFramework(sessionId, workspace.tenant_id, next)
    } catch {
      setFramework(prev) // revert on failure
    } finally {
      setSavingFramework(false)
    }
  }

  const handleChangeExperience = async (next: Experience) => {
    if (!sessionId || savingExperience || next === experience) return
    const prev = experience
    setExperience(next) // optimistic
    setSavingExperience(true)
    try {
      await updateWorkspaceExperience(sessionId, workspace.tenant_id, next)
      await refreshWorkspaces() // sidebar follows the new defaults
      setFeaturesVersion((v) => v + 1) // Features panel refetches now that the save has landed
    } catch {
      setExperience(prev)
      showToast('error', "Couldn't change the experience. Please try again.")
    } finally {
      setSavingExperience(false)
    }
  }

  const handleSaveWebsite = async () => {
    if (!sessionId || savingWebsite) return
    setSavingWebsite(true)
    setWebsiteError(null)
    try {
      await updateWorkspaceWebsiteUrl(sessionId, workspace.tenant_id, websiteUrlInput.trim())
      setWebsiteUrl(websiteUrlInput.trim())
      setEditingWebsite(false)
    } catch (e) {
      setWebsiteError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSavingWebsite(false)
    }
  }

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
      .finally(() => {
        if (showSpinner) setAlertSettingsLoading(false)
      })
  }

  useEffect(() => {
    // Basic shows WhatsApp under the Mia tab as "Messages".
    const wantsAlerts = activeTab === 'whatsapp' || (activeTab === 'members' && isBasic)
    if (!wantsAlerts || alertSettings) return
    loadAlertSettings(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAlertSettings is not memoised
  }, [activeTab, sessionId, workspace.tenant_id, alertSettings, isBasic])

  const handleToggleWorkspaceAlerts = async (enabled: boolean) => {
    if (!sessionId || togglingWorkspace) return
    setTogglingWorkspace(true)
    try {
      await updateWorkspaceAlertsEnabled(sessionId, workspace.tenant_id, enabled)
      setAlertSettings((prev) => (prev ? { ...prev, whatsapp_alerts_enabled: enabled } : prev))
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
      // Normalize to E.164 (e.g. 0711644526 / +0711644526 -> +27711644526) so Twilio accepts it.
      const normalized = myWaNumber ? normalizeWhatsAppNumber(myWaNumber) : ''
      if (normalized !== myWaNumber) setMyWaNumber(normalized)
      await updateMySubscription(sessionId, {
        whatsapp_number: normalized || undefined,
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
      <TopBar
        title={isBasic ? 'Workspace settings' : 'Workspace Settings'}
        onBack={onBack}
        className="border-b border-tertiary"
        breadcrumbs={[
          { label: 'Home', to: '/home' },
          {
            label: isBasic ? 'Workspace settings' : 'Workspace Settings',
            to: '/settings/workspace',
          },
          { label: tabLabel(activeTab) },
        ]}
      />

      {/* Tab strip */}
      <div className="flex border-b border-tertiary px-4 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => selectTab(tab)}
            className={[
              'px-4 py-3 paragraph-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'border-brand-solid text-brand-solid'
                : 'border-transparent text-secondary hover:text-primary',
            ].join(' ')}
          >
            {tab === 'members'
              ? isBasic
                ? 'Workspace'
                : 'Members'
              : tab === 'brand' && isBasic
                ? 'Brand'
                : tab === 'brand'
                  ? 'Brand Guide'
                  : tab === 'brandkit'
                    ? 'Brand Kit'
                    : tab === 'campaigns'
                      ? 'Campaign Guides'
                      : tab === 'notes'
                        ? 'Rules'
                        : tab === 'skills'
                          ? 'Skill Learning'
                          : tab === 'mia'
                            ? 'Mia'
                            : 'WhatsApp Alerts'}
          </button>
        ))}
      </div>

      <div
        className={`flex-1 overflow-y-auto min-h-0 px-4 py-4 max-w-3xl mx-auto w-full${isBasic ? ' settings-canvas' : ''}`}
      >
        {/* WhatsApp Alerts tab */}
        {visited.has('whatsapp') && (
          <div className={activeTab === 'whatsapp' ? undefined : 'hidden'}>
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
                          <p className="subheading-md text-primary">
                            Enable alerts for this workspace
                          </p>
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
                        <span className="paragraph-sm text-primary">Receive WhatsApp alerts</span>
                      </label>

                      {!isBasic && (
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={saveToAll}
                            onChange={(e) => setSaveToAll(e.target.checked)}
                            className="w-4 h-4 rounded accent-brand-solid"
                          />
                          <span className="paragraph-sm text-secondary">
                            Save to all my workspaces
                          </span>
                        </label>
                      )}

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
                            {sendingTest
                              ? 'Sending…'
                              : testSentTo
                                ? `Sent to ${testSentTo}`
                                : 'Send test message'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Proving the number, for the photo flow. Separate from the alerts
                      controls above on purpose: alerts are outbound and have never needed
                      proof, so confirming is an extra step on a number already saved,
                      never a gate in front of receiving alerts. */}
                  <div className="p-4 bg-secondary rounded-xl border border-tertiary">
                    <WhatsAppNumberCard sessionId={sessionId} mode="confirm" />
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
                                {m.is_current_user ? 'You' : m.name || m.email || m.user_id}
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
          </div>
        )}

        {/* Brand Guide tab */}
        {visited.has('brand') && (
          <div className={activeTab === 'brand' ? undefined : 'hidden'}>
            <Suspense fallback={<TabFallback />}>
              {isBasic ? (
                <div className="space-y-3">
                  <CollapsibleSection
                    title="Colours, fonts & logo"
                    summary="What Mia uses to make your posts look like you"
                    defaultOpen
                  >
                    <BrandKitTab
                      sessionId={sessionId}
                      tenantId={workspace.tenant_id}
                      canManage={canManage}
                    />
                  </CollapsibleSection>
                  <CollapsibleSection
                    title="Facts Mia may quote"
                    summary="Prices, awards, dates and links from your website"
                  >
                    <BrandFactsSection sessionId={sessionId ?? ''} tenantId={workspace.tenant_id} />
                  </CollapsibleSection>
                  <CollapsibleSection
                    title="Your voice & details"
                    summary="How Mia writes for you — read from your website, editable here"
                  >
                    <MarketingContextPage
                      sessionId={sessionId}
                      tenantId={workspace.tenant_id}
                      canManage={canManage}
                    />
                  </CollapsibleSection>
                </div>
              ) : (
                <MarketingContextPage
                  sessionId={sessionId}
                  tenantId={workspace.tenant_id}
                  canManage={canManage}
                />
              )}
            </Suspense>
          </div>
        )}

        {/* Brand Kit tab */}
        {visited.has('brandkit') && (
          <div className={activeTab === 'brandkit' ? undefined : 'hidden'}>
            <Suspense fallback={<TabFallback />}>
              <BrandKitTab
                sessionId={sessionId}
                tenantId={workspace.tenant_id}
                canManage={canManage}
              />
            </Suspense>
          </div>
        )}

        {/* Campaign Guides tab */}
        {visited.has('campaigns') && (
          <div className={activeTab === 'campaigns' ? undefined : 'hidden'}>
            <Suspense fallback={<TabFallback />}>
              <CampaignGuidesPage
                sessionId={sessionId}
                tenantId={workspace.tenant_id}
                canManage={canManage}
              />
            </Suspense>
          </div>
        )}

        {/* Notes — standing decisions & constraints Mia applies in every conversation */}
        {visited.has('notes') && (
          <div className={activeTab === 'notes' ? undefined : 'hidden'}>
            <Suspense fallback={<TabFallback />}>
              <NotesPanel
                sessionId={sessionId}
                tenantId={workspace.tenant_id}
                scope="workspace"
                title="Rules"
                description="Rules that hold for every campaign and post in this workspace — compliance lines, banned words, house style, what we’ve learnt about the audience. Mia reads these on every turn and follows them without being reminded. Campaign-specific rules live on each campaign’s Setup → Rules."
                placeholder="Add a rule for every campaign… e.g. “Every caption ends with the 18+ / enjoy responsibly line.”"
              />
            </Suspense>
          </div>
        )}

        {/* Skill Learning tab */}
        {visited.has('skills') && (
          <div className={activeTab === 'skills' ? undefined : 'hidden'}>
            <Suspense fallback={<TabFallback />}>
              <SkillLearningPage sessionId={sessionId} tenantId={workspace.tenant_id} />
            </Suspense>
          </div>
        )}

        {/* Mia interaction style tab */}
        {visited.has('mia') && (
          <div className={activeTab === 'mia' ? undefined : 'hidden'}>
            <Suspense fallback={<TabFallback />}>
              <MiaStyleTab
                sessionId={sessionId}
                tenantId={workspace.tenant_id}
                canManage={canManage}
              />
            </Suspense>
          </div>
        )}

        {/* Members tab */}
        {visited.has('members') && (
          <div className={activeTab === 'members' ? undefined : 'hidden'}>
            <>
              {error && (
                <div className="mb-4 p-3 bg-error-primary border border-error-subtle rounded-lg">
                  <p className="paragraph-sm text-error">{error}</p>
                </div>
              )}

              {canManage && !isBasic && (
                <button
                  onClick={onOpenCreateInviteModal}
                  className="w-full py-3 px-4 bg-brand-solid text-primary-onbrand rounded-xl subheading-md flex items-center justify-center gap-2 hover:bg-brand-solid-hover transition-colors mb-4"
                >
                  <Plus size={20} />
                  Invite Member
                </button>
              )}

              {!isBasic &&
                (loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner size="md" variant="dark" />
                  </div>
                ) : (
                  <WorkspaceMembersPanel
                    people={people}
                    onUpdateRole={onUpdateRole}
                    onTransferOwnership={onTransferOwnership}
                    onRemoveMember={onRemoveMember}
                    onCopyInvite={onCopyInvite}
                    onRevokeInvite={onRevokeInvite}
                  />
                ))}

              {/* Workspace Settings - Owner and Admin */}
              {canManage && (
                <div className={isBasic ? '' : 'mt-8 pt-6 border-t border-tertiary'}>
                  {!isBasic && <h3 className="subheading-md text-primary mb-2">Workspace</h3>}

                  {isBasic ? (
                    <BasicWorkspaceSettings
                      sessionId={sessionId ?? ''}
                      tenantId={workspace.tenant_id}
                      workspaceName={workspace.name}
                      canManage={canManage}
                      isOwner={isOwner}
                      websiteUrl={websiteUrl}
                      onWebsiteSaved={(url) => {
                        setWebsiteUrl(url)
                        setWebsiteUrlInput(url)
                      }}
                      onOpenBrand={() => selectTab('brand')}
                      connectedPlatforms={workspace.connected_platforms ?? []}
                      onOpenConnections={() => navigate('/integrations?from=settings')}
                      onRename={onOpenRenameModal}
                      logoUrl={logoUrl}
                      uploadingLogo={uploadingLogo}
                      logoError={logoError}
                      onUploadLogo={handleLogoUpload}
                      onRemoveLogo={handleLogoRemove}
                      experience={experience}
                      savingExperience={savingExperience}
                      onChangeExperience={handleChangeExperience}
                      featuresPanel={
                        sessionId ? (
                          <FeatureFlagsPanel
                            sessionId={sessionId}
                            tenantId={workspace.tenant_id}
                            refreshKey={featuresVersion}
                          />
                        ) : null
                      }
                      whatsappMessagesSlot={
                        <div className="border-t border-tertiary pt-2 mt-1">
                                              <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="paragraph-sm text-primary">Messages from Mia</p>
                            <p className="paragraph-xs text-quaternary">
                              {alertSettings?.whatsapp_alerts_enabled
                                ? 'On · Mia messages you when something needs you'
                                : 'Off · Mia can message you when something needs you'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !alertSettings?.whatsapp_alerts_enabled
                              void handleToggleWorkspaceAlerts(next)
                              setMySubscribed(next)
                            }}
                            disabled={togglingWorkspace || !alertSettings}
                            aria-label="Toggle WhatsApp messages"
                            className={`relative shrink-0 w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${
                              alertSettings?.whatsapp_alerts_enabled
                                ? 'bg-utility-success-600'
                                : 'bg-quaternary'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                alertSettings?.whatsapp_alerts_enabled ? 'translate-x-4' : ''
                              }`}
                            />
                          </button>
                        </div>
                        {alertSettingsError && (
                          <p className="paragraph-xs text-error">{alertSettingsError}</p>
                        )}
                        </div>
                      }
                      miaStyleSection={
                        <Suspense fallback={<TabFallback />}>
                          <MiaStyleTab
                            sessionId={sessionId}
                            tenantId={workspace.tenant_id}
                            canManage={canManage}
                          />
                        </Suspense>
                      }
                      onDelete={onOpenDeleteModal}
                    />
                  ) : (
                    <>
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

                      {/* Website: Basic reads the site into the brand kit; Team/Agency just store the URL */}
                      {isBasic ? (
                        <WebsiteReadCard
                          sessionId={sessionId ?? ''}
                          tenantId={workspace.tenant_id}
                          websiteUrl={websiteUrl}
                          canManage={canManage}
                          onOpenBrandKit={() => selectTab('brandkit')}
                          onWebsiteSaved={(url) => {
                            setWebsiteUrl(url)
                            setWebsiteUrlInput(url)
                          }}
                        />
                      ) : (
                        <div className="p-3 bg-secondary rounded-lg mb-3">
                          {editingWebsite ? (
                            <div>
                              <input
                                type="url"
                                value={websiteUrlInput}
                                onChange={(e) => setWebsiteUrlInput(e.target.value)}
                                placeholder="https://www.example.com"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveWebsite()}
                                className="w-full px-3 py-1.5 bg-primary border border-primary rounded-lg paragraph-sm text-primary placeholder:text-quaternary focus:outline-none focus:border-brand-solid mb-2"
                              />
                              {websiteError && (
                                <p className="paragraph-sm text-error mb-2">{websiteError}</p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingWebsite(false)
                                    setWebsiteUrlInput(websiteUrl)
                                    setWebsiteError(null)
                                  }}
                                  className="px-3 py-1.5 border border-primary rounded-lg paragraph-sm text-secondary hover:bg-tertiary transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveWebsite}
                                  disabled={savingWebsite}
                                  className="px-3 py-1.5 bg-brand-solid text-primary-onbrand rounded-lg paragraph-sm hover:bg-brand-solid-hover transition-colors disabled:opacity-50"
                                >
                                  {savingWebsite ? 'Saving…' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="subheading-md text-primary">
                                  {websiteUrl || 'Not set'}
                                </p>
                                <p className="paragraph-sm text-quaternary">
                                  {isBasic
                                    ? 'Your website — Mia reads it to learn your voice and details'
                                    : 'Client website (for Search Console)'}
                                </p>
                              </div>
                              <button
                                onClick={() => setEditingWebsite(true)}
                                className="px-3 py-1.5 border border-primary rounded-lg paragraph-sm text-secondary hover:bg-tertiary transition-colors"
                              >
                                {websiteUrl ? 'Edit' : 'Set'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Experience: how much of Mia this workspace is shown (Sep 2026) */}
                      <div className="p-3 bg-secondary rounded-lg mb-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="subheading-md text-primary">Experience</p>
                            {!isBasic && (
                              <p className="paragraph-sm text-quaternary">
                                {EXPERIENCE_COPY[experience]}
                              </p>
                            )}
                          </div>
                          <div className="flex rounded-lg border border-primary overflow-hidden shrink-0">
                            {EXPERIENCES.map((exp) => (
                              <button
                                key={exp}
                                onClick={() => handleChangeExperience(exp)}
                                disabled={savingExperience || !canManage}
                                className={`px-3 py-1.5 paragraph-sm transition-colors disabled:opacity-50 ${
                                  experience === exp
                                    ? 'bg-brand-solid text-primary-onbrand'
                                    : 'bg-primary text-secondary hover:bg-tertiary'
                                }`}
                              >
                                {EXPERIENCE_LABEL[exp]}
                              </button>
                            ))}
                          </div>
                        </div>
                        {!isBasic && (
                          <p className="paragraph-sm text-quaternary mt-2">
                            Sets the defaults for the Features list below. Nothing is deleted when
                            you switch, and 11&amp;1 staff always see everything.
                          </p>
                        )}
                      </div>

                      {/* Campaign builder framework — Basic never builds campaigns */}
                      {!isBasic && (
                        <div className="p-3 bg-secondary rounded-lg mb-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="subheading-md text-primary">Campaign framework</p>
                              <p className="paragraph-sm text-quaternary">
                                {framework === 'race'
                                  ? 'RACE — Reach / Act / Convert / Engage'
                                  : 'Generic — Awareness / Consideration / Conversion / Retention'}
                              </p>
                            </div>
                            <div className="flex rounded-lg border border-primary overflow-hidden shrink-0">
                              {(['race', 'generic'] as const).map((fw) => (
                                <button
                                  key={fw}
                                  onClick={() => handleChangeFramework(fw)}
                                  disabled={savingFramework || !canManage}
                                  className={`px-3 py-1.5 paragraph-sm transition-colors disabled:opacity-50 ${
                                    framework === fw
                                      ? 'bg-brand-solid text-primary-onbrand'
                                      : 'bg-primary text-secondary hover:bg-tertiary'
                                  }`}
                                >
                                  {fw === 'race' ? 'RACE' : 'Generic'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <p className="paragraph-sm text-quaternary mt-2">
                            Controls the phases Mia uses when building campaigns for this workspace.
                            Existing campaigns are unaffected.
                          </p>
                        </div>
                      )}

                      {/* Logo */}
                      <div className="p-3 bg-secondary rounded-lg mb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-tertiary flex items-center justify-center shrink-0">
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt="Workspace logo"
                                  className="w-full h-full object-contain p-1.5"
                                />
                              ) : (
                                <Image01 size={20} className="text-quaternary" />
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
                        {logoError && <p className="paragraph-sm text-error mt-2">{logoError}</p>}
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
                      {/* Appearance for Team/Agency, who also have the sidebar control.
                          Basic never reaches this branch — its theme lives in the
                          workspace menu, and only there. */}
                      <div className="flex items-center justify-between gap-3 p-3 bg-secondary rounded-lg mb-3">
                        <div>
                          <p className="subheading-md text-primary">Appearance</p>
                          {!isBasic && (
                            <p className="paragraph-sm text-quaternary">
                              Light, dark or follow your device
                            </p>
                          )}
                        </div>
                        <div className="w-[13.5rem] shrink-0">
                          <SegmentedControl
                            options={themeOptions}
                            value={theme}
                            onChange={setTheme}
                            fullWidth
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Features - Owner and Admin: what this workspace can see (Sep 2026) */}
              {canManage && sessionId && !isBasic && (
                <CollapsibleSection
                  title="Features"
                  summary="What this workspace can see — switches follow the experience above"
                  className="mt-3"
                >
                  <FeatureFlagsPanel
                    sessionId={sessionId}
                    tenantId={workspace.tenant_id}
                    refreshKey={featuresVersion}
                  />
                </CollapsibleSection>
              )}

              {/* Danger Zone - Owner Only */}
              {isOwner && !isBasic && (
                <div className="mt-8 pt-6 border-t border-tertiary">
                  <h3 className="subheading-md text-error mb-2">
                    {isBasic ? 'Delete this business profile' : 'Danger Zone'}
                  </h3>
                  <p className="paragraph-sm text-tertiary mb-4">
                    {isBasic
                      ? `Removes ${workspace.name} from Mia — posts, brand kit and website notes go with it. This can't be undone.`
                      : 'Permanently delete this workspace and all its data.'}
                  </p>
                  <button
                    onClick={onOpenDeleteModal}
                    className="px-4 py-2 border border-error text-error hover:bg-error hover:text-white rounded-lg subheading-md transition-colors"
                  >
                    {isBasic ? 'Delete profile' : 'Delete Workspace'}
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
          </div>
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
        canInviteAdmins={isOwner}
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
