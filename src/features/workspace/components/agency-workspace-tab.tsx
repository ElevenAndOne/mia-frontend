import { useMemo, useRef, useState } from 'react'
import { Plus } from '../../../components/icon/plus'
import { Image01 } from '../../../components/icon/image-01'
import { Spinner } from '../../../components/spinner'
import type { WorkspacePersonRow } from '../utils/workspace-settings'
import type { Workspace } from '../types'
import { WorkspaceMembersPanel } from './workspace-members-panel'
import { ClientCodeRow } from './client-code-row'
import { SharedDriveRow } from './shared-drive-row'
import { Card, Choice, Disclosure, FadeIn, Row, RowButton, Section } from './settings-ui'

/**
 * Settings → Workspace, agency (UI polish, 19 Nov 2026). The workspace's own details first, the
 * people in a closed list under one Invite button, leaving or deleting at the bottom. Theme is in
 * the sidebar, so it is not repeated here. Basic keeps its own tab.
 */
interface Props {
  workspace: Workspace
  canManage: boolean
  isOwner: boolean
  error: string | null
  loading: boolean
  people: WorkspacePersonRow[]
  onOpenCreateInviteModal: () => void
  onUpdateRole: (userId: string, role: string) => void
  onTransferOwnership: (userId: string) => void
  onRemoveMember: (userId: string) => void
  onCopyInvite: (link: string) => void
  onRevokeInvite: (inviteId: string) => void
  onOpenRenameModal: () => void
  onOpenDeleteModal: () => void
  onLeaveWorkspace?: () => void
  // website
  websiteUrl: string
  onSaveWebsite: (url: string) => Promise<boolean>
  savingWebsite: boolean
  websiteError: string | null
  // framework
  framework: 'race' | 'generic'
  onChangeFramework: (fw: 'race' | 'generic') => void
  savingFramework: boolean
  // logo
  logoUrl: string | null
  uploadingLogo: boolean
  logoError: string | null
  onUploadLogo: (file: File) => void
  onRemoveLogo: () => void
}

export const AgencyWorkspaceTab = (p: Props) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingSite, setEditingSite] = useState(false)
  const [siteDraft, setSiteDraft] = useState(p.websiteUrl)

  // People by name, A to Z; pending invites after the members.
  const people = useMemo(
    () =>
      [...p.people].sort(
        (a, b) =>
          (a.type === 'invite' ? 1 : 0) - (b.type === 'invite' ? 1 : 0) ||
          (a.name || a.email).localeCompare(b.name || b.email, undefined, { sensitivity: 'base' })
      ),
    [p.people]
  )
  const memberCount = people.filter((x) => x.type === 'member').length
  const inviteCount = people.length - memberCount

  const saveSite = async () => {
    const ok = await p.onSaveWebsite(siteDraft.trim())
    if (ok) setEditingSite(false)
  }

  return (
    <div className="flex flex-col gap-8">
      {p.error && (
        <div className="p-3 bg-error-primary border border-error-subtle rounded-lg">
          <p className="paragraph-sm text-error">{p.error}</p>
        </div>
      )}

      {/* The wide Invite button, first (Josh, 19 Nov 2026). */}
      {p.canManage && (
        <FadeIn>
          <button
            type="button"
            onClick={p.onOpenCreateInviteModal}
            className="w-full py-3 px-4 rounded-xl bg-brand-solid text-primary-onbrand subheading-md flex items-center justify-center gap-2 shadow-sm hover:bg-brand-solid-hover active:scale-[0.99] transition"
          >
            <Plus size={18} /> Invite members
          </button>
        </FadeIn>
      )}

      <FadeIn delay={0.03}>
        <Section title="Workspace">
          <Card>
            <Row title="Name" hint={p.workspace.name}>
              {p.canManage && <RowButton onClick={p.onOpenRenameModal}>Rename</RowButton>}
            </Row>
            <ClientCodeRow tenantId={p.workspace.tenant_id} canManage={p.canManage} />
            <SharedDriveRow tenantId={p.workspace.tenant_id} canManage={p.canManage} />
            <Row
              title="Logo"
              hint="SVG or PNG, up to 500 KB"
              aside={
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-tertiary flex items-center justify-center">
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt="" className="w-full h-full object-contain p-1.5" />
                  ) : (
                    <Image01 size={18} className="text-quaternary" />
                  )}
                </div>
              }
            >
              {p.canManage && (
                <>
                  {p.logoUrl && (
                    <RowButton tone="danger" onClick={p.onRemoveLogo} disabled={p.uploadingLogo}>
                      Remove
                    </RowButton>
                  )}
                  <RowButton onClick={() => fileRef.current?.click()} disabled={p.uploadingLogo}>
                    {p.uploadingLogo ? 'Uploading…' : p.logoUrl ? 'Replace' : 'Upload'}
                  </RowButton>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/svg+xml,image/png,image/webp,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) p.onUploadLogo(f)
                    }}
                  />
                </>
              )}
            </Row>
            {p.logoError && <p className="px-4 py-2 paragraph-xs text-error">{p.logoError}</p>}
            {p.canManage && (
              <Row
                title="Framework"
                hint={p.framework === 'race' ? 'Reach, Act, Convert, Engage' : 'Awareness, Consideration, Conversion, Retention'}
              >
                <Choice
                  label="Framework"
                  value={p.framework}
                  onChange={p.onChangeFramework}
                  disabled={p.savingFramework}
                  options={[
                    { value: 'race', label: 'RACE' },
                    { value: 'generic', label: 'Generic' },
                  ]}
                />
              </Row>
            )}
            {p.canManage &&
              (editingSite ? (
                <div className="px-4 py-3 flex flex-col gap-2">
                  <span className="subheading-bg text-primary">Website</span>
                  <input
                    type="url"
                    value={siteDraft}
                    onChange={(e) => setSiteDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void saveSite()}
                    placeholder="https://www.clientwebsite.co.za"
                    autoFocus
                    className="w-full px-3 py-2 bg-primary border border-primary rounded-lg paragraph-sm text-primary placeholder:text-quaternary focus:outline-none focus:border-brand-solid"
                  />
                  {p.websiteError && <p className="paragraph-xs text-error">{p.websiteError}</p>}
                  <div className="flex gap-2">
                    <RowButton
                      onClick={() => {
                        setEditingSite(false)
                        setSiteDraft(p.websiteUrl)
                      }}
                    >
                      Cancel
                    </RowButton>
                    <button
                      type="button"
                      onClick={() => void saveSite()}
                      disabled={p.savingWebsite}
                      className="px-3 py-1.5 rounded-lg paragraph-sm bg-brand-solid text-primary-onbrand hover:bg-brand-solid-hover disabled:opacity-50"
                    >
                      {p.savingWebsite ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                // Two states: no site yet ("For Search Console and the brand guide", Add); a site
                // (its address under the label, Change).
                <Row
                  title="Website"
                  hint={p.websiteUrl ? p.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'For Search Console and the brand guide'}
                >
                  <RowButton
                    onClick={() => {
                      setSiteDraft(p.websiteUrl)
                      setEditingSite(true)
                    }}
                  >
                    {p.websiteUrl ? 'Change' : 'Add'}
                  </RowButton>
                </Row>
              ))}
          </Card>
        </Section>
      </FadeIn>

      <FadeIn delay={0.06}>
        <Section title="People">
          <Card>
            <Disclosure
              id={`people:${p.workspace.tenant_id}`}
              title={`${memberCount} member${memberCount === 1 ? '' : 's'}`}
              meta={inviteCount ? `${inviteCount} invite${inviteCount === 1 ? '' : 's'} waiting` : undefined}
            >
              {p.loading && !people.length ? (
                <div className="flex justify-center py-6">
                  <Spinner size="md" variant="dark" />
                </div>
              ) : (
                <WorkspaceMembersPanel
                  people={people}
                  onUpdateRole={p.onUpdateRole}
                  onTransferOwnership={p.onTransferOwnership}
                  onRemoveMember={p.onRemoveMember}
                  onCopyInvite={p.onCopyInvite}
                  onRevokeInvite={p.onRevokeInvite}
                />
              )}
            </Disclosure>
          </Card>
        </Section>
      </FadeIn>

      <FadeIn delay={0.09}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-secondary pt-6">
          {p.isOwner ? (
            <>
              <p className="paragraph-sm text-tertiary">Delete this workspace and everything in it.</p>
              <RowButton tone="danger" onClick={p.onOpenDeleteModal}>
                Delete workspace
              </RowButton>
            </>
          ) : p.onLeaveWorkspace ? (
            <>
              <p className="paragraph-sm text-tertiary">Leave this workspace. You lose access to its data.</p>
              <RowButton tone="danger" onClick={p.onLeaveWorkspace}>
                Leave workspace
              </RowButton>
            </>
          ) : null}
        </div>
      </FadeIn>
    </div>
  )
}
