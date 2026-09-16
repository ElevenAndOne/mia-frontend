import { useRef, type ReactNode } from 'react'
import { Edit03 } from '../../../components/icon/edit-03'
import { Globe01 } from '../../../components/icon/globe-01'
import { Image01 } from '../../../components/icon/image-01'
import { Stars01 } from '../../../components/icon/stars-01'
import { Trash01 } from '../../../components/icon/trash-01'
import { CollapsibleSection } from '../../../components/collapsible-section'
import { EXPERIENCES, EXPERIENCE_LABEL, type Experience } from '../feature-keys'
import { WebsiteReadCard } from './website-read-card'
import { WhatsAppNumberCard } from './whatsapp-number-card'

interface BasicWorkspaceSettingsProps {
  sessionId: string
  tenantId: string
  workspaceName: string
  canManage: boolean
  isOwner: boolean
  websiteUrl: string
  onWebsiteSaved: (url: string) => void
  onOpenBrand: () => void
  onRename: () => void
  logoUrl: string | null
  uploadingLogo: boolean
  logoError: string | null
  onUploadLogo: (file: File) => void
  onRemoveLogo: () => void
  /** Platform keys already connected, for the Connections row. */
  connectedPlatforms: string[]
  onOpenConnections: () => void
  experience: Experience
  savingExperience: boolean
  onChangeExperience: (exp: Experience) => void
  featuresPanel: ReactNode
  /** The workspace-level WhatsApp switch, rendered inside the number card. */
  whatsappMessagesSlot?: ReactNode
  /** Basic has no separate Mia tab — her style lives here, as the menu promises. */
  miaStyleSection?: ReactNode
  onDelete: () => void
}

const Row = ({
  icon,
  title,
  sub,
  children,
}: {
  icon: ReactNode
  title: string
  sub?: ReactNode
  children?: ReactNode
}) => (
  <div className="flex items-center gap-3 px-3 py-3">
    <div className="w-8 h-8 rounded-lg bg-tertiary flex items-center justify-center shrink-0 text-secondary">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="subheading-md text-primary">{title}</p>
      {sub && <p className="paragraph-xs text-quaternary truncate">{sub}</p>}
    </div>
    {children && <div className="shrink-0 flex items-center gap-2">{children}</div>}
  </div>
)

const Group = ({ label, children }: { label?: string; children: ReactNode }) => (
  <section className="settings-card rounded-lg border border-tertiary bg-secondary overflow-hidden">
    {label && <p className="settings-eyebrow text-quaternary px-3 pt-3 pb-1">{label}</p>}
    <div className="divide-y divide-tertiary">{children}</div>
  </section>
)

const ghost =
  'px-2.5 py-1.5 border border-primary rounded-lg paragraph-xs text-secondary hover:bg-tertiary transition-colors disabled:opacity-50'

/**
 * The Basic "Workspace" tab as three grouped lists: your business (website, name, logo),
 * how Mia shows up (experience, appearance, features), and delete. One row per setting —
 * title, current value, one action — instead of a stack of cards with descriptions.
 */
export function BasicWorkspaceSettings({
  sessionId,
  tenantId,
  workspaceName,
  canManage,
  isOwner,
  websiteUrl,
  onWebsiteSaved,
  onOpenBrand,
  onRename,
  logoUrl,
  uploadingLogo,
  logoError,
  onUploadLogo,
  onRemoveLogo,
  experience,
  connectedPlatforms,
  onOpenConnections,
  savingExperience,
  onChangeExperience,
  featuresPanel,
  whatsappMessagesSlot,
  miaStyleSection,
  onDelete,
}: BasicWorkspaceSettingsProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-3">
      <Group label="Your business">
        <WebsiteReadCard
          sessionId={sessionId}
          tenantId={tenantId}
          websiteUrl={websiteUrl}
          canManage={canManage}
          onWebsiteSaved={onWebsiteSaved}
          onOpenBrandKit={onOpenBrand}
        />
        <Row icon={<Edit03 size={16} />} title="Name" sub={workspaceName}>
          {canManage && (
            <button type="button" onClick={onRename} className={ghost}>
              Rename
            </button>
          )}
        </Row>
        <Row
          icon={
            logoUrl ? (
              <img src={logoUrl} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <Image01 size={16} />
            )
          }
          title="Logo"
          sub={
            logoError
              ? logoError
              : 'The picture next to your business name in Mia. The logo Mia puts on posts is under Brand.'
          }
        >
          {canManage && logoUrl && (
            <button
              type="button"
              onClick={onRemoveLogo}
              disabled={uploadingLogo}
              className={`${ghost} text-error`}
            >
              Remove
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingLogo}
              className={ghost}
            >
              {uploadingLogo ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload'}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/svg+xml,image/png,image/webp,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUploadLogo(f)
              e.target.value = ''
            }}
          />
        </Row>
      </Group>

      {/* Connections left the sidebar: on Basic they are set up once and then only
          revisited when something breaks, which is a settings job, not a nav slot. */}
      <Group label="Connections">
        <Row
          icon={<Globe01 size={16} />}
          title="Facebook and Instagram"
          sub={
            connectedPlatforms.length
              ? `${connectedPlatforms.length} connected`
              : 'Nothing connected yet — Mia needs these to read and post'
          }
        >
          <button type="button" onClick={onOpenConnections} className={ghost}>
            {connectedPlatforms.length ? 'Manage' : 'Connect'}
          </button>
        </Row>
        <WhatsAppNumberCard sessionId={sessionId} messagesSlot={whatsappMessagesSlot} />
      </Group>

      {miaStyleSection}

      {/* Which experience this workspace gets, and the switches under it. Down here
          because it is the one group a client never needs and 11&1 occasionally does. */}
      <Group label="Advanced">
        <Row icon={<Stars01 size={16} />} title="Experience">
          <div className="flex rounded-lg border border-primary overflow-hidden">
            {EXPERIENCES.map((exp) => (
              <button
                key={exp}
                type="button"
                onClick={() => onChangeExperience(exp)}
                disabled={savingExperience || !canManage}
                className={`px-3 py-1.5 paragraph-xs transition-colors disabled:opacity-50 ${
                  experience === exp
                    ? 'bg-brand-solid text-primary-onbrand'
                    : 'bg-primary text-secondary hover:bg-tertiary'
                }`}
              >
                {EXPERIENCE_LABEL[exp]}
              </button>
            ))}
          </div>
        </Row>
        {canManage && (
          <CollapsibleSection
            title="Features"
            summary="What this business can see — switches follow the experience above"
            className="border-0 rounded-none bg-transparent"
          >
            {featuresPanel}
          </CollapsibleSection>
        )}
      </Group>

      {isOwner && (
        <Group>
          <Row
            icon={<Trash01 size={16} className="text-error" />}
            title="Delete this business profile"
            sub="Posts, brand kit and website notes go with it. This can't be undone."
          >
            <button
              type="button"
              onClick={onDelete}
              className="px-2.5 py-1.5 border border-error rounded-lg paragraph-xs text-error hover:bg-error hover:text-white transition-colors"
            >
              Delete
            </button>
          </Row>
        </Group>
      )}
    </div>
  )
}
