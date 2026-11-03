import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Globe01 } from '../../../components/icon/globe-01'
import { Image01 } from '../../../components/icon/image-01'
import { Trash01 } from '../../../components/icon/trash-01'
import { ChevronDown } from '../../../components/icon/chevron-down'
import { apiFetch } from '../../../utils/api'
import { PostingRhythmCard } from './posting-rhythm-card'
import { WhatsAppNumberCard } from './whatsapp-number-card'

interface BasicWorkspaceSettingsProps {
  sessionId: string
  tenantId: string
  workspaceName: string
  canManage: boolean
  isOwner: boolean
  onRename: () => void
  logoUrl: string | null
  uploadingLogo: boolean
  logoError: string | null
  onUploadLogo: (file: File) => void
  onRemoveLogo: () => void
  /** Platform keys already connected, for the Connections row. */
  connectedPlatforms: string[]
  onOpenConnections: () => void
  /** The workspace-level WhatsApp switch, rendered inside the number card. */
  whatsappMessagesSlot?: ReactNode
  /** Basic has no separate Mia tab — her style lives here, as the menu promises. */
  miaStyleSection?: ReactNode
  /** Light / dark / auto. Rendered here so it sits above Delete, not below it. */
  appearanceSlot?: ReactNode
  /** Invite, members, staff on WhatsApp and the Mia folder: under the business, not above it. */
  teamSlot?: ReactNode
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

/** One row that opens in place: title, a short line, a chevron. */
const Fold = ({ title, sub, children }: { title: string; sub: string; children: ReactNode }) => {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-tertiary/40 transition-colors"
      >
        <span className="min-w-0 flex-1">
          <span className="block subheading-md text-primary">{title}</span>
          <span className="block paragraph-xs text-quaternary">{sub}</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-quaternary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

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
  onRename,
  logoUrl,
  uploadingLogo,
  logoError,
  onUploadLogo,
  onRemoveLogo,
  connectedPlatforms,
  onOpenConnections,
  whatsappMessagesSlot,
  appearanceSlot,
  miaStyleSection,
  teamSlot,
  onDelete,
}: BasicWorkspaceSettingsProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  // The logo on their posts and the Page Mia reads, from the brand kit: one logo shows the same
  // here as on Brand (an older workspace may have the post logo only), and the Page is named.
  const [kit, setKit] = useState<{ logo?: string | null; page?: string | null }>({})
  useEffect(() => {
    let live = true
    apiFetch(`/api/tenants/${tenantId}/brand-kit`, { headers: { 'X-Session-ID': sessionId } })
      .then((r) => (r.ok ? r.json() : null))
      .then((k: { logo?: { cdn_url?: string } | null; facebook_page?: string | null } | null) => {
        if (live && k) setKit({ logo: k.logo?.cdn_url ?? null, page: k.facebook_page ?? null })
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [sessionId, tenantId, logoUrl])
  const logo = logoUrl ?? kit.logo ?? null
  const fb = connectedPlatforms.filter((p) => /facebook|instagram/i.test(p)).length
  return (
    <div className="space-y-3">
      {/* One name and one logo (Settings clean-up, 30 Oct 2026): the logo next to the name in
          Mia is also the one on posts. The website moved to Brand, where what it finds lands. */}
      <Group label="Your business">
        <Row
          icon={
            logo ? (
              <img src={logo} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <Image01 size={16} />
            )
          }
          title={workspaceName}
          sub={logoError ? logoError : 'One logo, used in Mia and on your posts'}
        >
          {canManage && (
            <button type="button" onClick={onRename} className={ghost}>
              Rename
            </button>
          )}
          {canManage && logo && (
            <button
              type="button"
              onClick={onRemoveLogo}
              disabled={uploadingLogo}
              className={`${ghost} text-error`}
            >
              Remove logo
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingLogo}
              className={ghost}
            >
              {uploadingLogo ? 'Uploading…' : logo ? 'Change logo' : 'Add logo'}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/webp,image/jpeg"
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
            fb
              ? `${kit.page ? `${kit.page}. ` : ''}Mia posts here and reads what your customers react to`
              : 'Not connected yet. Mia needs these to post and to learn what works'
          }
        >
          <button type="button" onClick={onOpenConnections} className={ghost}>
            {fb ? 'Manage' : 'Connect'}
          </button>
        </Row>
        <WhatsAppNumberCard sessionId={sessionId} messagesSlot={whatsappMessagesSlot} />
      </Group>

      {teamSlot && (
        <section>
          <p className="settings-eyebrow text-quaternary px-1 pb-2">Your team</p>
          {teamSlot}
        </section>
      )}

      <Group label="How Mia works with you">
        {miaStyleSection && (
          <Fold title="How she talks to you" sub="Tone, length and how often she suggests a step">
            {miaStyleSection}
          </Fold>
        )}
        {/* The rhythm card draws its own top rule for its old home; the group's divider does that here. */}
        <Fold title="Posting rhythm" sub="Posts a week, your best days and a reminder">
          <div className="[&>div]:border-t-0 [&>div]:pt-0 [&>div]:mt-0">
            <PostingRhythmCard sessionId={sessionId} tenantId={tenantId} canManage={canManage} />
          </div>
        </Fold>
        {appearanceSlot}
      </Group>

      {isOwner && (
        <Group>
          <Row
            icon={<Trash01 size={16} className="text-error" />}
            title="Delete this business profile"
            sub="Posts, brand kit and everything Mia learned go with it, and if it's your only profile your Mia account too. This can't be undone."
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
